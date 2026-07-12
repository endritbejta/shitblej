import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMessages, sendMessage } from "../api/messages";
import { getSocket } from "../lib/socket";
import { buildTimeline, deriveNegotiation } from "../lib/negotiation";

const FALLBACK_POLL_MS = 15000;

/**
 * The message thread with one partner, as negotiation-aware state.
 *
 * - Fetches the thread (offer messages arrive populated with live offers).
 * - Realtime: text messages for this thread are appended from the socket;
 *   offer messages trigger a refetch (socket payloads carry the offer id,
 *   not its populated state — refetching is the honest way to stay in sync
 *   with accepts/counters from other devices).
 * - Falls back to polling only while the socket is down; resyncs on reconnect.
 * - sendText is optimistic and honours the backend messaging policy: a 403
 *   with reason "negotiation_required" locks the composer with the server's
 *   own message.
 *
 * Returns raw messages plus derived (never stored) timeline + negotiation.
 */
export function useConversationMessages({ user, partnerId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // { message } when the backend refused free text (policy), else null.
  const [lock, setLock] = useState(null);
  const partnerRef = useRef(partnerId);
  partnerRef.current = partnerId;

  const refresh = useCallback(async () => {
    if (!user || !partnerRef.current) return;
    try {
      const res = await getMessages(partnerRef.current);
      setMessages(res.data || []);
      setError(null);
    } catch (err) {
      setError(
        err.response?.data?.error || "Couldn’t load this conversation."
      );
    }
  }, [user]);

  // Initial load per partner.
  useEffect(() => {
    if (!user || !partnerId) return;
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setLock(null);
    (async () => {
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, partnerId, refresh]);

  // Realtime + reconnect resync + fallback polling while disconnected.
  useEffect(() => {
    if (!user || !partnerId) return;
    const socket = getSocket();
    let pollId = null;

    const startPolling = () => {
      if (!pollId) pollId = setInterval(refresh, FALLBACK_POLL_MS);
    };
    const stopPolling = () => {
      if (pollId) {
        clearInterval(pollId);
        pollId = null;
      }
    };

    const belongsToThread = (msg) => {
      const sender = String(msg.sender?._id || msg.sender);
      const receiver = String(msg.receiver?._id || msg.receiver);
      return (
        (sender === String(partnerId) && receiver === String(user._id)) ||
        (sender === String(user._id) && receiver === String(partnerId))
      );
    };

    const onMessage = (msg) => {
      if (!belongsToThread(msg)) return;
      if (msg.type === "offer") {
        // Live offer state isn't in the socket payload — resync.
        refresh();
      } else {
        setMessages((prev) =>
          prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]
        );
      }
    };

    if (socket) {
      socket.on("message", onMessage);
      socket.on("connect", refresh); // resync after reconnect
      socket.on("disconnect", startPolling);
      socket.io.on("reconnect", stopPolling);
      if (!socket.connected) startPolling();
    } else {
      startPolling();
    }

    return () => {
      stopPolling();
      if (socket) {
        socket.off("message", onMessage);
        socket.off("connect", refresh);
        socket.off("disconnect", startPolling);
        socket.io.off("reconnect", stopPolling);
      }
    };
  }, [user, partnerId, refresh]);

  const sendText = useCallback(
    async (text) => {
      const optimistic = {
        _id: `tmp-${Date.now()}`,
        type: "text",
        text,
        sender: user._id,
        receiver: partnerId,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      try {
        const res = await sendMessage(partnerId, text);
        setMessages((prev) =>
          prev.map((m) => (m._id === optimistic._id ? res.data : m))
        );
        return true;
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
        if (err.response?.data?.reason === "negotiation_required") {
          setLock({ message: err.response.data.error });
        } else {
          setError(err.response?.data?.error || "Message failed to send.");
        }
        return false;
      }
    },
    [user, partnerId]
  );

  // A successful negotiation step can change the policy — clear the lock and
  // let the next attempt re-check.
  const clearLock = useCallback(() => setLock(null), []);

  const timeline = useMemo(() => buildTimeline(messages), [messages]);
  const negotiation = useMemo(() => deriveNegotiation(messages), [messages]);

  return {
    messages,
    timeline,
    negotiation,
    loading,
    error,
    lock,
    clearLock,
    sendText,
    refresh,
  };
}
