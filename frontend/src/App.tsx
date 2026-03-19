import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  createSession,
  getLeaderboard,
  getThemes,
  submitAnswer,
  submitQuestionSuggestion
} from "./api";
import { LeaderboardPanel } from "./components/LeaderboardPanel";
import { QuestionSuggestionForm } from "./components/QuestionSuggestionForm";
import { ThemePicker } from "./components/ThemePicker";
import { type Coordinates, WorldMap } from "./components/WorldMap";
import { fetchQuestionImageUrl } from "./questionImages";
import type {
  AnswerFeedback,
  CollectionId,
  LeaderboardEntry,
  PublicQuestion,
  QuestionSuggestionPayload,
  SessionSummary,
  ThemeOption
} from "./types";

const difficultyLabels: Record<PublicQuestion["difficulty"], string> = {
  easy: "Лёгкий",
  medium: "Средний",
  hard: "Сложный"
};

const questionTypeLabels: Record<PublicQuestion["type"], string> = {
  landmark: "Достопримечательность",
  city: "Город",
  country: "Страна"
};

const scoreFormatter = new Intl.NumberFormat("ru-RU");

interface ExpeditionPassport {
  title: string;
  summary: string;
  averageDistanceKm: number;
  bestDistanceKm: number;
  nearPerfectHits: number;
  hintsUsed: number;
}

type HomeSidebarTab = "leaderboard" | "overview" | "suggest";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Произошла неожиданная ошибка.";
}

function buildExpeditionPassport(
  answerHistory: AnswerFeedback[],
  hintsUsed: number
): ExpeditionPassport | null {
  if (answerHistory.length === 0) {
    return null;
  }

  const totalDistance = answerHistory.reduce(
    (sum, item) => sum + item.distanceKm,
    0
  );
  const averageDistanceKm = Number((totalDistance / answerHistory.length).toFixed(1));
  const bestDistanceKm = Math.min(...answerHistory.map((item) => item.distanceKm));
  const nearPerfectHits = answerHistory.filter((item) => item.distanceKm <= 80).length;

  if (averageDistanceKm <= 150 && hintsUsed <= 1) {
    return {
      title: "Картограф-снайпер",
      summary:
        "Ты почти не пользовался подсказками и стабильно попадал очень близко к цели.",
      averageDistanceKm,
      bestDistanceKm,
      nearPerfectHits,
      hintsUsed
    };
  }

  if (averageDistanceKm <= 500) {
    return {
      title: "Навигатор мировых маршрутов",
      summary:
        "Ты уверенно держишь направление и быстро адаптируешься к разным регионам карты.",
      averageDistanceKm,
      bestDistanceKm,
      nearPerfectHits,
      hintsUsed
    };
  }

  if (averageDistanceKm <= 1500) {
    return {
      title: "Следопыт континентов",
      summary:
        "Ты уже хорошо чувствуешь карту мира и умеешь вытаскивать сложные раунды за счёт логики.",
      averageDistanceKm,
      bestDistanceKm,
      nearPerfectHits,
      hintsUsed
    };
  }

  return {
    title: "Смелый первопроходец",
    summary:
      "Ты не боишься сложных маршрутов и постепенно собираешь собственную географическую интуицию.",
    averageDistanceKm,
    bestDistanceKm,
    nearPerfectHits,
    hintsUsed
  };
}

function getRecommendedTheme(
  session: SessionSummary | null,
  themes: ThemeOption[]
): ThemeOption | null {
  if (!session || themes.length === 0) {
    return null;
  }

  const averageScore =
    session.totalQuestions > 0 ? session.totalScore / session.totalQuestions : 0;

  const byId = (themeId: CollectionId): ThemeOption | null =>
    themes.find((theme) => theme.id === themeId) ?? null;

  // The recommendation is intentionally lightweight:
  // we only look at the finished theme and the average score
  // to keep the feature explainable for a course project.
  if (session.themeId === "all") {
    return averageScore >= 700 ? byId("world-wonders") : byId("iconic-landmarks");
  }

  if (session.themeId === "capitals") {
    return averageScore >= 650 ? byId("world-wonders") : byId("iconic-landmarks");
  }

  if (session.themeId === "iconic-landmarks") {
    return averageScore >= 700 ? byId("world-wonders") : byId("capitals");
  }

  return averageScore >= 650 ? byId("capitals") : byId("iconic-landmarks");
}

