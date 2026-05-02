import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().default("policies"),
  MONGODB_COLLECTION: z.string().default("policy_chunks"),
  VOYAGE_API_KEY: z.string().min(1),
  VOYAGE_API_BASE_URL: z.string().url().default("https://ai.mongodb.com/v1"),
  VOYAGE_EMBEDDING_MODEL: z.string().default("voyage-3-large"),
  VOYAGE_INPUT_TYPE: z.enum(["document", "query"]).default("document")
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const missing = parsedEnv.error.issues
    .filter((issue) => issue.code === "invalid_type" && issue.received === "undefined")
    .map((issue) => issue.path.join("."));

  throw new Error(
    [
      "Missing required environment variables for policy ingestion.",
      missing.length ? `Missing: ${missing.join(", ")}` : parsedEnv.error.message,
      "Create a .env file from .env.example and set MONGODB_URI and VOYAGE_API_KEY."
    ].join("\n")
  );
}

export const config = parsedEnv.data;
