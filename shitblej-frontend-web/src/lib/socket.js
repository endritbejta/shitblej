import { io } from "socket.io-client";
import { SOCKET_URL } from "./config";
import { getToken } from "./authToken";
import {
  disconnectSocket,
  getRegisteredSocket,
  registerSocket,
} from "./socketHandle";

// Singleton authenticated socket. The backend authenticates the handshake
// with the same JWT as the REST API and joins each user to a room named
// after their id; all realtime traffic ("message", "notification") arrives
// through this one connection.
//
// The connection itself is held by ./socketHandle.js, which imports nothing.
// That is what keeps socket.io-client out of the entry bundle: AuthContext
// needs to close the socket on logout and can now do so without pulling the
// client library into every page load. Only this module imports socket.io, and
// only the inbox imports this module, so both land in the inbox chunk.
//
// disconnectSocket() MUST be called on logout - see socketHandle.js for why.

/**
 * Get the shared socket for the current session, (re)connecting if the auth
 * token changed. Returns null when logged out.
 */
export function getSocket() {
  const token = getToken();
  if (!token) {
    disconnectSocket();
    return null;
  }

  const existing = getRegisteredSocket(token);
  if (existing) return existing;

  // Either there is no socket, or it is authenticated with a stale token.
  disconnectSocket();

  const socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionDelayMax: 10000,
  });
  registerSocket(socket, token);
  return socket;
}

// Re-exported so existing callers keep the same import surface.
export { disconnectSocket };
