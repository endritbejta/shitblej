import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "../../utils/cn";
import { buildSrcSet, imageAtWidth } from "../../lib/imageUrl";

/**
 * Image with a graceful loading fade and a fallback when the src is missing
 * or fails to load. Lazy + async-decoded by default for smooth scrolling.
 *
 * Responsive delivery: pass `widths` (a candidate ladder from lib/imageUrl's
 * WIDTHS) and `sizes` (how wide the slot actually is in CSS) and this asks the
 * image host for the size being drawn instead of whatever is stored. Product
 * images are capped at 1200px by the upload transformation, so a card ~250px
 * wide was downloading roughly five times the pixels it displayed.
 *
 * `sizes` is what makes it DPR-aware - the browser multiplies the slot width
 * by its own devicePixelRatio before choosing a candidate - so there is
 * nothing device-specific to configure here.
 *
 * Hosts that cannot resize on delivery (a local /uploads path under
 * UPLOAD_DRIVER=local, a data URI, an unknown CDN) get no srcset at all and
 * the original `src`, so this can never be the reason an image stops loading.
 */
export default function SmartImage({
  src,
  alt = "",
  className,
  wrapperClassName,
  loading = "lazy",
  widths,
  sizes,
  ...props
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <picture
        className={cn(
          "flex items-center justify-center bg-gray-100 text-gray-300 dark:bg-zinc-800 dark:text-zinc-600",
          wrapperClassName,
          className
        )}
        aria-label={alt}
      >
        <ImageOff className="h-6 w-6" />
      </picture>
    );
  }

  const srcSet = buildSrcSet(src, widths);
  // With a srcset, `src` is only the fallback for browsers that ignore it, so
  // it should be a middle candidate rather than the stored original.
  const resolvedSrc = srcSet ? imageAtWidth(src, widths[Math.floor(widths.length / 2)]) : src;

  return (
    <div className={cn("overflow-hidden", wrapperClassName)}>
      {!loaded && <div className="skeleton absolute inset-0" />}
      <img
        src={resolvedSrc}
        srcSet={srcSet || undefined}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
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
