import { randomUUID } from "node:crypto";
import { getThemeDefinition, themeDefinitions } from "./data/themes.js";
import type { QuizRepository } from "./repositories/quizRepository.js";
import type {
  AnswerFeedback,
  CollectionId,
  GameSession,
  LeaderboardEntry,
  PublicQuestion,
  Question,
  QuestionSuggestion,
  QuestionTheme,
  SessionSummary,
  ThemeOption
} from "./types.js";
import { toPublicQuestion, toSessionSummary } from "./types.js";
import { shuffleArray } from "./utils/array.js";
import { calculateDistanceKm, calculateScore, getAccuracyLabel } from "./utils/geo.js";
import { createHttpError } from "./utils/http.js";

const CLASSIC_QUESTION_COUNT = 10;

interface CreateSessionResult {
  session: SessionSummary;
  question: PublicQuestion;
}

interface CurrentStateResult {
  session: SessionSummary;
  question: PublicQuestion | null;
}

interface SubmitAnswerInput {
  sessionId: string;
  questionId: string;
  guessLatitude: number;
  guessLongitude: number;
  responseTimeMs: number | null;
}

interface SubmitAnswerResult {
  feedback: AnswerFeedback;
  session: SessionSummary;
  nextQuestion: PublicQuestion | null;
  finished: boolean;
}

interface LeaderboardResult {
  items: LeaderboardEntry[];
  currentRank: number | null;
  totalFinishedSessions: number | null;
}

interface CreateQuestionSuggestionInput {
  playerName: string;
  prompt: string;
  locationName: string;
  themeId: QuestionTheme;
  notes: string | null;
  sourceUrl: string | null;
}

export class QuizService {
  constructor(private readonly repository: QuizRepository) {}

  async createSession(
    playerName: string,
    themeId: CollectionId = "all"
  ): Promise<CreateSessionResult> {
    const questions = await this.repository.listActiveQuestions();
    const availableQuestions = this.filterQuestionsByTheme(questions, themeId);

    if (availableQuestions.length === 0) {
      const theme = getThemeDefinition(themeId);
      throw createHttpError(
        500,
        `На сервере пока нет активных вопросов для подборки "${theme.label}".`
      );
    }

    // Shuffle once and keep the generated queue in the session,
    // so every "next question" request stays deterministic.
    const questionQueue = shuffleArray(
      availableQuestions.map((question) => question.id)
    ).slice(0, Math.min(CLASSIC_QUESTION_COUNT, availableQuestions.length));

    const session: GameSession = {
      id: randomUUID(),
      playerName: playerName.trim(),
      mode: "classic",
      themeId,
      questionQueue,
      currentIndex: 0,
      totalQuestions: questionQueue.length,
      totalScore: 0,
      status: "active",
      startedAt: new Date().toISOString(),
      finishedAt: null
    };

    const firstQuestion = availableQuestions.find(
      (question) => question.id === questionQueue[0]
    );

    if (!firstQuestion) {
      throw createHttpError(500, "Не удалось подготовить первый вопрос.");
    }

    await this.repository.createSession(session);

    return {
      session: toSessionSummary(session),
      question: toPublicQuestion(firstQuestion)
    };
  }

  async getCurrentState(sessionId: string): Promise<CurrentStateResult> {
    const session = await this.repository.getSessionById(sessionId);

    if (!session) {
      throw createHttpError(404, "Игровая сессия не найдена.");
    }

    const currentQuestionId =
      session.status === "active" ? session.questionQueue[session.currentIndex] : null;
    const currentQuestion = currentQuestionId
      ? await this.repository.getQuestionById(currentQuestionId)
      : null;

    return {
      session: toSessionSummary(session),
      question: currentQuestion ? toPublicQuestion(currentQuestion) : null
    };
  }

