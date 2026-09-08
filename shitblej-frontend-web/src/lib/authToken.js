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
const USER_KEY = "user";

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

// The last known profile for the signed-in user.
//
// Why persist it: the app cannot tell whether someone is signed in without
// asking the API, and that round-trip used to block the entire first paint.
// Hydrating from this cache lets the app render the correct chrome
// immediately and revalidate in the background, so a slow or cold backend
// costs nothing visible.
//
// This is the user's own profile, on their own device, sitting next to a token
// that already grants full access to it - so caching it exposes nothing new.
// It is cleared with the token whenever a session ends.
export function getCachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Anything without an id is unusable; treat it as absent rather than
    // handing components a half-object.
    return parsed && parsed._id ? parsed : null;
  } catch {
    return null;
  }
}

export function setCachedUser(user) {
  try {
    // Follow the token: whichever store holds it should hold the profile, so
    // "remember me" off means the profile dies with the tab too.
    const store = localStorage.getItem(KEY) ? localStorage : sessionStorage;
    if (user) {
      store.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(USER_KEY);
    }
  } catch {
    /* storage blocked - hydration simply will not happen next load */
  }
}

// End a session's stored state: the token AND the cached profile. Clearing one
// without the other would leave the app hydrating a user it cannot authenticate.
export function clearSession() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
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
