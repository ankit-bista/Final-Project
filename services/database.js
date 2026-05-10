import { MongoClient } from "mongodb";

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const mongoDbName = process.env.MONGO_DB_NAME || process.env.DB_NAME || "ipfs_app";

const client = new MongoClient(mongoUri);
let dbRef = null;
let indexesEnsured = false;

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

export async function ensureDbIndexes() {
  if (indexesEnsured) return;
  const db = await getDb();

  await Promise.all([
    db.collection("files").createIndexes([
      { key: { id: 1 }, unique: true, name: "ux_files_id" },
      { key: { user_id: 1, id: -1 }, name: "ix_files_user_id_id_desc" },
      { key: { drive_id: 1, folder_id: 1, id: -1 }, name: "ix_files_drive_folder_id_desc" },
    ]),
    db.collection("users").createIndexes([
      { key: { id: 1 }, unique: true, name: "ux_users_id" },
      { key: { wallet_address: 1 }, unique: true, name: "ux_users_wallet_address" },
      { key: { username: 1 }, unique: true, sparse: true, name: "ux_users_username" },
    ]),
    db.collection("file_shares").createIndexes([
      { key: { id: 1 }, unique: true, name: "ux_file_shares_id" },
      { key: { file_id: 1, grantee_id: 1 }, unique: true, name: "ux_file_shares_file_grantee" },
      { key: { grantee_id: 1, file_id: -1 }, name: "ix_file_shares_grantee_file_desc" },
      { key: { owner_id: 1, created_at: -1 }, name: "ix_file_shares_owner_created_desc" },
    ]),
    db.collection("file_comments").createIndexes([
      { key: { id: 1 }, unique: true, name: "ux_file_comments_id" },
      { key: { file_id: 1, created_at: -1 }, name: "ix_file_comments_file_created_desc" },
    ]),
    db.collection("file_links").createIndexes([
      { key: { id: 1 }, unique: true, name: "ux_file_links_id" },
      { key: { token: 1 }, unique: true, name: "ux_file_links_token" },
      { key: { expires_at: 1 }, expireAfterSeconds: 0, name: "ix_file_links_expires_ttl" },
    ]),
    db.collection("drives").createIndexes([
      { key: { id: 1 }, unique: true, name: "ux_drives_id" },
      { key: { owner_id: 1, personal: 1 }, name: "ix_drives_owner_personal" },
    ]),
    db.collection("drive_members").createIndexes([
      { key: { id: 1 }, unique: true, name: "ux_drive_members_id" },
      { key: { drive_id: 1, user_id: 1 }, unique: true, name: "ux_drive_members_drive_user" },
      { key: { user_id: 1, drive_id: 1 }, name: "ix_drive_members_user_drive" },
    ]),
    db.collection("folders").createIndexes([
      { key: { id: 1 }, unique: true, name: "ux_folders_id" },
      { key: { drive_id: 1, parent_folder_id: 1, created_at: -1 }, name: "ix_folders_drive_parent_created_desc" },
    ]),
    db.collection("drive_activity_logs").createIndexes([
      { key: { id: 1 }, unique: true, name: "ux_drive_activity_logs_id" },
      { key: { drive_id: 1, created_at: -1 }, name: "ix_drive_activity_logs_drive_created_desc" },
    ]),
    db.collection("bulk_shares").createIndexes([
      { key: { id: 1 }, unique: true, name: "ux_bulk_shares_id" },
      { key: { recipient_id: 1, created_at: -1 }, name: "ix_bulk_shares_recipient_created_desc" },
      { key: { owner_id: 1, created_at: -1 }, name: "ix_bulk_shares_owner_created_desc" },
      { key: { owner_id: 1, revoked_at: 1, expires_at: 1 }, name: "ix_bulk_shares_owner_revoked_expires" },
    ]),
  ]);

  indexesEnsured = true;
}

