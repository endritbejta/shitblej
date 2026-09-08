import { cn } from "../../utils/cn";

/**
 * Indeterminate loading indicator: a brand-green arc rotating over a faint
 * track.
 *
 * Replaces the three bouncing dots. Two reasons, one of them a bug:
 *
 * 1. The dots never staggered. They used Tailwind's `delay-[150ms]`, which
 *    sets `transition-delay` - `animate-bounce` is an animation, so it reads
 *    `animation-delay` and ignored it entirely. All three bounced in unison.
 * 2. `animate-bounce` is Tailwind's scroll-hint bounce: a 1s exaggerated hop.
 *    Three of them in sync read as a toy, not as a marketplace waiting on its
 *    API.
 *
 * A rotating arc is the right shape for indeterminate work - constant speed,
 * no implied progress, legible at any size - and it is pure `transform`, so it
 * stays smooth on a main thread busy parsing the very chunk this spinner is
 * waiting for. That is also why it is a CSS animation rather than a JS one:
 * rAF-driven motion stutters exactly when a loader is on screen.
 *
 * Decorative by design: `aria-hidden`, because every use pairs it with real
 * text ("Loading...", "Searching...") that carries the announcement. A
 * `role="status"` here too would say it twice.
 */

const SIZES = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-9 w-9",
};

// Thicker stroke on the large size, or the arc looks thin and weedy at 36px.
const STROKES = {
  sm: "border-2",
  md: "border-2",
  lg: "border-[3px]",
};

// Track and arc are coloured separately on purpose. Deriving the track from
// the arc's own hue at low opacity looked right on paper and failed on screen:
// brand green at 20% is invisible on white AND on near-black, so the arc read
// as a dash floating in space rather than a segment of a ring. The track needs
// its own low-contrast neutral.
//
// One colour, not a palette. The component this replaced carried
// green/white/gray/black variants and nothing ever passed `color` - dead API
// that still had to be read and maintained. A spinner on a dark or brand
// surface is a real future need; adding that variant when something actually
// needs it is cheaper than guessing at it now.
const TRACK = "border-gray-200 dark:border-zinc-700";
const ARC = "border-t-brand-500";

export default function Spinner({ size = "md", className }) {
  const box = SIZES[size] || SIZES.md;
  const stroke = STROKES[size] || STROKES.md;

  return (
    <span aria-hidden="true" className={cn("relative inline-block", box, className)}>
      {/* Track: the full circle, so the arc reads as a segment of something
          rather than a dash floating in space. */}
      <span className={cn("absolute inset-0 rounded-full", stroke, TRACK)} />

      {/* The arc. `motion-safe` gates the rotation; under reduced motion it
          breathes in place instead - gentler, not absent, because the user
          still needs to know something is happening.

          `data-loader-arc` is not decoration: index.css applies a blanket
          `animation-duration: 0.001ms !important` under reduced motion, which
          would crush the pulse too and leave a static ring. That attribute is
          the hook for the exemption, and Spinner.test.jsx guards it. */}
      <span
        data-loader-arc
        className={cn(
          "absolute inset-0 rounded-full border-transparent",
          stroke,
          ARC,
          "motion-safe:animate-spin motion-reduce:animate-loader-pulse"
        )}
      />
    </span>
  );
}
