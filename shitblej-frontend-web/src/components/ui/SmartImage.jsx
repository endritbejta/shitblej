import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * Image with a graceful loading fade and a fallback when the src is missing
 * or fails to load. Lazy + async-decoded by default for smooth scrolling.
 */
export default function SmartImage({
  src,
  alt = "",
  className,
  wrapperClassName,
  loading = "lazy",
  ...props
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gray-100 text-gray-300 dark:bg-zinc-800 dark:text-zinc-600",
          wrapperClassName,
          className
        )}
        aria-label={alt}
      >
        <ImageOff className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden", wrapperClassName)}>
      {!loaded && <div className="skeleton absolute inset-0" />}
      <img
        src={src}
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
