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

## LiveKit Test Agent

For testing, this repo includes a LiveKit agent that can onboard a newly hired employee and answer policy questions.

Onboarding flow:

```text
new employee joins LiveKit room
  -> agent asks onboarding questions one at a time
  -> saveOnboardingDetails stores each answer in MongoDB
  -> when required fields are complete, mock onboarding actions are queued
```

The onboarding agent collects:

- personal details: name, email, phone, date of birth, address
- worker type: IT, Core, or Management
- expertise/skills
- requirements from the employer
- chat/voice preference

```text
employee asks policy question in LiveKit
  -> LiveKit LLM calls queryCompanyPolicies
  -> Voyage embeds the question with input_type=query
  -> MongoDB Vector Search retrieves policy chunks
  -> LiveKit Inference LLM answers from the retrieved chunks
  -> answer is sent back through LiveKit
```

Add these to `.env`:

```env
LIVEKIT_URL=wss://<your-livekit-project>.livekit.cloud
LIVEKIT_API_KEY=<your-livekit-api-key>
LIVEKIT_API_SECRET=<your-livekit-api-secret>
LIVEKIT_AGENT_NAME=agentic-hr
LIVEKIT_QUERY_LLM_MODEL=google/gemini-2.5-flash
MONGODB_VECTOR_INDEX=policy_vector_index
```

Then start the worker:

```bash
npm run agent:dev
```

To test without a LiveKit room/frontend, run:

```bash
npm run query:test -- "If I move to another country, do I keep my location-based benefits?"
```

To test onboarding storage without LiveKit:

```bash
npm run onboarding:test -- demo_employee
```

To inspect or reset a demo employee's onboarding state:

```bash
npm run onboarding:status -- emp_123
npm run onboarding:status -- emp_123 --reset
npm run onboarding:summary -- emp_123
```

For a full walkthrough, see [docs/demo-script.md](docs/demo-script.md).

## Simple UI

Run the LiveKit agent worker:

```bash
npm run agent:dev
```

In another terminal, start the ChatGPT-style UI:

```bash
npm run ui:dev
```

Open:

```text
http://localhost:5173
```

Enter an employee id, start a session, then type or speak to the agent.

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

Name the index to match `MONGODB_VECTOR_INDEX`. The default is `policy_vector_index`.

You can create the index from this repo:

```bash
npm run index:create
```

If Atlas already has a normal search index with that name, delete it in Atlas first and recreate it as a Vector Search index.

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