interface ThemeModalProps {
  isOpen: boolean;
  themes: ThemeOption[];
  selectedThemeId: CollectionId;
  onSelect: (themeId: CollectionId) => void;
  onClose: () => void;
}

function ThemeModal({
  isOpen,
  themes,
  selectedThemeId,
  onSelect,
  onClose
}: ThemeModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="panel theme-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-modal-title"
      >
        <div className="theme-modal__topline">
          <div>
            <span className="eyebrow">Выбор режима</span>
            <h2 id="theme-modal-title">Подбери следующую экспедицию</h2>
          </div>
          <button type="button" className="ghost-button modal-close" onClick={onClose}>
            Закрыть
          </button>
        </div>

        <p className="theme-modal__copy">
          Выбор режима вынесен в отдельное окно, чтобы стартовый экран оставался коротким
          и не заставлял скроллить страницу вниз.
        </p>

        <ThemePicker
          themes={themes}
          selectedThemeId={selectedThemeId}
          onSelect={(themeId) => {
            onSelect(themeId);
            onClose();
          }}
        />
      </section>
    </div>
  );
}

interface ProjectInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ProjectInfoModal({
  isOpen,
  onClose
}: ProjectInfoModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="panel info-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-info-title"
      >
        <div className="theme-modal__topline">
          <div>
            <span className="eyebrow">Что внутри проекта</span>
            <h2 id="project-info-title">Geo-quiz как готовый учебный fullstack-проект</h2>
          </div>
          <button type="button" className="ghost-button modal-close" onClick={onClose}>
            Закрыть
          </button>
        </div>

        <p className="theme-modal__copy">
          Здесь собраны обязательные пункты ТЗ и продуктовые улучшения, которые делают
          викторину живой и удобной в прохождении.
        </p>

        <div className="info-modal__grid">
          <article className="info-modal__card">
            <strong>Игровой цикл</strong>
            <p>
              10 вопросов подряд, один клик по карте, мгновенный результат и переход без
              перезагрузки страницы.
            </p>
          </article>
          <article className="info-modal__card">
            <strong>Контент и режимы</strong>
            <p>
              Тематические подборки, фотографии объектов, ручные подсказки и лидерборд
              лучших сессий.
            </p>
          </article>
          <article className="info-modal__card">
            <strong>Финальный отчёт</strong>
            <p>
              После игры показываются итоговый счёт, рейтинг и персональный паспорт
              экспедиции.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}

interface ImageLightboxProps {
  isOpen: boolean;
  imageUrl: string;
  alt: string;
  onClose: () => void;
}

function ImageLightbox({
  isOpen,
  imageUrl,
  alt,
  onClose
}: ImageLightboxProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-backdrop image-lightbox-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="panel image-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Просмотр изображения"
      >
        <div className="image-lightbox__topline">
          <span className="eyebrow">Просмотр изображения</span>
          <button type="button" className="ghost-button modal-close" onClick={onClose}>
            Закрыть
          </button>
        </div>

        <div className="image-lightbox__frame">
          <img className="image-lightbox__image" src={imageUrl} alt={alt} />
        </div>
      </section>
    </div>
  );
}

interface ResultModalProps {
  isOpen: boolean;
  session: SessionSummary;
  feedback: AnswerFeedback;
  leaderboard: LeaderboardEntry[];
  currentRank: number | null;
  totalFinishedSessions: number | null;
  expeditionPassport: ExpeditionPassport | null;
  recommendedTheme: ThemeOption | null;
  onClose: () => void;
  onReset: () => void;
  onStartRecommended: (themeId: CollectionId) => void;
}

