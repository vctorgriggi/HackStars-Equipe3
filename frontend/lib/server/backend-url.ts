export function getBackendUrl(): string {
  const url = process.env.API_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "production") {
    throw new Error("API_URL não configurada (server-only, ver frontend/AUTH.md)");
  }
  return "http://localhost:3001";
}
