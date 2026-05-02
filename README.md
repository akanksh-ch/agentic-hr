# Agentic HR Policy Ingestion

This is the policy ingestion side of the Agentic HR hackathon product.

It takes a hypothetical HR policy document from `docs/Policies`, splits it into searchable chunks, embeds those chunks with Voyage AI, and stores the vectors in MongoDB.

## Flow

```text
HR policy markdown
  -> section parsing
  -> chunking
  -> Voyage AI embeddings
  -> MongoDB policy_chunks collection
```

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`, then ingest the hypothetical onboarding-related policy doc:

```bash
npm run ingest
```

For Voyage embeddings, the endpoint must match where your key was created:

- MongoDB Atlas Model API key: `VOYAGE_API_BASE_URL=https://ai.mongodb.com/v1`
- Voyage platform key: `VOYAGE_API_BASE_URL=https://api.voyageai.com/v1`

The ingestion script sends `input_type=document`, which MongoDB and Voyage recommend for documents used in retrieval.

## MongoDB Vector Index

Create an Atlas Vector Search index on the `policy_chunks` collection:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    }
  ]
}
```

Name the index whatever your later retrieval code expects. The ingestion step only stores vectors; it does not query the index yet.

`voyage-3-large` embeddings are 1024 dimensions. If you change `VOYAGE_EMBEDDING_MODEL`, update the index dimensions to match.

## Stored Document Shape

Each stored policy chunk looks like:

```ts
{
  text: string,
  embedding: number[],
  metadata: {
    source: "onboarding-query-policy.md",
    section: string,
    chunkIndex: number,
    category: string,
    version: "1.0"
  },
  createdAt: Date
}
```
