import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { QuizService } from "../quizService.js";

const collectionIdSchema = z.enum([
  "all",
  "iconic-landmarks",
  "world-wonders",
  "capitals"
]);

const createSessionSchema = z.object({
  playerName: z.string().trim().min(1).max(40),
  themeId: collectionIdSchema.optional()
});

const sessionParamsSchema = z.object({
  sessionId: z.string().uuid()
});

const answerSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  guessLatitude: z.number().min(-90).max(90),
  guessLongitude: z.number().min(-180).max(180),
  responseTimeMs: z.number().int().min(0).max(300000).nullable().optional()
});

const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
  currentSessionId: z.string().uuid().optional()
});

const questionSuggestionSchema = z.object({
  playerName: z.string().trim().min(1).max(40),
  prompt: z.string().trim().min(8).max(160),
  locationName: z.string().trim().min(2).max(100),
  themeId: z.enum(["iconic-landmarks", "world-wonders", "capitals"]),
  notes: z.string().trim().max(400).nullable().optional(),
  sourceUrl: z.string().trim().url().max(240).nullable().optional()
});

export async function registerQuizRoutes(
  app: FastifyInstance,
  quizService: QuizService,
  repositoryLabel: string
): Promise<void> {
  app.get("/api/health", async () => ({
    status: "ok",
    repository: repositoryLabel,
    timestamp: new Date().toISOString()
  }));

  app.get("/api/themes", async () => {
    const items = await quizService.getThemes();
    return { items };
  });

  app.post("/api/sessions", async (request) => {
    const body = createSessionSchema.parse(request.body);
    return quizService.createSession(body.playerName, body.themeId ?? "all");
  });

  app.get("/api/sessions/:sessionId/current", async (request) => {
    const params = sessionParamsSchema.parse(request.params);
    return quizService.getCurrentState(params.sessionId);
  });

  app.post("/api/answers", async (request) => {
    const body = answerSchema.parse(request.body);

    return quizService.submitAnswer({
      sessionId: body.sessionId,
      questionId: body.questionId,
      guessLatitude: body.guessLatitude,
      guessLongitude: body.guessLongitude,
      responseTimeMs: body.responseTimeMs ?? null
    });
  });

  app.get("/api/leaderboard", async (request) => {
    const query = leaderboardQuerySchema.parse(request.query);
    return quizService.getLeaderboard(query.limit, query.currentSessionId);
  });

  app.post("/api/question-suggestions", async (request) => {
    const body = questionSuggestionSchema.parse(request.body);

    return quizService.createQuestionSuggestion({
      playerName: body.playerName,
      prompt: body.prompt,
      locationName: body.locationName,
      themeId: body.themeId,
      notes: body.notes ?? null,
      sourceUrl: body.sourceUrl ?? null
    });
  });
}
