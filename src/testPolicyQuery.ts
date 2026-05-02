import { inference, initializeLogger, llm } from "@livekit/agents";
import { config } from "./config.js";
import { closeMongoClient } from "./db/mongo.js";
import { retrievePolicyContext } from "./rag/retriever.js";

function buildPolicyContext(chunks: Awaited<ReturnType<typeof retrievePolicyContext>>) {
  return chunks
    .map((chunk, index) =>
      [
        `SOURCE ${index + 1}`,
        `Section: ${chunk.metadata.section}`,
        `Category: ${chunk.metadata.category}`,
        `Score: ${chunk.score ?? "n/a"}`,
        `Text: ${chunk.text}`
      ].join("\n")
    )
    .join("\n\n---\n\n");
}

async function main() {
  initializeLogger({ pretty: true, level: "warn" });

  const question = process.argv.slice(2).join(" ").trim();

  if (!question) {
    throw new Error('Usage: npm run query:test -- "Do I keep my benefits if I move location?"');
  }

  const chunks = await retrievePolicyContext(question, { limit: 5 });

  if (chunks.length === 0) {
    console.log("No matching policy chunks found.");
    return;
  }

  const chatCtx = new llm.ChatContext();
  chatCtx.addMessage({
    role: "system",
    content:
      "You are Agentic HR. Answer only from the provided company policy context. If the context is insufficient, say so and recommend contacting People Operations. Keep the answer concise."
  });
  chatCtx.addMessage({
    role: "user",
    content: [
      `Employee question: ${question}`,
      "",
      "Company policy context:",
      buildPolicyContext(chunks)
    ].join("\n")
  });

  const model = new inference.LLM({
    model: config.LIVEKIT_QUERY_LLM_MODEL,
    modelOptions: {
      temperature: 0.2
    }
  });

  const answerParts: string[] = [];
  for await (const chunk of model.chat({ chatCtx })) {
    if (chunk.delta?.content) {
      answerParts.push(chunk.delta.content);
    }
  }

  console.log(answerParts.join("").trim());
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoClient();
  });
