import { MessagesSquare } from "lucide-react";
import Button from "../ui/Button";

/** Shown in the chat pane when no conversation is selected. */
export default function ChatEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
        <MessagesSquare className="h-8 w-8" />
      </span>
      <h2 className="mt-5 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
        Your messages
      </h2>
      <p className="mt-1.5 max-w-xs text-sm text-gray-500 dark:text-gray-400">
        Pick a conversation to continue, or message a seller directly from any
        listing to get started.
      </p>
      <Button to="/" variant="secondary" size="sm" className="mt-6">
        Browse listings
      </Button>
    </div>
  );
}
