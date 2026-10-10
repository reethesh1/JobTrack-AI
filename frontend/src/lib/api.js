export const API_URL = (import.meta.env.VITE_API_URL || "https://jobtrack-ai-1-a4ie.onrender.com").replace(/\/$/, "");
export async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error("Could not reach the server. It may be waking up; wait a moment and try again.");
  }
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const detail = payload && typeof payload === "object" ? payload.detail : payload;
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return payload;
}
