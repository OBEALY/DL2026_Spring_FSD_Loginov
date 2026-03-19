export type QuestionType = "landmark" | "city" | "country";
export type Difficulty = "easy" | "medium" | "hard";
export type GameStatus = "active" | "finished";
export type SessionMode = "classic";
export type QuestionTheme = "iconic-landmarks" | "world-wonders" | "capitals";
export type CollectionId = "all" | QuestionTheme;

export interface Question {
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
  imageUrl: string | null;
  isActive: boolean;
}

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

export interface GameSession {
  id: string;
  playerName: string;
  mode: SessionMode;
  themeId: CollectionId;
  questionQueue: string[];
  currentIndex: number;
  totalQuestions: number;
  totalScore: number;
  status: GameStatus;
  startedAt: string;
  finishedAt: string | null;
}

export interface SessionSummary {
  id: string;
  playerName: string;
  mode: SessionMode;
  themeId: CollectionId;
  currentIndex: number;
  totalQuestions: number;
  totalScore: number;
  status: GameStatus;
}

export interface AnswerRecord {
  id: string;
  sessionId: string;
  questionId: string;
  guessLatitude: number;
  guessLongitude: number;
  distanceKm: number;
  score: number;
  responseTimeMs: number | null;
  answeredAt: string;
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

export interface SessionRank {
  rank: number;
  totalFinishedSessions: number;
}

export interface ThemeOption {
  id: CollectionId;
  label: string;
  description: string;
  questionCount: number;
}

export interface QuestionSuggestion {
  id: string;
  playerName: string;
  prompt: string;
  locationName: string;
  themeId: QuestionTheme;
  notes: string | null;
  sourceUrl: string | null;
  status: "new";
  createdAt: string;
}

export function toPublicQuestion(question: Question): PublicQuestion {
  return {
    id: question.id,
    prompt: question.prompt,
    hint: question.hint,
    type: question.type,
    region: question.region,
    difficulty: question.difficulty,
    theme: question.theme,
    imageUrl: question.imageUrl
  };
}

export function toSessionSummary(session: GameSession): SessionSummary {
  return {
    id: session.id,
    playerName: session.playerName,
    mode: session.mode,
    themeId: session.themeId,
    currentIndex: session.currentIndex,
    totalQuestions: session.totalQuestions,
    totalScore: session.totalScore,
    status: session.status
  };
}
