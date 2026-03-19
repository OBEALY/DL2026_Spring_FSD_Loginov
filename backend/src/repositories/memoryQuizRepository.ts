import { sampleQuestions } from "../data/sampleQuestions.js";
import type {
  AnswerRecord,
  GameSession,
  LeaderboardEntry,
  Question,
  QuestionSuggestion,
  SessionRank
} from "../types.js";
import type { QuizRepository } from "./quizRepository.js";

function cloneQuestion(question: Question): Question {
  return { ...question };
}

function cloneSession(session: GameSession): GameSession {
  return {
    ...session,
    questionQueue: [...session.questionQueue]
  };
}

function cloneAnswer(answer: AnswerRecord): AnswerRecord {
  return { ...answer };
}

function cloneSuggestion(suggestion: QuestionSuggestion): QuestionSuggestion {
  return { ...suggestion };
}

function cloneLeaderboardEntry(item: LeaderboardEntry): LeaderboardEntry {
  return { ...item };
}

export class MemoryQuizRepository implements QuizRepository {
  private readonly questions: Question[];
  private readonly sessions = new Map<string, GameSession>();
  private readonly answers: AnswerRecord[] = [];
  private readonly suggestions: QuestionSuggestion[] = [];

  constructor(seed: Question[] = sampleQuestions) {
    this.questions = seed.map(cloneQuestion);
  }

  async listActiveQuestions(): Promise<Question[]> {
    return this.questions.filter((question) => question.isActive).map(cloneQuestion);
  }

  async getQuestionById(id: string): Promise<Question | null> {
    const question = this.questions.find((item) => item.id === id);
    return question ? cloneQuestion(question) : null;
  }

  async createSession(session: GameSession): Promise<GameSession> {
    const clone = cloneSession(session);
    this.sessions.set(clone.id, clone);
    return cloneSession(clone);
  }

  async getSessionById(id: string): Promise<GameSession | null> {
    const session = this.sessions.get(id);
    return session ? cloneSession(session) : null;
  }

  async updateSession(session: GameSession): Promise<GameSession> {
    const clone = cloneSession(session);
    this.sessions.set(clone.id, clone);
    return cloneSession(clone);
  }

  async createAnswer(answer: AnswerRecord): Promise<AnswerRecord> {
    const clone = cloneAnswer(answer);
    this.answers.push(clone);
    return cloneAnswer(clone);
  }

  private buildSortedLeaderboard(): LeaderboardEntry[] {
    return [...this.sessions.values()]
      .filter((session) => session.status === "finished")
      .map((session) => ({
        sessionId: session.id,
        playerName: session.playerName,
        totalScore: session.totalScore,
        answeredQuestions: this.answers.filter(
          (answer) => answer.sessionId === session.id
        ).length,
        finishedAt: session.finishedAt
      }))
      .sort((left, right) => {
        if (right.totalScore !== left.totalScore) {
          return right.totalScore - left.totalScore;
        }

        const leftTime = left.finishedAt ? Date.parse(left.finishedAt) : Number.MAX_SAFE_INTEGER;
        const rightTime = right.finishedAt ? Date.parse(right.finishedAt) : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      });
  }

  async getLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    return this.buildSortedLeaderboard()
      .slice(0, limit)
      .map(cloneLeaderboardEntry);
  }

  async getSessionRank(sessionId: string): Promise<SessionRank | null> {
    const items = this.buildSortedLeaderboard();
    const currentIndex = items.findIndex((item) => item.sessionId === sessionId);

    if (currentIndex === -1) {
      return null;
    }

    return {
      rank: currentIndex + 1,
      totalFinishedSessions: items.length
    };
  }

  async createQuestionSuggestion(
    suggestion: QuestionSuggestion
  ): Promise<QuestionSuggestion> {
    const clone = cloneSuggestion(suggestion);
    this.suggestions.push(clone);
    return cloneSuggestion(clone);
  }
}
