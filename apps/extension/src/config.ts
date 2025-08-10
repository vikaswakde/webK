// Centralized API endpoint for the extension.
// Use Vite env var if provided; otherwise default to the deployed backend.
export const API_URL: string =
  (import.meta as any)?.env?.VITE_WEBK_API_URL ?? 'https://web-k-backend.vercel.app/api/ask';


