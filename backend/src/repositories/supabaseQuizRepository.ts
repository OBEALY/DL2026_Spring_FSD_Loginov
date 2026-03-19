import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AnswerRecord,
  CollectionId,
  Difficulty,
  GameSession,
  GameStatus,
  LeaderboardEntry,
  Question,
  QuestionSuggestion,
  SessionRank,
  QuestionTheme,
  QuestionType
} from "../types.js";
import type { QuizRepository } from "./quizRepository.js";

type QuestionRow = {
  id: string;
  prompt: string;
  hint: string | null;
  type: QuestionType;
  latitude: number;
  longitude: number;
  region: string;
  difficulty: Difficulty;
  theme: QuestionTheme;
  fact: string;
  image_url: string | null;
  is_active: boolean;
};

type SessionRow = {
  id: string;
  player_name: string;
  mode: "classic";
  theme_id: CollectionId;
  question_queue: string[];
  current_index: number;
  total_questions: number;
  total_score: number;
  status: GameStatus;
  started_at: string;
  finished_at: string | null;
};

type AnswerRow = {
  id: string;
  session_id: string;
  question_id: string;
  guess_latitude: number;
  guess_longitude: number;
  distance_km: number;
  score: number;
  response_time_ms: number | null;
  answered_at: string;
};

type LeaderboardRow = {
  session_id: string;
  player_name: string;
  total_score: number;
  answered_questions: number;
  finished_at: string | null;
};

type SuggestionRow = {
  id: string;
  player_name: string;
  prompt: string;
  location_name: string;
  theme_id: QuestionTheme;
  notes: string | null;
  source_url: string | null;
  status: "new";
  created_at: string;
};

function mapQuestionRow(row: QuestionRow): Question {
  return {
    id: row.id,
    prompt: row.prompt,
    hint: row.hint,
    type: row.type,
    latitude: row.latitude,
    longitude: row.longitude,
    region: row.region,
    difficulty: row.difficulty,
    theme: row.theme,
    fact: row.fact,
    imageUrl: row.image_url,
    isActive: row.is_active
  };
}

function mapSessionRow(row: SessionRow): GameSession {
  return {
    id: row.id,
    playerName: row.player_name,
    mode: row.mode,
    themeId: row.theme_id,
    questionQueue: Array.isArray(row.question_queue)
      ? row.question_queue.map((item) => String(item))
      : [],
    currentIndex: row.current_index,
    totalQuestions: row.total_questions,
    totalScore: row.total_score,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at
  };
}

function mapSessionToRow(session: GameSession): SessionRow {
  return {
    id: session.id,
    player_name: session.playerName,
    mode: session.mode,
    theme_id: session.themeId,
    question_queue: session.questionQueue,
    current_index: session.currentIndex,
    total_questions: session.totalQuestions,
    total_score: session.totalScore,
    status: session.status,
    started_at: session.startedAt,
    finished_at: session.finishedAt
  };
}

function mapAnswerToRow(answer: AnswerRecord): AnswerRow {
  return {
    id: answer.id,
    session_id: answer.sessionId,
    question_id: answer.questionId,
    guess_latitude: answer.guessLatitude,
    guess_longitude: answer.guessLongitude,
    distance_km: answer.distanceKm,
    score: answer.score,
    response_time_ms: answer.responseTimeMs,
    answered_at: answer.answeredAt
  };
}

function mapSuggestionToRow(suggestion: QuestionSuggestion): SuggestionRow {
  return {
    id: suggestion.id,
    player_name: suggestion.playerName,
    prompt: suggestion.prompt,
    location_name: suggestion.locationName,
    theme_id: suggestion.themeId,
    notes: suggestion.notes,
    source_url: suggestion.sourceUrl,
    status: suggestion.status,
    created_at: suggestion.createdAt
  };
}

export class SupabaseQuizRepository implements QuizRepository {
  private readonly client: SupabaseClient;

  constructor(url: string, serverKey: string) {
    this.client = createClient(url, serverKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  async listActiveQuestions(): Promise<Question[]> {
    const { data, error } = await this.client
      .from("questions")
      .select(
        "id, prompt, hint, type, latitude, longitude, region, difficulty, theme, fact, image_url, is_active"
      )
      .eq("is_active", true);

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => mapQuestionRow(row as QuestionRow));
  }

  async getQuestionById(id: string): Promise<Question | null> {
    const { data, error } = await this.client
      .from("questions")
      .select(
        "id, prompt, hint, type, latitude, longitude, region, difficulty, theme, fact, image_url, is_active"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapQuestionRow(data as QuestionRow) : null;
  }

  async createSession(session: GameSession): Promise<GameSession> {
    const { error } = await this.client.from("game_sessions").insert(mapSessionToRow(session));

    if (error) {
      throw error;
    }

    return session;
  }

  async getSessionById(id: string): Promise<GameSession | null> {
    const { data, error } = await this.client
      .from("game_sessions")
      .select(
        "id, player_name, mode, theme_id, question_queue, current_index, total_questions, total_score, status, started_at, finished_at"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapSessionRow(data as SessionRow) : null;
  }

  async updateSession(session: GameSession): Promise<GameSession> {
    const { error } = await this.client
      .from("game_sessions")
      .update(mapSessionToRow(session))
      .eq("id", session.id);

    if (error) {
      throw error;
    }

    return session;
  }

  async createAnswer(answer: AnswerRecord): Promise<AnswerRecord> {
    const { error } = await this.client.from("answers").insert(mapAnswerToRow(answer));

    if (error) {
      throw error;
    }

    return answer;
  }

  async getLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    const { data, error } = await this.client
      .from("leaderboard")
      .select("session_id, player_name, total_score, answered_questions, finished_at")
      .order("total_score", { ascending: false })
      .order("finished_at", { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => {
      const item = row as LeaderboardRow;
      return {
        sessionId: item.session_id,
        playerName: item.player_name,
        totalScore: item.total_score,
        answeredQuestions: item.answered_questions,
        finishedAt: item.finished_at
      };
    });
  }

  async getSessionRank(sessionId: string): Promise<SessionRank | null> {
    const { data, error } = await this.client
      .from("leaderboard")
      .select("session_id, player_name, total_score, answered_questions, finished_at")
      .order("total_score", { ascending: false })
      .order("finished_at", { ascending: true });

    if (error) {
      throw error;
    }

    const items = (data ?? []).map((row) => {
      const item = row as LeaderboardRow;
      return {
        sessionId: item.session_id,
        playerName: item.player_name,
        totalScore: item.total_score,
        answeredQuestions: item.answered_questions,
        finishedAt: item.finished_at
      };
    });

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
    const { error } = await this.client
      .from("question_suggestions")
      .insert(mapSuggestionToRow(suggestion));

    if (error) {
      throw error;
    }

    return suggestion;
  }
}
