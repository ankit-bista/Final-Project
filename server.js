import dotenv from "dotenv";
dotenv.config();

import express from "express";
import session from "express-session";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import driveRoutes from "./routes/driveRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import blockchainRoutes from "./routes/blockchainRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import encryptionRoutes from "./routes/encryption.js";
import sharingRoutes from "./routes/sharing.js";
import { ensureUserRoleSchema } from "./services/userRoleService.js";
import { ensureCommentsSchema } from "./services/commentService.js";
import { ensureDbIndexes, pingDb } from "./services/database.js";

const app = express();
ensureUserRoleSchema().catch((err) => console.warn("Role schema init warning:", err?.message || err));
ensureCommentsSchema().catch((err) => console.warn("Comments schema init warning:", err?.message || err));
ensureDbIndexes().catch((err) => console.warn("DB index init warning:", err?.message || err));

// Next.js rewrites proxy to this server; trust X-Forwarded-* for cookies / sessions
app.set("trust proxy", 1);

// Allow any localhost / 127.0.0.1 port (Next dev may use 3000, 3001, 3002, …)
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        return cb(null, origin);
      }
      return cb(null, false);
    },
    credentials: true,
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.use(session({
  secret: process.env.SESSION_SECRET || "change-this-in-production-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.get("/health", (req, res) => {
  pingDb()
    .then(() => res.json({ ok: true, database: "connected" }))
    .catch((err) => {
      console.error("Health check DB error:", err);
      res.status(503).json({
        ok: false,
        database: "error",
        message: err.message || String(err),
      });
    });
});

app.use(authRoutes);
app.use(driveRoutes);
app.use(adminRoutes);
app.use(blockchainRoutes);
app.use(activityRoutes);
app.use("/api/encryption", encryptionRoutes);
app.use("/api/shares", sharingRoutes);

const PORT = process.env.PORT || 5000;
const ipfsApi = process.env.IPFS_API_URL || "http://127.0.0.1:5002/api/v0";
const ipfsGw = process.env.IPFS_GATEWAY_URL || "http://127.0.0.1:5002";

app.listen(PORT, () => {
  console.log("");
  console.log("=== Blockchain Drive backend (Node / Express) ===");
  console.log(`  API (login, files, uploads): http://127.0.0.1:${PORT}`);
  console.log(`  This is NOT IPFS. Keep this on a port different from Kubo (often 5002).`);
  console.log("");
  console.log("=== IPFS (Kubo daemon) — separate process ===");
  console.log(`  IPFS API:     ${ipfsApi}`);
  console.log(`  IPFS Gateway: ${ipfsGw}`);
  console.log("");
  console.log(`Node environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Blockchain mode: ${process.env.USE_REAL_CONTRACTS === "true" ? "real" : "mock"}`);
});
