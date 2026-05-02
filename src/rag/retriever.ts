import { config } from "../config.js";
import { getPolicyCollection } from "../db/mongo.js";
import { embedText } from "../embeddings/voyage.js";
import type { RetrievedPolicyChunk } from "../types.js";

export async function retrievePolicyContext(
  question: string,
  options: { limit?: number } = {}
): Promise<RetrievedPolicyChunk[]> {
  const queryVector = await embedText(question, { inputType: "query" });
  const collection = await getPolicyCollection();

  try {
    return await collection
      .aggregate<RetrievedPolicyChunk>([
        {
          $vectorSearch: {
            index: config.MONGODB_VECTOR_INDEX,
            path: "embedding",
            queryVector,
            numCandidates: 100,
            limit: options.limit ?? 5
          }
        },
        {
          $project: {
            _id: 0,
            text: 1,
            metadata: 1,
            score: { $meta: "vectorSearchScore" }
          }
        }
      ])
      .toArray();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('embedding must be indexed as "vector"')
    ) {
      throw new Error(
        [
          `MongoDB Vector Search index "${config.MONGODB_VECTOR_INDEX}" is not configured with embedding as a vector field.`,
          "Create or fix the Atlas Vector Search index, then rerun the query.",
          "You can run: npm run index:create"
        ].join("\n")
      );
    }

    throw error;
  }
}
