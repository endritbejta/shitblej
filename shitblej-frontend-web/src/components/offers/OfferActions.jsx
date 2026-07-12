import Button from "../ui/Button";

/**
 * Action row for a pending proposal. Which actions exist is decided by the
 * caller from backend data (actionsFor); this component only renders them
 * with proper busy/disabled behaviour.
 */
export default function OfferActions({ actions, busyAction, onAccept, onCounter, onDecline, onCancel }) {
  if (!actions.length) return null;
  const busy = !!busyAction;

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {actions.includes("accept") && (
        <Button size="sm" loading={busyAction === "accept"} disabled={busy} onClick={onAccept} className="flex-1">
          Accept
        </Button>
      )}
      {actions.includes("counter") && (
        <Button size="sm" variant="secondary" disabled={busy} onClick={onCounter} className="flex-1">
          Counter
        </Button>
      )}
      {actions.includes("decline") && (
        <Button size="sm" variant="ghost" loading={busyAction === "decline"} disabled={busy} onClick={onDecline} className="flex-1">
          Decline
        </Button>
      )}
      {actions.includes("cancel") && (
        <Button size="sm" variant="ghost" loading={busyAction === "cancel"} disabled={busy} onClick={onCancel} className="flex-1">
          Withdraw offer
        </Button>
      )}
    </div>
  );
}
