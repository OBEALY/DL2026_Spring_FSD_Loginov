import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { sampleQuestions } from "../src/data/sampleQuestions.js";
import { MemoryQuizRepository } from "../src/repositories/memoryQuizRepository.js";

describe("Geo-quiz API", () => {
  let app: FastifyInstance;

  const createSession = async (playerName: string, themeId: string) =>
    app.inject({
      method: "POST",
      url: "/api/sessions",
      payload: {
        playerName,
        themeId
      }
    });

  const submitAnswer = async (
    sessionId: string,
    questionId: string,
    guessLatitude: number,
    guessLongitude: number
  ) =>
    app.inject({
      method: "POST",
      url: "/api/answers",
      payload: {
        sessionId,
        questionId,
        guessLatitude,
        guessLongitude,
        responseTimeMs: 3000
      }
    });

  const fetchLeaderboard = async (sessionId: string) =>
    app.inject({
      method: "GET",
      url: `/api/leaderboard?limit=5&currentSessionId=${sessionId}`
    });

  beforeEach(async () => {
    app = await buildApp({
      repository: new MemoryQuizRepository(sampleQuestions),
      repositoryLabel: "memory-test",
      frontendOrigins: ["http://localhost:5173"]
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("returns health status with the selected repository label", async () => {
    // Act
    const response = await app.inject({
      method: "GET",
      url: "/api/health"
    });

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      repository: "memory-test"
    });
  });

  it("returns available themes and question counts", async () => {
    // Act
    const response = await app.inject({
      method: "GET",
      url: "/api/themes"
    });

    // Assert
    expect(response.statusCode).toBe(200);

    const payload = response.json() as {
      items: Array<{ id: string; questionCount: number }>;
    };

    const counts = Object.fromEntries(
      payload.items.map((item) => [item.id, item.questionCount])
    );

    expect(counts.all).toBe(37);
    expect(counts["iconic-landmarks"]).toBe(12);
    expect(counts["world-wonders"]).toBe(12);
    expect(counts.capitals).toBe(13);
  });

  it("rejects invalid session input with status 400", async () => {
    // Arrange
    const invalidPayload = {
      playerName: "",
      themeId: "world-wonders"
    };

    // Act
    const response = await app.inject({
      method: "POST",
      url: "/api/sessions",
      payload: invalidPayload
    });

    // Assert
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "Некорректные данные запроса."
    });
  });

  it("creates a question suggestion", async () => {
    // Arrange
    const suggestionPayload = {
      playerName: "QA Bot",
      prompt: "Где находится Колизей?",
      locationName: "Колизей",
      themeId: "iconic-landmarks",
      notes: "Автотест",
      sourceUrl: "https://example.com/colosseum"
    };

    // Act
    const response = await app.inject({
      method: "POST",
      url: "/api/question-suggestions",
      payload: suggestionPayload
    });

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      message:
        "Спасибо! Мы сохранили предложение и сможем добавить его после проверки."
    });
  });

  it("finishes a 10-question game and updates leaderboard stats", async () => {
    // Arrange
    const questionMap = new Map(sampleQuestions.map((question) => [question.id, question]));
    const createSessionResponse = await createSession("QA Bot", "world-wonders");

    // Assert
    expect(createSessionResponse.statusCode).toBe(200);

    const sessionPayload = createSessionResponse.json() as {
      session: { id: string; totalQuestions: number; status: string };
      question: { id: string };
    };

    expect(sessionPayload.session.totalQuestions).toBe(10);

    let currentQuestionId = sessionPayload.question.id;
    const { id: sessionId, totalQuestions } = sessionPayload.session;

    for (let index = 0; index < totalQuestions; index += 1) {
      // Arrange
      const currentQuestion = questionMap.get(currentQuestionId);

      expect(currentQuestion).toBeDefined();

      // Act
      const answerResponse = await submitAnswer(
        sessionId,
        currentQuestionId,
        currentQuestion!.latitude,
        currentQuestion!.longitude
      );

      // Assert
      expect(answerResponse.statusCode).toBe(200);

      const answerPayload = answerResponse.json() as {
        finished: boolean;
        session: {
          id: string;
          status: string;
          totalScore: number;
        };
        nextQuestion: { id: string } | null;
        feedback: {
          scoreAwarded: number;
          distanceKm: number;
        };
      };

      expect(answerPayload.feedback.distanceKm).toBe(0);
      expect(answerPayload.feedback.scoreAwarded).toBeGreaterThan(0);

      if (index < totalQuestions - 1) {
        expect(answerPayload.finished).toBe(false);
        expect(answerPayload.nextQuestion).not.toBeNull();
        currentQuestionId = answerPayload.nextQuestion!.id;
        continue;
      }

      expect(answerPayload.finished).toBe(true);
      expect(answerPayload.nextQuestion).toBeNull();
      expect(answerPayload.session.status).toBe("finished");
      expect(answerPayload.session.totalScore).toBeGreaterThan(0);

      // Act
      const leaderboardResponse = await fetchLeaderboard(sessionId);

      // Assert
      expect(leaderboardResponse.statusCode).toBe(200);

      const leaderboardPayload = leaderboardResponse.json() as {
        items: Array<{ sessionId: string; playerName: string }>;
        currentRank: number | null;
        totalFinishedSessions: number | null;
      };

      expect(leaderboardPayload.currentRank).toBe(1);
      expect(leaderboardPayload.totalFinishedSessions).toBe(1);
      expect(leaderboardPayload.items[0]).toMatchObject({
        sessionId,
        playerName: "QA Bot"
      });
    }
  });
});
