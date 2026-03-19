import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  SUPABASE_URL: z.string().trim().optional(),
  SUPABASE_SERVER_KEY: z.string().trim().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().optional(),
  USE_IN_MEMORY_DATA: z.enum(["true", "false"]).default("true")
});

const parsedEnv = envSchema.parse({
  PORT: process.env.PORT,
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVER_KEY: process.env.SUPABASE_SERVER_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  USE_IN_MEMORY_DATA: process.env.USE_IN_MEMORY_DATA ?? "true"
});

const serverKey =
  parsedEnv.SUPABASE_SERVER_KEY ?? parsedEnv.SUPABASE_SERVICE_ROLE_KEY ?? "";

const hasSupabaseCredentials = Boolean(
  parsedEnv.SUPABASE_URL && serverKey
);

const frontendOrigins = Array.from(
  new Set(
    [
      ...parsedEnv.FRONTEND_ORIGIN.split(",").map((item) => item.trim()),
      "http://127.0.0.1:5173",
      "http://host.docker.internal:5173"
    ].filter(Boolean)
  )
);

export const config = {
  port: parsedEnv.PORT,
  frontendOrigins,
  supabaseUrl: parsedEnv.SUPABASE_URL ?? "",
  supabaseServerKey: serverKey,
  useInMemoryData: parsedEnv.USE_IN_MEMORY_DATA === "true" || !hasSupabaseCredentials
};
