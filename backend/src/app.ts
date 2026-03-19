import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { config } from "./config.js";
import { QuizService } from "./quizService.js";
import { MemoryQuizRepository } from "./repositories/memoryQuizRepository.js";
import type { QuizRepository } from "./repositories/quizRepository.js";
import { SupabaseQuizRepository } from "./repositories/supabaseQuizRepository.js";
import { registerQuizRoutes } from "./routes/quizRoutes.js";

interface BuildAppOptions {
  logger?: boolean;
  repository?: QuizRepository;
  repositoryLabel?: string;
  frontendOrigins?: string[];
}

export async function buildApp(
  options: BuildAppOptions = {}
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false
  });

  const repository =
    options.repository ??
    (config.useInMemoryData
      ? new MemoryQuizRepository()
      : new SupabaseQuizRepository(config.supabaseUrl, config.supabaseServerKey));

  const repositoryLabel =
    options.repositoryLabel ??
    (config.useInMemoryData ? "memory" : "supabase");

  const quizService = new QuizService(repository);

  await app.register(cors, {
    origin: options.frontendOrigins ?? config.frontendOrigins
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      reply.status(400).send({
        message: "Некорректные данные запроса.",
        details: error.issues
      });
      return;
    }

    const statusCode =
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : 500;

    if (statusCode >= 500) {
      app.log.error(error);
    }

    const message =
      error instanceof Error ? error.message : "Внутренняя ошибка сервера.";

    reply.status(statusCode).send({
      message
    });
  });

  await registerQuizRoutes(app, quizService, repositoryLabel);

  return app;
}
