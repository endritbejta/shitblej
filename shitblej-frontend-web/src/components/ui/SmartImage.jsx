import { useLayoutEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "../../utils/cn";

// via.placeholder.com no longer resolves at all, and the backend hands it out
// as the default avatar for every user who has not uploaded one (see
// users/user.model.js and messages/message.service.js). Rendering it produced
// an <img> that could never load, so this component held it at opacity 0
// indefinitely - onLoad never fires, and onError only fires once the
// connection gives up. The result was an empty box where an avatar should be.
// Treating it as "no image" shows the real fallback at once and drops a
// request that always fails.
const DEAD_PLACEHOLDER = /\/\/via\.placeholder\.com\//;

const isUsable = (src) => Boolean(src) && !DEAD_PLACEHOLDER.test(src);

/**
 * Image with a graceful loading fade and a fallback when the src is missing
 * or fails to load. Lazy + async-decoded by default for smooth scrolling.
 *
 * The fade is for images the viewer genuinely waits for. An image the browser
 * already has skips it: `loadedSrc` is seeded from the element's own
 * `complete` flag in a layout effect, so the opacity-0 state is never painted.
 *
 * Without that, any remount replayed the full 500ms fade over an image whose
 * bytes were already local - which is what made switching chat threads flash.
 * Inbox gave ChatWindow a `key`, so every avatar and offer thumbnail in the
 * thread was a brand-new element on each switch: grey shimmer, then a
 * half-second fade, every time.
 *
 * State is keyed by src rather than reset in an effect, so changing the src
 * can never leave the previous image showing as if it were the new one, and
 * there is no ordering race between resetting and seeding.
 */
export default function SmartImage({
  src,
  alt = "",
  className,
  wrapperClassName,
  loading = "lazy",
  ...props
}) {
  const imgRef = useRef(null);
  const [loadedSrc, setLoadedSrc] = useState(null);
  const [failedSrc, setFailedSrc] = useState(null);

  const usable = isUsable(src);
  const loaded = usable && loadedSrc === src;
  const failed = usable && failedSrc === src;

  // Runs before paint, so a cached image is never shown at opacity 0 first.
  // `complete` and `naturalWidth` are not layout properties, so reading them
  // here forces no reflow.
  useLayoutEffect(() => {
    if (!usable) return;
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setLoadedSrc(src);
  }, [src, usable]);

  if (!usable || failed) {
    return (
      // Sized by `wrapperClassName` alone. It used to take `className` as
      // well, but that is the <img>'s class - every caller passes something
      // like "h-full w-full object-cover" there, which beat the wrapper's own
      // "h-10 w-10" and stretched the fallback to fill its flex parent. The
      // chat header's 40x40 avatar came out 690px wide. Every caller sizes
      // the wrapper, so this is the correct single source.
      //
      // `div role="img"` rather than `<picture aria-label>`: a <picture> has
      // no role of its own, so the label was announced by nothing.
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex items-center justify-center bg-gray-100 text-gray-300 dark:bg-zinc-800 dark:text-zinc-600",
          wrapperClassName
        )}
      >
        <ImageOff className="h-1/2 w-1/2 max-h-6 max-w-6" />
      </div>
    );
  }

  return (
    // The placeholder is the wrapper's own background, not a child.
    //
    // It used to be `<div className="skeleton absolute inset-0" />` inside a
    // wrapper with no positioning, so `inset-0` resolved against some distant
    // positioned ancestor and `overflow-hidden` then clipped it away
    // completely - every skeleton in the app measured 0x0. Images were popping
    // in from blank rather than from a placeholder.
    //
    // `.skeleton` brings its own `relative`, and it is defined in
    // @layer components, so the two callers that position the wrapper
    // themselves (`wrapperClassName="absolute inset-0 ..."`) still win - a
    // utility always beats a component class. A hardcoded `relative` here
    // would not have: `cn` is a plain join, not tailwind-merge.
    <div className={cn("overflow-hidden", !loaded && "skeleton", wrapperClassName)}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={() => setLoadedSrc(src)}
        onError={() => setFailedSrc(src)}
        className={cn(
          "transition-opacity duration-500 ease-premium",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...props}
      />
    </div>
  );
}
