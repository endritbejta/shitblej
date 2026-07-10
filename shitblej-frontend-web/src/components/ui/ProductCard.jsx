import { memo } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star } from "lucide-react";
import SmartImage from "./SmartImage";
import Skeleton from "./Skeleton";
import WishlistButton from "./WishlistButton";
import { cn } from "../../utils/cn";

/**
 * The product card — the atom every grid and rail is built from.
 * Visuals are lifted straight from the PDP: rounded-card surface, condition
 * chip, bold green price, hover elevation. Works in both fixed grids and
 * horizontal rails (pass a width via className).
 */
function ProductCardComponent({ product, index = 0, priority = false, className }) {
  const id = product._id;
  const image = product.images?.[0] || product.image;
  const rating = product.user?.rating || product.seller?.rating || 0;

  return (
    <Link
      to={`/products/${id}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-card border border-gray-200 bg-white",
        "shadow-card transition-all duration-250 ease-premium hover:-translate-y-1 hover:shadow-card-hover",
        "dark:border-zinc-800 dark:bg-zinc-900",
        "opacity-0 animate-slide-up motion-reduce:opacity-100 motion-reduce:animate-none",
        className
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 55}ms` }}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <SmartImage
          src={image}
          alt={product.name}
          loading={priority ? "eager" : "lazy"}
          wrapperClassName="h-full w-full"
          className="h-full w-full object-cover transition-transform duration-500 ease-premium group-hover:scale-[1.04]"
        />

        {product.condition && (
          <span className="absolute left-3 top-3 rounded-full border border-white/60 bg-white/85 px-2.5 py-1 text-[11px] font-medium text-gray-900 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-white">
            {product.condition}
          </span>
        )}

        <WishlistButton product={product} variant="overlay" className="absolute right-3 top-3" />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-[15px] font-semibold text-gray-900 dark:text-white">
            {product.name}
          </h3>
          <p className="whitespace-nowrap text-[15px] font-bold text-brand-600 dark:text-brand-500">
            ${product.price}
          </p>
        </div>

        {product.description && (
          <p className="line-clamp-1 text-[13px] text-gray-500 dark:text-gray-400">
            {product.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-500" />
            <span className="truncate">{product.location || product.address || "Kosovo"}</span>
          </span>
          {rating > 0 && (
            <span className="flex items-center gap-1 text-amber-500">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {rating.toFixed(1)}
              </span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

const ProductCard = memo(ProductCardComponent);

/** Matching skeleton so grids reserve the exact card footprint while loading. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-card border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <Skeleton rounded="rounded-none" className="aspect-[4/5] w-full" />
      <div className="flex flex-col gap-2 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-3 w-full" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
