import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { getPolicyCollection, closeMongoClient } from "../db/mongo.js";
import { embedTexts } from "../embeddings/voyage.js";
import type { PolicyChunk } from "../types.js";
import { chunkSection, inferCategory, splitMarkdownIntoSections } from "./chunker.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const policyPath = path.resolve(__dirname, "../../docs/Policies/onboarding-query-policy.md");

async function main() {
  const markdown = await readFile(policyPath, "utf8");
  const sections = splitMarkdownIntoSections(markdown);
  const chunkInputs = sections.flatMap((section) =>
    chunkSection(section).map((text) => ({
      text,
      section: section.title,
      category: inferCategory(section.title)
    }))
  );

  console.log(`Embedding ${chunkInputs.length} policy chunks with Voyage AI...`);
  const embeddings = await embedTexts(
    chunkInputs.map((chunk) => chunk.text),
    { inputType: "document" }
  );

  const policyChunks: PolicyChunk[] = chunkInputs.map((chunk, index) => ({
    text: chunk.text,
    embedding: embeddings[index],
    metadata: {
      source: "onboarding-query-policy.md",
      section: chunk.section,
      chunkIndex: index,
      category: chunk.category,
      version: "1.0"
    },
    createdAt: new Date()
  }));

  const collection = await getPolicyCollection();
  await collection.deleteMany({ "metadata.source": "onboarding-query-policy.md" });
  await collection.insertMany(policyChunks);

  console.log(`Inserted ${policyChunks.length} policy chunks into MongoDB.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoClient();
  });
