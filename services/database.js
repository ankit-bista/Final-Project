import { MongoClient } from "mongodb";

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const mongoDbName = process.env.MONGO_DB_NAME || process.env.DB_NAME || "ipfs_app";

const client = new MongoClient(mongoUri);
let dbRef = null;

export async function getDb() {
  if (dbRef) return dbRef;
  await client.connect();
  dbRef = client.db(mongoDbName);
  return dbRef;
}

export async function pingDb() {
  const db = await getDb();
  await db.command({ ping: 1 });
  return true;
}

export async function nextSequence(name) {
  const db = await getDb();
  const res = await db.collection("counters").findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return Number(res?.seq || res?.value?.seq || 1);
}

export async function getCollection(name) {
  const db = await getDb();
  return db.collection(name);
}

