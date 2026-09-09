import { cn } from "../utils/cn";

// Keyboard shortcuts past the header, for anyone who does not use a mouse.
//
// NO JAVASCRIPT, BY DESIGN
// An `<a href="#id">` moves the browser's sequential focus navigation starting
// point, and `tabindex="-1"` on the target makes the target itself focusable so
// it genuinely receives focus rather than only being scrolled to. That is the
// whole mechanism. Tab reaches the links and Enter activates them because these
// are ordinary links, not widgets.
//
// WHERE IT LIVES
// The first child of the fixed <header>, which both AppLayout and ProductDetail
// render - so one component covers both layouts and these are the first
// focusable elements on the page.
//
// WHY TWO OF THE THREE ARE DESKTOP-ONLY
// A skip link whose target is `display: none` does nothing: focus stays put and
// the user is left wondering whether the key registered. Two targets only exist
// at md and up, so the links match them exactly:
//
//   #main-content     <main>                          always
//   #search           the desktop search trigger      md+ (mobile uses an icon
//                                                     button in a different
//                                                     container)
//   #main-navigation  CategoryNav's <nav>, hidden md:block   md+
//
// `hidden` is what does the scoping, not `sr-only`: sr-only sets no `display`,
// so it hides an element visually while leaving it focusable. Only
// `display: none` takes it out of the tab order.
//
// On a phone the header is a single 64px row with four controls, so there is no
// repetitive block to skip - which is the entire point of a skip link.

// Visually hidden, fully focusable, and a clearly visible control once focused.
// index.css sets `:focus { outline: none }` app-wide, so the indicator has to be
// drawn here: a 2px brand border and the app's own focus ring, on an opaque
// background so it reads against the header behind it.
const VISUALS = cn(
  "sr-only focus:not-sr-only",
  "focus:pointer-events-auto focus:m-2 focus:items-center focus:whitespace-nowrap",
  "focus:rounded-lg focus:border-2 focus:border-brand-600 focus:bg-white",
  "focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-700",
  "focus:shadow-overlay focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2",
  "focus:ring-offset-white",
  "dark:focus:border-brand-400 dark:focus:bg-zinc-900 dark:focus:text-brand-400",
  "dark:focus:ring-offset-black"
);

export default function SkipLinks() {
  return (
    // Absolutely positioned so a focused link cannot shift the layout, and
    // pointer-events-none so a mouse can never catch the 1px hidden boxes.
    <div className="pointer-events-none absolute left-0 top-0 z-10 flex w-full items-start">
      <a href="#main-content" className={cn("inline-flex", VISUALS)}>
        Skip to main content
      </a>
      <a href="#search" className={cn("hidden md:inline-flex", VISUALS)}>
        Skip to search
      </a>
      <a href="#main-navigation" className={cn("hidden md:inline-flex", VISUALS)}>
        Skip to main navigation
      </a>
    </div>
  );
}
