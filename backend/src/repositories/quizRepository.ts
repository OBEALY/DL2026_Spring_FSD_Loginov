import type {
  AnswerRecord,
  GameSession,
  LeaderboardEntry,
  Question,
  QuestionSuggestion,
  SessionRank
} from "../types.js";

export interface QuizRepository {
  listActiveQuestions(): Promise<Question[]>;
  getQuestionById(id: string): Promise<Question | null>;
  createSession(session: GameSession): Promise<GameSession>;
  getSessionById(id: string): Promise<GameSession | null>;
  updateSession(session: GameSession): Promise<GameSession>;
  createAnswer(answer: AnswerRecord): Promise<AnswerRecord>;
  getLeaderboard(limit: number): Promise<LeaderboardEntry[]>;
  getSessionRank(sessionId: string): Promise<SessionRank | null>;
  createQuestionSuggestion(
    suggestion: QuestionSuggestion
  ): Promise<QuestionSuggestion>;
}
