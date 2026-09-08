import Spinner from './ui/Spinner';

/**
 * Standard loading block: spinner plus a line of copy.
 *
 * The whole block carries `animate-loader-in`, which holds it at opacity 0 for
 * 240ms before fading in. That delay is the feature - most of these loads
 * finish inside it, so the user never sees a spinner flash for work they did
 * not perceive as waiting. Anything slower than a blink still gets a clear
 * indicator.
 *
 * `role="status"` sits here rather than on the spinner: the visible message is
 * what a screen reader should read, and `aria-live="polite"` announces it
 * without interrupting whatever the user is doing.
 */
export default function Loading({ fullScreen = false, message = "Loading..." }) {
    return (
        <div
            role="status"
            aria-live="polite"
            className={
                fullScreen
                    ? "min-h-screen flex flex-col items-center justify-center gap-4 animate-loader-in"
                    : "flex flex-col items-center justify-center gap-4 py-12 animate-loader-in"
            }
        >
            <Spinner size={fullScreen ? "lg" : "md"} />
            {message && (
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{message}</p>
            )}
        </div>
    );
}
