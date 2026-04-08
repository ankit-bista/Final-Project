import axios from 'axios';

// Prefer same-origin (empty baseURL) so requests hit Next.js and rewrites proxy to Express.
// Session cookies then stay on the app origin (e.g. localhost:3000) and auth works reliably.
// Set NEXT_PUBLIC_BACKEND_URL only if the API is on another host (e.g. production).
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: backendUrl,
  withCredentials: true,
});

export default api;
