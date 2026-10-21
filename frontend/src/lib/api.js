export const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://jobtrack-ai-1-a4ie.onrender.com"
).replace(/\/$/, "");

export const AUTH_TOKEN_KEY = "jobtrack_access_token";
export const AUTH_USER_KEY = "jobtrack_user";

export function getAccessToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function saveAuthSession(authData) {
  localStorage.setItem(AUTH_TOKEN_KEY, authData.access_token);

  localStorage.setItem(
    AUTH_USER_KEY,
    JSON.stringify({
      user_id: authData.user_id,
      email: authData.email,
      full_name: authData.full_name,
    })
  );
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getSavedUser() {
  try {
    const user = localStorage.getItem(AUTH_USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAccessToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Could not reach the server. It may be waking up; wait a moment and try again."
    );
  }

  const contentType = response.headers.get("content-type") || "";

  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const detail =
      payload && typeof payload === "object"
        ? payload.detail
        : payload;

    const message =
      typeof detail === "string"
        ? detail
        : detail
          ? JSON.stringify(detail)
          : `Request failed (${response.status})`;

    throw new Error(message);
  }

  return payload;
}