import { config } from "../config.js";

type VoyageEmbeddingResponse = {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
};

export async function embedTexts(input: string[]): Promise<number[][]> {
  if (input.length === 0) {
    return [];
  }

  const baseUrl = config.VOYAGE_API_BASE_URL.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.VOYAGE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input,
      model: config.VOYAGE_EMBEDDING_MODEL,
      input_type: config.VOYAGE_INPUT_TYPE
    })
  });

  if (!response.ok) {
    const body = await response.text();
    const hint =
      response.status === 403
        ? "\nHint: 403 usually means the API key cannot access this endpoint. Atlas Model API keys should use VOYAGE_API_BASE_URL=https://ai.mongodb.com/v1. Voyage platform keys should use VOYAGE_API_BASE_URL=https://api.voyageai.com/v1."
        : "";
    throw new Error(`Voyage embedding request failed: ${response.status} ${body}${hint}`);
  }

  const payload = (await response.json()) as VoyageEmbeddingResponse;
  return payload.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

export async function embedText(input: string): Promise<number[]> {
  const [embedding] = await embedTexts([input]);
  return embedding;
}
