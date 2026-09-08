import { Component } from "react";

// Deliberately dependency-free below React itself: no Button, no icon set.
// A fallback that imports the app's component library cannot render when the
// component library is what failed - and pulling those imports in at the root
// also dragged them into the entry chunk, costing every first paint.

// A failed dynamic import is the common production case: every page is
// lazy(), so a deploy that replaces the JS bundles mid-session leaves an open
// tab asking for chunks that no longer exist. Re-rendering cannot fix that -
// only a reload fetches the new index - so the recovery offered has to differ.
const isChunkLoadError = (error) => {
  const message = `${error?.name || ""} ${error?.message || ""}`;
  return (
    /ChunkLoadError/i.test(message) ||
    /Loading chunk|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(
      message
    )
  );
};

/**
 * Catch render errors in a subtree and offer recovery instead of a white
 * screen. Used at the app root (App.jsx) and around feature areas that can
 * fail independently, such as chat.
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
    const { error } = this.state;
    if (!error) return this.props.children;

    const staleBundle = isChunkLoadError(error);

    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <span
          aria-hidden="true"
          className="grid h-12 w-12 place-items-center rounded-full bg-red-500/10 text-2xl leading-none text-red-500"
        >
          !
        </span>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">
            {staleBundle ? "A new version is available" : "Something went wrong"}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {staleBundle
              ? "Reload to get the latest version of the app."
              : "Reload this section to continue."}
          </p>
        </div>
        <button
          type="button"
          onClick={
            staleBundle
              ? () => window.location.reload()
              : () => this.setState({ error: null })
          }
          className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
        >
          {staleBundle ? "Reload" : "Try again"}
        </button>
      </div>
    );
  }
}
