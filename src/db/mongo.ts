import { MongoClient } from "mongodb";
import { config } from "../config.js";
import type { PolicyChunk } from "../types.js";

let client: MongoClient | undefined;

export async function getMongoClient() {
  if (!client) {
    client = new MongoClient(config.MONGODB_URI);
    await client.connect();
  }

  return client;
}

export async function getPolicyCollection() {
  const mongo = await getMongoClient();
  return mongo.db(config.MONGODB_DB).collection<PolicyChunk>(config.MONGODB_COLLECTION);
}

export async function closeMongoClient() {
  if (client) {
    await client.close();
    client = undefined;
  }
}
