import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMessages, sendMessage } from "../api/messages";
import { getSocket } from "../lib/socket";
import { queryKeys } from "../lib/queryClient";
import {
  buildTimeline,
  canLikelySendText,
  deriveNegotiation,
} from "../lib/negotiation";

const FALLBACK_POLL_MS = 15000;

const DEFAULT_LOCK = {
  message:
    "Messaging unlocks once an offer is accepted. Make an offer to start negotiating.",
};

/**
 * The message thread with one partner, as negotiation-aware state.
 *
 * - The thread is a cached query, so reopening a conversation renders from
 *   cache immediately and revalidates behind the already-drawn content. It
 *   used to clear the messages and show a skeleton on every switch, which
 *   flashed even for a thread you had open seconds earlier.
 * - Realtime: text messages for this thread are written straight into the
 *   cache; offer messages trigger a refetch (socket payloads carry the offer
 *   id, not its populated state - refetching is the honest way to stay in
 *   sync with accepts and counters from other devices).
 * - Falls back to polling only while the socket is down; resyncs on reconnect.
 * - The composer lock is a hint mirrored from the server policy
 *   (canLikelySendText); the server decides. sendText is optimistic and a 403
 *   with code "negotiation_required" replaces the hint with the server's own
 *   message.
 *
 * Returns raw messages plus derived (never stored) timeline + negotiation.
 */
export function useConversationMessages({ user, partnerId }) {
  const queryClient = useQueryClient();
  const key = useMemo(() => queryKeys.thread(partnerId), [partnerId]);

  const enabled = Boolean(user && partnerId);

  const {
    data: messages = [],
    isPending,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: key,
    queryFn: async () => (await getMessages(partnerId)).data || [],
    enabled,
  });

  // The server's own refusal, which overrides the mirrored hint below. Kept
  // separate so a 403 is not wiped out by the next successful read.
  const [serverLock, setServerLock] = useState(null);
  const [sendError, setSendError] = useState(null);

  // A different conversation starts with a clean slate: neither the previous
  // thread's refusal nor its send failure says anything about this one.
  useEffect(() => {
    setServerLock(null);
    setSendError(null);
  }, [partnerId]);

  const refresh = useCallback(() => {
    if (!enabled) return;
    refetch();
  }, [enabled, refetch]);

  // Realtime + reconnect resync + fallback polling while disconnected.
  useEffect(() => {
    if (!enabled) return;
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
        return;
      }
      // Append into the cache rather than local state, so the message is
      // still there when this conversation is reopened.
      queryClient.setQueryData(key, (prev = []) =>
        prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]
      );
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
  }, [enabled, user, partnerId, refresh, queryClient, key]);

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
      queryClient.setQueryData(key, (prev = []) => [...prev, optimistic]);

      try {
        const res = await sendMessage(partnerId, text);
        queryClient.setQueryData(key, (prev = []) =>
          prev.map((m) => (m._id === optimistic._id ? res.data : m))
        );
        setSendError(null);
        return true;
      } catch (err) {
        queryClient.setQueryData(key, (prev = []) =>
          prev.filter((m) => m._id !== optimistic._id)
        );
        if (err.response?.data?.code === "negotiation_required") {
          setServerLock({ message: err.response.data.error });
        } else {
          setSendError(err.response?.data?.error || "Message failed to send.");
        }
        return false;
      }
    },
    [user, partnerId, queryClient, key]
  );

  // Checkout links the accepted offer to an order. The caller clears the lock
  // immediately and refreshes; once the refetched offer carries its order,
  // the mirrored hint below agrees and stays open.
  const clearLock = useCallback(() => setServerLock(null), []);

  const timeline = useMemo(() => buildTimeline(messages), [messages]);
  const negotiation = useMemo(() => deriveNegotiation(messages), [messages]);

  // The server's refusal wins; otherwise mirror its policy from the thread.
  const lock = useMemo(() => {
    if (serverLock) return serverLock;
    return canLikelySendText(messages) ? null : DEFAULT_LOCK;
  }, [serverLock, messages]);

  return {
    messages,
    timeline,
    negotiation,
    // Only "loading" when there is nothing to show. A background revalidation
    // of a cached thread must not raise the skeleton over content the reader
    // is already looking at - that was the flash.
    loading: enabled && isPending,
    error: sendError || (queryError ? "Couldn’t load this conversation." : null),
    lock,
    clearLock,
    sendText,
    refresh,
  };
}
