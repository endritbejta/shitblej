import { io } from "socket.io-client";
import { SOCKET_URL } from "./config";
import { getToken } from "./authToken";

// Singleton authenticated socket. The backend authenticates the handshake
// with the same JWT as the REST API and joins each user to a room named
// after their id; all realtime traffic ("message", "notification") arrives
// through this one connection.
//
// disconnectSocket() MUST be called on logout: the connection is authenticated
// for the life of the socket and the user stays joined to a room named after
// their id, so leaving it open means the previous account keeps receiving
// messages and notifications in that tab until a reload. See AuthContext.

let socket = null;
let socketToken = null;

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
  if (socket && socketToken === token) return socket;

  disconnectSocket();
  socketToken = token;
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionDelayMax: 10000,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketToken = null;
  }
}
