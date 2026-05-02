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

  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.VOYAGE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input,
      model: config.VOYAGE_EMBEDDING_MODEL
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Voyage embedding request failed: ${response.status} ${body}`);
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