function ResultModal({
  isOpen,
  session,
  feedback,
  leaderboard,
  currentRank,
  totalFinishedSessions,
  expeditionPassport,
  recommendedTheme,
  onClose,
  onReset,
  onStartRecommended
}: ResultModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="panel result-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-modal-title"
      >
        <div className="result-modal__topline">
          <span className="eyebrow">Отчёт по экспедиции</span>
          <button type="button" className="ghost-button modal-close" onClick={onClose}>
            Вернуться к карте
          </button>
        </div>

        <div className="result-modal__hero">
          <div>
            <h2 id="result-modal-title">Сессия завершена: {feedback.accuracyLabel}</h2>
            <p>
              Последний факт раунда: {feedback.funFact}
            </p>
          </div>

          <div className="result-modal__summary">
            <article className="result-stat">
              <span className="stat-label">Итоговый счёт</span>
              <strong className="stat-value">
                {scoreFormatter.format(session.totalScore)}
              </strong>
            </article>
            <article className="result-stat">
              <span className="stat-label">Место в рейтинге</span>
              <strong className="stat-value">
                {currentRank !== null ? `#${currentRank}` : "Обновляем..."}
              </strong>
              <span className="result-stat__meta">
                {currentRank !== null && totalFinishedSessions !== null
                  ? `из ${scoreFormatter.format(totalFinishedSessions)} завершённых сессий`
                  : "Позиция появится после обновления лидерборда"}
              </span>
            </article>
            <article className="result-stat">
              <span className="stat-label">Последний ответ</span>
              <strong className="stat-value">
                {feedback.distanceKm.toLocaleString("ru-RU")} км
              </strong>
              <span className="result-stat__meta">
                +{scoreFormatter.format(feedback.scoreAwarded)} очков
              </span>
            </article>
          </div>
        </div>

        <div className="result-modal__body">
          <div className="result-modal__column">
            {expeditionPassport ? (
              <div className="passport-card">
                <span className="eyebrow">Киллер-фича</span>
                <h4>Паспорт экспедиции: {expeditionPassport.title}</h4>
                <p>{expeditionPassport.summary}</p>

                <div className="passport-grid">
                  <article className="passport-stat">
                    <span>Средняя ошибка</span>
                    <strong>
                      {expeditionPassport.averageDistanceKm.toLocaleString("ru-RU")} км
                    </strong>
                  </article>
                  <article className="passport-stat">
                    <span>Лучший клик</span>
                    <strong>
                      {expeditionPassport.bestDistanceKm.toLocaleString("ru-RU")} км
                    </strong>
                  </article>
                  <article className="passport-stat">
                    <span>Почти идеальных</span>
                    <strong>{expeditionPassport.nearPerfectHits}</strong>
                  </article>
                  <article className="passport-stat">
                    <span>Подсказок открыто</span>
                    <strong>{expeditionPassport.hintsUsed}</strong>
                  </article>
                </div>
              </div>
            ) : null}

            {recommendedTheme ? (
              <div className="recommendation-card">
                <span className="eyebrow">Следующий шаг</span>
                <h4>Следующая экспедиция: {recommendedTheme.label}</h4>
                <p>{recommendedTheme.description}</p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => onStartRecommended(recommendedTheme.id)}
                >
                  Запустить рекомендованный режим
                </button>
              </div>
            ) : null}
          </div>

          <div className="result-modal__column">
            <LeaderboardPanel items={leaderboard} currentSessionId={session.id} />
          </div>
        </div>

        <div className="result-modal__actions">
          <button type="button" className="ghost-button" onClick={onReset}>
            Новая игра
          </button>
        </div>
      </section>
    </div>
  );
}

