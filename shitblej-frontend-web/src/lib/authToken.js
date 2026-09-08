// The auth token, in one place.
//
// It lives in localStorage when "remember me" is on and sessionStorage
// otherwise, and three separate modules used to reach into both stores
// directly (the API client, the socket, AuthContext). One home means the
// storage choice can change - to httpOnly cookies, say - without hunting
// through call sites.
//
// Every access is wrapped: reading or writing storage throws outright in
// browsers configured to block site data, and losing a token is not worth a
// blank page.

const KEY = "token";

export function getToken() {
  try {
    const token = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
    // Guard against the literal strings a bad write can leave behind.
    return token && token !== "undefined" && token !== "null" ? token : null;
  } catch {
    return null;
  }
}

export function setToken(token, { remember = true } = {}) {
  try {
    if (remember) {
      localStorage.setItem(KEY, token);
      sessionStorage.removeItem(KEY);
    } else {
      sessionStorage.setItem(KEY, token);
      localStorage.removeItem(KEY);
    }
  } catch {
    /* storage blocked - the session stays in memory for this tab */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

// Broadcast when the API sees a 401, so React can drop the session without the
// interceptor (which lives outside the tree) reaching into it or forcing a
// full page reload. AuthContext listens for this.
export const UNAUTHORIZED_EVENT = "auth:unauthorized";

export function notifyUnauthorized() {
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}
