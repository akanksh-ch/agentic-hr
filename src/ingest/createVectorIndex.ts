import { config } from "../config.js";
import { closeMongoClient, getPolicyCollection } from "../db/mongo.js";

async function main() {
  const collection = await getPolicyCollection();
  const existing = await collection.listSearchIndexes(config.MONGODB_VECTOR_INDEX).toArray();

  if (existing.length > 0) {
    console.log(
      `Search index "${config.MONGODB_VECTOR_INDEX}" already exists on ${config.MONGODB_DB}.${config.MONGODB_COLLECTION}.`
    );
    console.log("If MongoDB says embedding must be indexed as vector, delete the existing index in Atlas and rerun this command.");
    return;
  }

  const createdName = await collection.createSearchIndex({
    name: config.MONGODB_VECTOR_INDEX,
    type: "vectorSearch",
    definition: {
      fields: [
        {
          type: "vector",
          path: "embedding",
          numDimensions: 1024,
          similarity: "cosine"
        }
      ]
    }
  });

  console.log(
    `Created vector search index "${createdName}" on ${config.MONGODB_DB}.${config.MONGODB_COLLECTION}.`
  );
  console.log("Atlas may take a minute or two to finish building the index before queries work.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoClient();
  });
