import { useEffect, useRef } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Mobile bottom sheet. Slides up over a dimmed backdrop, locks page scroll,
 * closes on backdrop click / Escape. Content scrolls if it overflows.
 */
export default function BottomSheet({ open, onClose, title, children, footer }) {
  const sheetRef = useRef(null);

  // Only while open: the sheet stays mounted when closed on some routes, and
  // trapping focus into a hidden surface would strand the keyboard.
  useFocusTrap(sheetRef, open);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Portal to body so the fixed overlay escapes any transform/backdrop-filter
  // containing block (e.g. the sticky, blurred toolbar it's triggered from).
  return createPortal(
    <div
      ref={sheetRef}
      className="fixed inset-0 z-[100] md:hidden"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/50 backdrop-blur-sm"
      />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-card-lg border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-overlay dark:border-zinc-800 dark:bg-zinc-900"
        style={{ animation: "slide-up 0.28s cubic-bezier(0.22,1,0.36,1)" }}
      >
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-gray-300 dark:bg-zinc-700" />
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-2">{children}</div>
        {footer && (
          <div className="border-t border-gray-100 px-5 py-3 dark:border-zinc-800">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