  async submitAnswer(input: SubmitAnswerInput): Promise<SubmitAnswerResult> {
    const session = await this.repository.getSessionById(input.sessionId);

    if (!session) {
      throw createHttpError(404, "Игровая сессия не найдена.");
    }

    if (session.status === "finished") {
      throw createHttpError(409, "Игра уже завершена.");
    }

    const expectedQuestionId = session.questionQueue[session.currentIndex];

    if (!expectedQuestionId) {
      throw createHttpError(409, "В сессии больше нет доступных вопросов.");
    }

    if (expectedQuestionId !== input.questionId) {
      throw createHttpError(409, "Сейчас активен другой вопрос.");
    }

    const question = await this.repository.getQuestionById(input.questionId);

    if (!question) {
      throw createHttpError(404, "Вопрос не найден.");
    }

    const exactDistance = calculateDistanceKm(
      input.guessLatitude,
      input.guessLongitude,
      question.latitude,
      question.longitude
    );
    const roundedDistance = Number(exactDistance.toFixed(1));
    const scoreAwarded = calculateScore(exactDistance, input.responseTimeMs);

    await this.repository.createAnswer({
      id: randomUUID(),
      sessionId: session.id,
      questionId: question.id,
      guessLatitude: input.guessLatitude,
      guessLongitude: input.guessLongitude,
      distanceKm: roundedDistance,
      score: scoreAwarded,
      responseTimeMs: input.responseTimeMs,
      answeredAt: new Date().toISOString()
    });

    const updatedSession: GameSession = {
      ...session,
      currentIndex: session.currentIndex + 1,
      totalScore: session.totalScore + scoreAwarded
    };

    if (updatedSession.currentIndex >= updatedSession.totalQuestions) {
      updatedSession.status = "finished";
      updatedSession.finishedAt = new Date().toISOString();
    }

    await this.repository.updateSession(updatedSession);

    const nextQuestionId =
      updatedSession.status === "active"
        ? updatedSession.questionQueue[updatedSession.currentIndex]
        : null;
    const nextQuestion = nextQuestionId
      ? await this.repository.getQuestionById(nextQuestionId)
      : null;

    return {
      feedback: {
        questionId: question.id,
        guessLatitude: input.guessLatitude,
        guessLongitude: input.guessLongitude,
        correctLatitude: question.latitude,
        correctLongitude: question.longitude,
        distanceKm: roundedDistance,
        scoreAwarded,
        totalScore: updatedSession.totalScore,
        accuracyLabel: getAccuracyLabel(exactDistance),
        funFact: question.fact,
        correctLabel: question.prompt
      },
      session: toSessionSummary(updatedSession),
      nextQuestion: nextQuestion ? toPublicQuestion(nextQuestion) : null,
      finished: updatedSession.status === "finished"
    };
  }

  async getLeaderboard(
    limit: number,
    currentSessionId?: string
  ): Promise<LeaderboardResult> {
    const items = await this.repository.getLeaderboard(limit);
    const currentRank = currentSessionId
      ? await this.repository.getSessionRank(currentSessionId)
      : null;

    return {
      items,
      currentRank: currentRank?.rank ?? null,
      totalFinishedSessions: currentRank?.totalFinishedSessions ?? null
    };
  }

  async getThemes(): Promise<ThemeOption[]> {
    const questions = await this.repository.listActiveQuestions();

    return themeDefinitions.map((theme) => ({
      ...theme,
      questionCount:
        theme.id === "all"
          ? questions.length
          : questions.filter((question) => question.theme === theme.id).length
    }));
  }

  async createQuestionSuggestion(
    input: CreateQuestionSuggestionInput
  ): Promise<{ suggestion: QuestionSuggestion; message: string }> {
    const suggestion: QuestionSuggestion = {
      id: randomUUID(),
      playerName: input.playerName.trim(),
      prompt: input.prompt.trim(),
      locationName: input.locationName.trim(),
      themeId: input.themeId,
      notes: input.notes?.trim() || null,
      sourceUrl: input.sourceUrl?.trim() || null,
      status: "new",
      createdAt: new Date().toISOString()
    };

    await this.repository.createQuestionSuggestion(suggestion);

    return {
      suggestion,
      message: "Спасибо! Мы сохранили предложение и сможем добавить его после проверки."
    };
  }

  private filterQuestionsByTheme(
    questions: Question[],
    themeId: CollectionId
  ): Question[] {
    if (themeId === "all") {
      return questions;
    }

    return questions.filter((question) => question.theme === themeId);
  }
}
