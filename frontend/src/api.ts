import type {
  CreateSessionResponse,
  LeaderboardResponse,
  QuestionSuggestionPayload,
  QuestionSuggestionResponse,
  SubmitAnswerResponse,
  ThemesResponse,
  CollectionId
} from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? "Не удалось выполнить запрос к серверу.");
  }

  return payload as T;
}

export function createSession(
  playerName: string,
  themeId: CollectionId
): Promise<CreateSessionResponse> {
  return request<CreateSessionResponse>("/sessions", {
    method: "POST",
    body: JSON.stringify({ playerName, themeId })
  });
}

interface SubmitAnswerInput {
  sessionId: string;
  questionId: string;
  guessLatitude: number;
  guessLongitude: number;
  responseTimeMs: number | null;
}

export function submitAnswer(
  payload: SubmitAnswerInput
): Promise<SubmitAnswerResponse> {
  return request<SubmitAnswerResponse>("/answers", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getLeaderboard(
  limit = 5,
  currentSessionId?: string
): Promise<LeaderboardResponse> {
  const searchParams = new URLSearchParams({
    limit: String(limit)
  });

  if (currentSessionId) {
    searchParams.set("currentSessionId", currentSessionId);
  }

  return request<LeaderboardResponse>(`/leaderboard?${searchParams.toString()}`);
}

export function getThemes(): Promise<ThemesResponse> {
  return request<ThemesResponse>("/themes");
}

export function submitQuestionSuggestion(
  payload: QuestionSuggestionPayload
): Promise<QuestionSuggestionResponse> {
  return request<QuestionSuggestionResponse>("/question-suggestions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
