import "server-only";
import { MongoClient, type Db } from "mongodb";

const g = globalThis as unknown as { _mongoClient?: MongoClient; _mongoReady?: Promise<void> };

const dbName = () => process.env.MONGODB_DB || "ministudio";

/** One client per process. The driver connects lazily on the first operation. */
function client(): MongoClient {
  return (g._mongoClient ??= new MongoClient(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017", { ignoreUndefined: true }));
}

/** Synchronous handle (Better Auth's adapter needs a Db up front). */
export function rawDb(): Db {
  return client().db(dbName());
}

/** Db with indexes ensured once per process. */
export async function db(): Promise<Db> {
  const d = rawDb();
  if (!g._mongoReady) {
    g._mongoReady = Promise.all([
      d.collection("projects").createIndex({ slug: 1 }, { unique: true }),
      d.collection("records").createIndex({ projectId: 1, collection: 1, createdAt: -1 }),
      d.collection("payments").createIndex({ projectId: 1, orderId: 1 }),
      d.collection("projects").createIndex({ ownerId: 1 }),
      d.collection("projects").createIndex({ "members.userId": 1 }),
      d.collection("projects").createIndex({ "members.email": 1 }),
      d.collection("audit").createIndex({ at: -1 }),
      d.collection("audit").createIndex({ projectId: 1, at: -1 }),
      d.collection("usage").createIndex({ userId: 1, at: -1 }),
      d.collection("records").createIndex({ projectId: 1, collection: 1, "tgUser.id": 1, createdAt: -1 }),
      d.collection("tg_users").createIndex({ projectId: 1, tgId: 1 }, { unique: true }),
      d.collection("tg_users").createIndex({ projectId: 1, lastSeen: -1 }),
      d.collection("usage").createIndex({ projectId: 1, at: -1 }),
      d.collection("bot_state").createIndex({ projectId: 1, chatId: 1 }, { unique: true }),
      d.collection("bot_state").createIndex({ updatedAt: 1 }, { expireAfterSeconds: 86400 }),
      d.collection("broadcasts").createIndex({ projectId: 1, createdAt: -1 }),
    ])
      .then(() => undefined)
      .catch((e) => {
        console.error("index setup", e);
        g._mongoReady = undefined;
      });
  }
  await g._mongoReady;
  return d;
}
