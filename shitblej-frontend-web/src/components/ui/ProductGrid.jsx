import { PackageOpen } from "lucide-react";
import ProductCard, { ProductCardSkeleton } from "./ProductCard";
import EmptyState from "./EmptyState";
import { cn } from "../../utils/cn";

/**
 * Responsive product grid — the single grid used by the homepage rails,
 * collection pages and profile. Handles loading skeletons and empty state
 * so callers stay declarative.
 */
export default function ProductGrid({
  products = [],
  loading = false,
  skeletonCount = 10,
  emptyTitle = "Nothing here yet",
  emptyDescription = "Try adjusting your filters or check back soon.",
  emptyAction,
  className,
  // How many cards load eagerly. 5 suits a page where the grid starts near
  // the top (Collection, Search). A page whose grid sits below a full-height
  // hero should pass 0 - otherwise it forces five below-the-fold downloads
  // that compete with the LCP image.
  eagerCount = 5,
}) {
  const gridClass = cn(
    "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5",
    className
  );

  if (loading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <EmptyState
        icon={PackageOpen}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className={gridClass}>
      {products.map((product, index) => (
        <ProductCard
          key={product._id}
          product={product}
          index={index}
          priority={index < eagerCount}
        />
      ))}
    </div>
  );
}
