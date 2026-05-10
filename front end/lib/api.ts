import axios from 'axios';

// Prefer same-origin (empty baseURL) so requests hit Next.js and rewrites proxy to Express.
// Session cookies then stay on the app origin (e.g. localhost:3000) and auth works reliably.
// Set NEXT_PUBLIC_BACKEND_URL only if the API is on another host (e.g. production).
const envBackendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').trim();
const backendUrl = /:5002\b/.test(envBackendUrl) ? '' : envBackendUrl;

if (envBackendUrl && /:5002\b/.test(envBackendUrl)) {
  console.warn(
    'Ignoring NEXT_PUBLIC_BACKEND_URL on port 5002 (IPFS). ' +
      'Using same-origin API calls so Next rewrites can reach backend on port 5000.'
  );
}

const api = axios.create({
  baseURL: backendUrl,
  withCredentials: true,
});

export default api;
