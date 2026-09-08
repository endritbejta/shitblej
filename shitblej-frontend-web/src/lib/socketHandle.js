// Owns the live socket, without knowing how to make one.
//
// This module exists purely so that AuthContext can end a session without
// importing socket.io-client. AuthContext is in the entry bundle - every route
// needs it - and it imported ./socket for one call, `disconnectSocket()` on
// logout. That single import dragged socket.io-client AND engine.io into the
// entry chunk, where they were downloaded, parsed and executed before the
// first paint of every page, for a feature only the inbox uses.
//
// Splitting the handle from the factory keeps that call synchronous. Making
// `disconnectSocket` an async dynamic import would have worked too, but it
// would open a window between clearing the session and closing the connection,
// and would download socket.io on logout even for a visitor who never opened
// chat.
//
// Nothing here imports socket.io. ./socket.js registers the connection it
// creates; the only assumption is that the registered object has `.disconnect()`.

let socket = null;
let token = null;

/** The live socket, if one has been created and matches `forToken`. */
export function getRegisteredSocket(forToken) {
  if (!socket) return null;
  return token === forToken ? socket : null;
}

/** Called by ./socket.js when it creates a connection. */
export function registerSocket(instance, forToken) {
  socket = instance;
  token = forToken;
}

/**
 * Close the connection and forget it.
 *
 * Not optional on logout: the socket is authenticated for its lifetime and the
 * backend keeps the user joined to a room named after their id, so an open
 * connection keeps delivering the previous account's messages and
 * notifications into that tab until a reload.
 *
 * A no-op when no socket was ever created, which is the common case.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    token = null;
  }
}
