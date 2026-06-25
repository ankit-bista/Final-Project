import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
loadEnvConfig(repoRoot);

const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:5000";

if (process.env.BACKEND_URL && /:5002\b/.test(process.env.BACKEND_URL)) {
  console.warn(
    "\n[WARNING] BACKEND_URL uses port 5002 — that is usually IPFS (Kubo), not the Node API.\n" +
      "Set BACKEND_URL to your Express server (default http://127.0.0.1:5000). IPFS stays on IPFS_API_URL.\n"
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      { source: '/auth/:path*', destination: `${backendUrl}/auth/:path*` },
      { source: '/files/:path*', destination: `${backendUrl}/files/:path*` },
      { source: '/files', destination: `${backendUrl}/files` },
      { source: '/upload', destination: `${backendUrl}/upload` },
      { source: '/delete/:path*', destination: `${backendUrl}/delete/:path*` },
      { source: '/share/:path*', destination: `${backendUrl}/share/:path*` },
      { source: '/drive/:path*', destination: `${backendUrl}/drive/:path*` },
      { source: '/share-target', destination: `${backendUrl}/share-target` },
      { source: '/shared-with-me', destination: `${backendUrl}/shared-with-me` },
      { source: '/shares/:path*', destination: `${backendUrl}/shares/:path*` },
      { source: '/notifications/:path*', destination: `${backendUrl}/notifications/:path*` },
      { source: '/me', destination: `${backendUrl}/me` },
      { source: '/health', destination: `${backendUrl}/health` },
      { source: '/blockchain/:path*', destination: `${backendUrl}/blockchain/:path*` },
      { source: '/l/:path*', destination: `${backendUrl}/l/:path*` },
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
    ];
  },
}

export default nextConfig
