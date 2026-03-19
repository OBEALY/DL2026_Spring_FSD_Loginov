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

  const isFinished = session?.status === "finished";
  const questionNumber = session
    ? Math.min(session.currentIndex + (feedback ? 0 : 1), session.totalQuestions)
    : 0;
  const progressPercent = session
    ? Math.round((session.currentIndex / session.totalQuestions) * 100)
    : 0;
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
              <p className="brand__subtitle">
                Игровой fullstack-проект с тематическими подборками, таблицей лидеров,
                предложением собственных вопросов и персональным паспортом экспедиции
                после завершения сессии.
              </p>
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

                <button type="submit" className="primary-button" disabled={isStarting}>
                  {isStarting
                    ? "Запуск..."
                    : `Начать: ${selectedTheme?.label ?? "Глобальный микс"}`}
                </button>
              </form>

              {error ? <div className="error-banner">{error}</div> : null}

              <ThemePicker
                themes={themes}
                selectedThemeId={selectedThemeId}
                onSelect={setSelectedThemeId}
              />

              <div className="feature-grid">
                <article className="feature-card">
                  <strong>Тематические подборки</strong>
                  <p>Можно запускать общий режим, чудеса света или городской формат.</p>
                </article>
                <article className="feature-card">
                  <strong>Лидерборд</strong>
                  <p>Финальные результаты попадают в таблицу и помогают сравнивать сессии.</p>
                </article>
                <article className="feature-card">
                  <strong>Киллер-фича</strong>
                  <p>
                    После игры приложение выдаёт паспорт экспедиции с титулом,
                    точностью и рекомендацией следующего режима.
                  </p>
                </article>
              </div>
            </section>

            <section className="home-sidebar">
              <section className="panel preview-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">Как выглядит игровой цикл</span>
                    <h3 className="panel-title">От вопроса до очков</h3>
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
                    <strong>12s</strong>
                  </div>
                </div>

                <div className="preview-route">
                  <span className="preview-dot preview-dot--guess" />
                  <span className="preview-route__line" />
                  <span className="preview-dot preview-dot--answer" />
                </div>

                <p className="preview-copy">
                  Игрок видит вопрос, ориентируется по карте, получает расстояние в
                  километрах, баллы и затем может сразу пойти в следующую тематическую
                  подборку, которую система подскажет сама.
                </p>

                <LeaderboardPanel items={leaderboard} />
              </section>

              <QuestionSuggestionForm
                defaultPlayerName={playerName}
                isSubmitting={isSubmittingSuggestion}
                successMessage={suggestionSuccessMessage}
                errorMessage={suggestionErrorMessage}
                onSubmit={handleSuggestionSubmit}
              />
            </section>
          </section>
        ) : (
          <section className="dashboard">
            <aside className="sidebar">
              <section className="panel question-panel">
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
                    <img
                      className="question-image"
                      src={questionImageUrl}
                      alt={currentQuestion.prompt}
                    />
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
                <article className="panel stat-card">
                  <span className="stat-label">Суммарный счёт</span>
                  <strong className="stat-value">
                    {scoreFormatter.format(session.totalScore)}
                  </strong>
                </article>
                <article className="panel stat-card">
                  <span className="stat-label">Таймер вопроса</span>
                  <strong className="stat-value">{elapsedSeconds}s</strong>
                </article>
              </section>

              {error ? <div className="error-banner">{error}</div> : null}

              <section className="panel feedback-panel">
                {feedback ? (
                  <>
                    <div className="feedback-header">
                      <div>
                        <span className="eyebrow">Результат ответа</span>
                        <h3 className="panel-title">{feedback.accuracyLabel}</h3>
                      </div>
                    </div>

                    <div className="feedback-metrics">
                      <span className="metric-pill">
                        {feedback.distanceKm.toLocaleString("ru-RU")} км
                      </span>
                      <span className="metric-pill">
                        +{scoreFormatter.format(feedback.scoreAwarded)} очков
                      </span>
                    </div>

                    <div className="fact-box">
                      <strong>Факт:</strong>
                      <p>{feedback.funFact}</p>
                    </div>

                    {isFinished ? (
                      <div className="finished-block">
                        <div className="result-summary">
                          <article className="result-stat">
                            <span className="stat-label">Ваш счёт</span>
                            <strong className="stat-value">
                              {scoreFormatter.format(session.totalScore)}
                            </strong>
                          </article>
                          <article className="result-stat">
                            <span className="stat-label">Ваш рейтинг</span>
                            <strong className="stat-value">
                              {currentRank !== null ? `#${currentRank}` : "Обновляем..."}
                            </strong>
                            <span className="result-stat__meta">
                              {currentRank !== null && totalFinishedSessions !== null
                                ? `из ${scoreFormatter.format(totalFinishedSessions)} завершённых сессий`
                                : "Позиция появится после обновления лидерборда"}
                            </span>
                          </article>
                        </div>

                        <p className="finished-copy">
                          Игра завершена. Финальный результат уже сохранён в таблице
                          лидеров, так что можно сравнить себя с другими игроками.
                        </p>

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
                              onClick={() => void startGame(recommendedTheme.id)}
                            >
                              Запустить рекомендованный режим
                            </button>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          className="ghost-button"
                          onClick={handleResetGame}
                        >
                          Вернуться на старт
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="primary-button"
                        onClick={handleNextQuestion}
                      >
                        Следующий вопрос
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <span className="eyebrow">Инструкция</span>
                    <h3 className="panel-title">Сделай один точный клик по карте</h3>
                    <p className="muted-copy">
                      После выбора точки ответ отправится сразу. Чем ближе к правильному
                      месту и чем быстрее ответ, тем выше итоговый счёт.
                    </p>
                  </>
                )}
              </section>

              <LeaderboardPanel
                items={leaderboard}
                currentSessionId={isFinished ? session.id : null}
              />
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

                  <div className={`map-overlay${isSubmitting ? " map-overlay--active" : ""}`}>
                    {isSubmitting ? "Проверяем ответ..." : "Клик по карте = отправка ответа"}
                  </div>
                </div>
              </section>
            </section>
          </section>
        )}
      </main>
    </div>
  );
}
