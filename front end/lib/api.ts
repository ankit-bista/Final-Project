import axios from 'axios';

// Call Express directly. Backend CORS allows localhost origins with credentials.
// Next.js rewrites are unreliable when an old dev server is cached on port 3000.
const envBackendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').trim();
const defaultBackendUrl = 'http://127.0.0.1:5000';

function resolveBackendUrl(): string {
  if (!envBackendUrl) return defaultBackendUrl;
  if (/:5002\b/.test(envBackendUrl)) {
    console.warn(
      'Ignoring NEXT_PUBLIC_BACKEND_URL on port 5002 (IPFS). Using Express on port 5000.'
    );
    return defaultBackendUrl;
  }
  return envBackendUrl;
}

const api = axios.create({
  baseURL: resolveBackendUrl(),
  withCredentials: true,
});

export default api;
