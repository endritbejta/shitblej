import { io } from "socket.io-client";

// Singleton authenticated socket. The backend authenticates the handshake
// with the same JWT as the REST API and joins each user to a room named
// after their id; all realtime traffic ("message", "notification") arrives
// through this one connection.

// Dev goes through the Vite proxy (same origin); production talks to the
// hosted backend directly, mirroring src/api/client.jsx.
const SOCKET_URL = import.meta.env.DEV ? "/" : "https://shitblej.onrender.com";

let socket = null;
let socketToken = null;

const currentToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

/**
 * Get the shared socket for the current session, (re)connecting if the auth
 * token changed. Returns null when logged out.
 */
export function getSocket() {
  const token = currentToken();
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
