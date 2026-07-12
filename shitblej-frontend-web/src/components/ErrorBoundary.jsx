import { Component } from "react";
import { AlertCircle } from "lucide-react";
import Button from "./ui/Button";

/**
 * Catch render errors in a subtree and offer recovery instead of a white
 * screen. Kept intentionally small; wrap feature areas (chat, PDP dialogs).
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error("ErrorBoundary:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-red-500/10 text-red-500">
          <AlertCircle className="h-6 w-6" />
        </span>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">Something went wrong</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Reload this section to continue.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => this.setState({ error: null })}>
          Try again
        </Button>
      </div>
    );
  }
}
