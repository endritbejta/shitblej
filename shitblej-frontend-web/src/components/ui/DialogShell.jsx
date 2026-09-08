import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

/**
 * Minimal modal scaffolding shared by the offer dialogs: portal, backdrop,
 * Escape/backdrop close (blocked while busy), scroll lock, mobile bottom
 * sheet that becomes a centered card on sm+.
 */
export default function DialogShell({ title, subtitle, busy = false, onClose, children, label }) {
  const dialogRef = useRef(null);

  // `aria-modal` below tells a screen reader the page behind is inert; it does
  // not make Tab respect that. Without this, focus walked out of the dialog
  // into controls the user could not see.
  useFocusTrap(dialogRef, true);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, busy]);

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[110]"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={label || title}
    >
      <button
        aria-label="Close"
        onClick={() => !busy && onClose()}
        className="absolute inset-0 animate-fade-in bg-black/50 backdrop-blur-sm"
      />
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center">
        <div className="max-h-[90dvh] animate-slide-up overflow-y-auto rounded-t-card-lg border border-gray-200 bg-white p-5 shadow-overlay dark:border-zinc-800 dark:bg-zinc-900 sm:w-full sm:max-w-md sm:animate-scale-in sm:rounded-card-lg sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
              {subtitle && (
                <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
              )}
            </div>
            <button
              onClick={() => !busy && onClose()}
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