export default function App(): JSX.Element {
  const [playerName, setPlayerName] = useState("");
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<PublicQuestion | null>(null);
  const [nextQuestion, setNextQuestion] = useState<PublicQuestion | null>(null);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [answerHistory, setAnswerHistory] = useState<AnswerFeedback[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentRank, setCurrentRank] = useState<number | null>(null);
  const [totalFinishedSessions, setTotalFinishedSessions] = useState<number | null>(null);
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<CollectionId>("all");
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isHintVisible, setIsHintVisible] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [questionImageUrl, setQuestionImageUrl] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
  const [suggestionSuccessMessage, setSuggestionSuccessMessage] = useState<string | null>(
    null
  );
  const [suggestionErrorMessage, setSuggestionErrorMessage] = useState<string | null>(
    null
  );
  const [homeSidebarTab, setHomeSidebarTab] = useState<HomeSidebarTab>("leaderboard");
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isFirstRoundTipVisible, setIsFirstRoundTipVisible] = useState(true);
  const [isProjectInfoOpen, setIsProjectInfoOpen] = useState(false);
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);

  const isFinished = session?.status === "finished";
  const questionNumber = session
    ? Math.min(session.currentIndex + (feedback ? 0 : 1), session.totalQuestions)
    : 0;
  const progressPercent = session
    ? Math.round((session.currentIndex / session.totalQuestions) * 100)
    : 0;
  const shouldShowFirstRoundTip = Boolean(
    session &&
      currentQuestion &&
      !feedback &&
      questionNumber === 1 &&
      isFirstRoundTipVisible
  );
  const selectedTheme = themes.find((theme) => theme.id === selectedThemeId) ?? null;
  const recommendedTheme = useMemo(
    () => getRecommendedTheme(session, themes),
    [session, themes]
  );
  const expeditionPassport = useMemo(
    () => buildExpeditionPassport(answerHistory, hintsUsed),
    [answerHistory, hintsUsed]
  );

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    if (!session || !currentQuestion || feedback || questionStartedAt === null) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - questionStartedAt) / 1000));
    }, 250);

    return () => window.clearInterval(timer);
  }, [session, currentQuestion, feedback, questionStartedAt]);

  useEffect(() => {
    if (!currentQuestion) {
      setQuestionImageUrl(null);
      setIsImageLoading(false);
      setIsImageLightboxOpen(false);
      return;
    }

    if (currentQuestion.imageUrl) {
      setQuestionImageUrl(currentQuestion.imageUrl);
      setIsImageLoading(false);
      return;
    }

    const controller = new AbortController();
    setQuestionImageUrl(null);
    setIsImageLoading(true);

    // If the backend does not provide an image yet,
    // we try a lightweight Wikipedia fallback on the client.
    void fetchQuestionImageUrl(currentQuestion.id, controller.signal)
      .then((imageUrl) => {
        setQuestionImageUrl(imageUrl);
      })
      .catch((caughtError: unknown) => {
        if (caughtError instanceof Error && caughtError.name === "AbortError") {
          return;
        }

        setQuestionImageUrl(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsImageLoading(false);
        }
      });

    return () => controller.abort();
  }, [currentQuestion]);

  useEffect(() => {
    if (!isImageLightboxOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsImageLightboxOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isImageLightboxOpen]);

  async function loadInitialData(): Promise<void> {
    try {
      const [leaderboardResponse, themesResponse] = await Promise.all([
        getLeaderboard(5),
        getThemes()
      ]);

      setLeaderboard(leaderboardResponse.items);
      setCurrentRank(leaderboardResponse.currentRank);
      setTotalFinishedSessions(leaderboardResponse.totalFinishedSessions);
      setThemes(themesResponse.items);
    } catch {
      setLeaderboard([]);
      setCurrentRank(null);
      setTotalFinishedSessions(null);
      setThemes([]);
    }
  }

  async function refreshLeaderboard(currentSessionId?: string): Promise<void> {
    try {
      const response = await getLeaderboard(5, currentSessionId);
      setLeaderboard(response.items);
      setCurrentRank(response.currentRank);
      setTotalFinishedSessions(response.totalFinishedSessions);
    } catch {
      setLeaderboard([]);
      setCurrentRank(null);
      setTotalFinishedSessions(null);
    }
  }

  async function refreshThemes(): Promise<void> {
    try {
      const response = await getThemes();
      setThemes(response.items);
    } catch {
      setThemes([]);
    }
  }

  async function startGame(themeId: CollectionId): Promise<void> {
    setIsStarting(true);
    setError(null);

    try {
      const safeName = playerName.trim() || "Explorer";
      const response = await createSession(safeName, themeId);

      setPlayerName(safeName);
      setSelectedThemeId(themeId);
      setSession(response.session);
      setCurrentQuestion(response.question);
      setNextQuestion(null);
      setFeedback(null);
      setAnswerHistory([]);
      setQuestionStartedAt(Date.now());
      setElapsedSeconds(0);
      setIsHintVisible(false);
      setHintsUsed(0);
      setCurrentRank(null);
      setTotalFinishedSessions(null);
      setIsResultModalOpen(false);
      setIsFirstRoundTipVisible(true);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsStarting(false);
    }
  }

  async function handleStart(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await startGame(selectedThemeId);
  }

  async function handleGuess(coords: Coordinates): Promise<void> {
    if (!session || !currentQuestion || feedback || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await submitAnswer({
        sessionId: session.id,
        questionId: currentQuestion.id,
        guessLatitude: coords.latitude,
        guessLongitude: coords.longitude,
        responseTimeMs:
          questionStartedAt === null ? null : Date.now() - questionStartedAt
      });

      setSession(response.session);
      setFeedback(response.feedback);
      setNextQuestion(response.nextQuestion);
      setAnswerHistory((currentItems) => [...currentItems, response.feedback]);

      if (response.finished) {
        await refreshLeaderboard(response.session.id);
        setIsResultModalOpen(true);
      }
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNextQuestion(): void {
    if (!nextQuestion) {
      return;
    }

    setCurrentQuestion(nextQuestion);
    setNextQuestion(null);
    setFeedback(null);
    setIsHintVisible(false);
    setQuestionStartedAt(Date.now());
    setElapsedSeconds(0);
    setError(null);
  }

  function handleResetGame(): void {
    setSession(null);
    setCurrentQuestion(null);
    setNextQuestion(null);
    setFeedback(null);
    setAnswerHistory([]);
    setQuestionStartedAt(null);
    setElapsedSeconds(0);
    setIsHintVisible(false);
    setHintsUsed(0);
    setQuestionImageUrl(null);
    setIsImageLoading(false);
    setCurrentRank(null);
    setTotalFinishedSessions(null);
    setIsResultModalOpen(false);
    setIsFirstRoundTipVisible(true);
    setError(null);
  }

  async function handleSuggestionSubmit(
    payload: QuestionSuggestionPayload
  ): Promise<boolean> {
    setIsSubmittingSuggestion(true);
    setSuggestionSuccessMessage(null);
    setSuggestionErrorMessage(null);

    try {
      const response = await submitQuestionSuggestion(payload);
      setSuggestionSuccessMessage(response.message);
      setPlayerName(payload.playerName);
      await refreshThemes();
      return true;
    } catch (caughtError) {
      setSuggestionErrorMessage(getErrorMessage(caughtError));
      return false;
    } finally {
      setIsSubmittingSuggestion(false);
    }
  }

  function handleRevealHint(): void {
    if (!currentQuestion?.hint || feedback || isHintVisible) {
      return;
    }

    setIsHintVisible(true);
    setHintsUsed((currentValue) => currentValue + 1);
  }

  return (
    <div className="app-shell">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="orb orb-c" />

      <main className={`page${session ? " page--game" : ""}`}>
        <header className="site-header">
          <div className="brand">
            <span className="brand__badge">Geo-quiz</span>
            <div>
              <h1 className="brand__title">Географическая викторина на карте мира</h1>
              {!session ? (
                <button
                  type="button"
                  className="ghost-button brand__info-button"
                  onClick={() => setIsProjectInfoOpen(true)}
                >
                  Что внутри Geo-quiz
                </button>
              ) : null}
            </div>
          </div>

          {session ? (
            <button type="button" className="ghost-button" onClick={handleResetGame}>
              Новая игра
            </button>
          ) : null}
        </header>

        {!session || !currentQuestion ? (
          <section className="home-grid">
            <section className="panel hero-panel">
              <span className="eyebrow">Быстрый режим</span>
              <h2 className="hero-heading">Запусти экспедицию и кликай по карте мира</h2>
              <p className="hero-copy">
                Здесь уже закрыты не только обязательные пункты ТЗ, но и несколько
                продуктовых улучшений: подборки по темам, живой лидерборд, карточка с фото
                объекта, подсказки по запросу и паспорт экспедиции после завершения сессии.
              </p>

              <form className="hero-form" onSubmit={handleStart}>
                <label className="field-label" htmlFor="player-name">
                  Имя игрока
                </label>
                <input
                  id="player-name"
                  className="text-input"
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  maxLength={40}
                  placeholder="Например, Alex"
                />

                <div className="hero-action-row">
                  <button type="submit" className="primary-button" disabled={isStarting}>
                    {isStarting
                      ? "Запуск..."
                      : `Начать: ${selectedTheme?.label ?? "Глобальный микс"}`}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setIsThemeModalOpen(true)}
                  >
                    Выбрать режим
                  </button>
                </div>
              </form>

              {error ? <div className="error-banner">{error}</div> : null}

              {selectedTheme ? (
                <section className="selected-theme-card">
                  <div className="selected-theme-card__header">
                    <span className="eyebrow">Выбранный режим</span>
                    <span className="selected-theme-card__count">
                      {selectedTheme.questionCount} вопросов
                    </span>
                  </div>
                  <h3>{selectedTheme.label}</h3>
                  <p>{selectedTheme.description}</p>
                  <button
                    type="button"
                    className="ghost-button selected-theme-card__button"
                    onClick={() => setIsThemeModalOpen(true)}
                  >
                    Сменить подборку
                  </button>
                </section>
              ) : null}

              <div className="hero-highlights">
                <span className="highlight-pill">4 игровых режима</span>
                <span className="highlight-pill">Лидерборд</span>
                <span className="highlight-pill">Паспорт экспедиции</span>
              </div>
            </section>

            <section className="home-sidebar">
              <section className="home-tab-switcher">
                <button
                  type="button"
                  className={`home-tab${homeSidebarTab === "leaderboard" ? " is-active" : ""}`}
                  onClick={() => setHomeSidebarTab("leaderboard")}
                >
                  Лидерборд
                </button>
                <button
                  type="button"
                  className={`home-tab${homeSidebarTab === "overview" ? " is-active" : ""}`}
                  onClick={() => setHomeSidebarTab("overview")}
                >
                  Как играть
                </button>
                <button
                  type="button"
                  className={`home-tab${homeSidebarTab === "suggest" ? " is-active" : ""}`}
                  onClick={() => setHomeSidebarTab("suggest")}
                >
                  Предложить вопрос
                </button>
              </section>

              {homeSidebarTab === "leaderboard" ? (
                <LeaderboardPanel items={leaderboard} />
              ) : homeSidebarTab === "overview" ? (
                <section className="panel preview-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">Как проходит раунд</span>
                      <h3 className="panel-title">Вопрос, клик, результат</h3>
                    </div>
                  </div>

                  <div className="preview-scoreboard">
                    <div className="preview-scoreboard__item">
                      <span>Раунд</span>
                      <strong>4 / 10</strong>
                    </div>
                    <div className="preview-scoreboard__item">
                      <span>Очки</span>
                      <strong>3 420</strong>
                    </div>
                    <div className="preview-scoreboard__item">
                      <span>Таймер</span>
                      <strong>12 сек</strong>
                    </div>
                  </div>

                  <div className="preview-route">
                    <span className="preview-dot preview-dot--guess" />
                    <span className="preview-route__line" />
                    <span className="preview-dot preview-dot--answer" />
                  </div>

                  <p className="preview-copy">
                    Сначала ты ставишь точку на карте. Сразу после клика приложение
                    показывает расстояние, очки и правильное место, а затем переводит в
                    следующий вопрос без перезагрузки страницы и лишнего скролла.
                  </p>
                </section>
              ) : (
                <QuestionSuggestionForm
                  defaultPlayerName={playerName}
                  isSubmitting={isSubmittingSuggestion}
                  successMessage={suggestionSuccessMessage}
                  errorMessage={suggestionErrorMessage}
                  onSubmit={handleSuggestionSubmit}
                />
              )}
            </section>
          </section>
        ) : (
          <section className="dashboard">
            <aside className="sidebar">
              <section
                className={`panel question-panel${feedback ? " question-panel--answered" : ""}`}
              >
                <span className="eyebrow">
                  Вопрос {questionNumber} из {session.totalQuestions}
                </span>
                <h2 className="question-title">{currentQuestion.prompt}</h2>
                <p className="question-copy">
                  {feedback
                    ? "Ответ уже принят. Посмотри на обратную связь и реши, готов ли ты к следующему раунду."
                    : isHintVisible
                      ? currentQuestion.hint ?? "Для этого вопроса подсказка не требуется."
                      : currentQuestion.hint
                        ? "Подсказка скрыта. Открой её вручную, если захочешь чуть упростить раунд."
                        : "Для этого вопроса подсказка не требуется."}
                </p>

                {!feedback && currentQuestion.hint ? (
                  <button
                    type="button"
                    className={`ghost-button hint-toggle${isHintVisible ? " is-open" : ""}`}
                    onClick={handleRevealHint}
                    disabled={isHintVisible}
                  >
                    {isHintVisible ? "Подсказка открыта" : "Показать подсказку"}
                  </button>
                ) : null}

                {questionImageUrl ? (
                  <div className="question-media">
                    <button
                      type="button"
                      className="question-image-button"
                      onClick={() => setIsImageLightboxOpen(true)}
                    >
                      <img
                        className="question-image"
                        src={questionImageUrl}
                        alt={currentQuestion.prompt}
                      />
                      <span className="question-image-hint">Нажми, чтобы открыть крупнее</span>
                    </button>
                  </div>
                ) : isImageLoading ? (
                  <div className="question-image-placeholder">
                    Загружаем фото объекта...
                  </div>
                ) : null}

                <div className="chip-row">
                  <span className="chip">{difficultyLabels[currentQuestion.difficulty]}</span>
                  <span className="chip">{currentQuestion.region}</span>
                  <span className="chip">{questionTypeLabels[currentQuestion.type]}</span>
                </div>

                <div className="progress-bar" aria-hidden="true">
                  <div
                    className="progress-bar__value"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </section>

              <section className="stats-grid">
                <article className="panel stat-card stat-card--score">
                  <span className="stat-label">Суммарный счёт</span>
                  <strong className="stat-value">
                    {scoreFormatter.format(session.totalScore)}
                  </strong>
                </article>
                <article className="panel stat-card stat-card--timer">
                  <span className="stat-label">Таймер вопроса</span>
                  <strong className="stat-value">{elapsedSeconds}s</strong>
                </article>
              </section>

              {error ? <div className="error-banner">{error}</div> : null}

              {isFinished ? (
                <section className="panel feedback-panel">
                  <div className="finished-inline-card">
                    <span className="eyebrow">Сессия завершена</span>
                    <h4>Итоговый отчёт уже готов</h4>
                    <p>
                      Открой модальное окно с рейтингом, паспортом экспедиции и
                      рекомендацией следующего режима.
                    </p>
                    <div className="feedback-actions">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => setIsResultModalOpen(true)}
                      >
                        Открыть отчёт
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={handleResetGame}
                      >
                        Новая игра
                      </button>
                    </div>
                  </div>
                </section>
              ) : null}
            </aside>

            <section className="map-section">
              <section className="panel map-panel">
                <div className="map-panel__header">
                  <div>
                    <span className="eyebrow">Игровая карта</span>
                    <h3 className="map-panel__title">Мир как поле для викторины</h3>
                  </div>
                  <p className="map-panel__subtitle">
                    {feedback
                      ? "Жёлтая точка — твой ответ, зелёная — правильная позиция."
                      : "Кликни в предполагаемую точку, чтобы отправить ответ."}
                  </p>
                </div>

                <div className="map-stage">
                  <WorldMap
                    mapKey={`${currentQuestion.id}-${feedback ? "locked" : "live"}`}
                    feedback={feedback}
                    isLocked={Boolean(feedback) || isSubmitting}
                    onGuess={handleGuess}
                  />

                  {shouldShowFirstRoundTip ? (
                    <div className="map-tip-card">
                      <div className="map-tip-card__header">
                        <span className="eyebrow">Первый раунд</span>
                        <button
                          type="button"
                          className="map-tip-card__close"
                          onClick={() => setIsFirstRoundTipVisible(false)}
                          aria-label="Закрыть инструкцию"
                        >
                          Закрыть
                        </button>
                      </div>
                      <h4>Выбери точку одним кликом</h4>
                      <p>
                        Отметь место, где, как тебе кажется, находится объект. Ответ
                        отправится сразу, а расстояние и очки появятся рядом с картой.
                      </p>
                    </div>
                  ) : null}

                  {!feedback ? (
                    <div className={`map-overlay${isSubmitting ? " map-overlay--active" : ""}`}>
                      {isSubmitting ? "Проверяем ответ..." : "Клик по карте = отправка ответа"}
                    </div>
                  ) : null}

                  {feedback && !isFinished ? (
                    <div className="map-feedback-tray">
                      <div className="map-feedback-tray__content">
                        <div className="map-feedback-tray__header">
                          <span className="eyebrow">Результат ответа</span>
                          <h3>{feedback.accuracyLabel}</h3>
                        </div>
                        <div className="feedback-metrics">
                          <span className="metric-pill">
                            {feedback.distanceKm.toLocaleString("ru-RU")} км
                          </span>
                          <span className="metric-pill">
                            +{scoreFormatter.format(feedback.scoreAwarded)} очков
                          </span>
                        </div>
                        <div className="map-feedback-tray__fact">
                          <span className="map-feedback-tray__fact-label">
                            Интересный факт
                          </span>
                          <p>{feedback.funFact}</p>
                        </div>
                      </div>

                      <div className="map-feedback-tray__actions">
                        <button
                          type="button"
                          className="primary-button"
                          onClick={handleNextQuestion}
                        >
                          Следующий вопрос
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            </section>
          </section>
        )}
      </main>

      {session && feedback && isFinished ? (
        <ResultModal
          isOpen={isResultModalOpen}
          session={session}
          feedback={feedback}
          leaderboard={leaderboard}
          currentRank={currentRank}
          totalFinishedSessions={totalFinishedSessions}
          expeditionPassport={expeditionPassport}
          recommendedTheme={recommendedTheme}
          onClose={() => setIsResultModalOpen(false)}
          onReset={handleResetGame}
          onStartRecommended={(themeId) => {
            setIsResultModalOpen(false);
            void startGame(themeId);
          }}
        />
      ) : null}

      {!session ? (
        <>
          <ThemeModal
            isOpen={isThemeModalOpen}
            themes={themes}
            selectedThemeId={selectedThemeId}
            onSelect={setSelectedThemeId}
            onClose={() => setIsThemeModalOpen(false)}
          />
          <ProjectInfoModal
            isOpen={isProjectInfoOpen}
            onClose={() => setIsProjectInfoOpen(false)}
          />
        </>
      ) : null}

      {questionImageUrl ? (
        <ImageLightbox
          isOpen={isImageLightboxOpen}
          imageUrl={questionImageUrl}
          alt={currentQuestion?.prompt ?? "Изображение вопроса"}
          onClose={() => setIsImageLightboxOpen(false)}
        />
      ) : null}
    </div>
  );
}
