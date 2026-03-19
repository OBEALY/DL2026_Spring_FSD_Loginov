export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType = "landmark" | "city" | "country";
export type GameStatus = "active" | "finished";
export type QuestionTheme = "iconic-landmarks" | "world-wonders" | "capitals";
export type CollectionId = "all" | QuestionTheme;

export interface PublicQuestion {
  id: string;
  prompt: string;
  hint: string | null;
  type: QuestionType;
  region: string;
  difficulty: Difficulty;
  theme: QuestionTheme;
  imageUrl: string | null;
}

export interface SessionSummary {
  id: string;
  playerName: string;
  mode: "classic";
  themeId: CollectionId;
  currentIndex: number;
  totalQuestions: number;
  totalScore: number;
  status: GameStatus;
}

export interface AnswerFeedback {
  questionId: string;
  guessLatitude: number;
  guessLongitude: number;
  correctLatitude: number;
  correctLongitude: number;
  distanceKm: number;
  scoreAwarded: number;
  totalScore: number;
  accuracyLabel: string;
  funFact: string;
  correctLabel: string;
}

export interface LeaderboardEntry {
  sessionId: string;
  playerName: string;
  totalScore: number;
  answeredQuestions: number;
  finishedAt: string | null;
}

export interface ThemeOption {
  id: CollectionId;
  label: string;
  description: string;
  questionCount: number;
}

export interface CreateSessionResponse {
  session: SessionSummary;
  question: PublicQuestion;
}

export interface SubmitAnswerResponse {
  feedback: AnswerFeedback;
  session: SessionSummary;
  nextQuestion: PublicQuestion | null;
  finished: boolean;
}

export interface LeaderboardResponse {
  items: LeaderboardEntry[];
  currentRank: number | null;
  totalFinishedSessions: number | null;
}

export interface ThemesResponse {
  items: ThemeOption[];
}

export interface QuestionSuggestionPayload {
  playerName: string;
  prompt: string;
  locationName: string;
  themeId: QuestionTheme;
  notes: string | null;
  sourceUrl: string | null;
}

export interface QuestionSuggestionResponse {
  message: string;
}
