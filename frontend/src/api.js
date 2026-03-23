// frontend/src/api.js
// Base URL for API and Socket — empty in dev (Vite proxy), set in prod for split-host
const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

export { API_BASE };
