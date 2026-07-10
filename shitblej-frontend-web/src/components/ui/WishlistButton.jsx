import { useState } from "react";
import { Heart } from "lucide-react";
import { useWishlist } from "../../context/WishlistContext";
import { cn } from "../../utils/cn";

/**
 * The one heart button used everywhere (cards, PDP, search). Reads/writes the
 * shared wishlist so state stays in sync across every surface, and plays a
 * subtle pop micro-interaction on toggle.
 *
 * `variant`: "overlay" (on imagery) | "surface" (on a panel/PDP).
 */
export default function WishlistButton({
  product,
  variant = "overlay",
  size = "md",
  className,
  stopNavigation = true,
}) {
  const { isSaved, toggle } = useWishlist();
  const [popping, setPopping] = useState(false);
  const saved = isSaved(product?._id);

  const onClick = (e) => {
    if (stopNavigation) {
      e.preventDefault();
      e.stopPropagation();
    }
    toggle(product);
    setPopping(true);
  };

  const box = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const icon = size === "lg" ? "h-5 w-5" : size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

  const variants = {
    overlay:
      "border border-white/50 bg-black/25 text-white backdrop-blur-md hover:bg-black/40",
    surface:
      "bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:bg-zinc-800 dark:hover:bg-red-900/20",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={saved}
      className={cn(
        "grid shrink-0 place-items-center rounded-full transition-all duration-250 ease-premium active:scale-90",
        box,
        variants[variant],
        className
      )}
    >
      <Heart
        onAnimationEnd={() => setPopping(false)}
        className={cn(
          icon,
          "transition-colors duration-200",
          popping && "animate-heart-pop",
          saved
            ? "fill-red-500 text-red-500"
            : variant === "surface" && "text-gray-400"
        )}
      />
    </button>
  );
}
