import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SectionHeader from "../ui/SectionHeader";
import ProductCard, { ProductCardSkeleton } from "../ui/ProductCard";
import { cn } from "../../utils/cn";

/**
 * Horizontally scrolling product rail with snap + desktop arrow controls.
 * Cards keep the exact grid card design, just constrained to a rail width.
 */
export default function ProductRail({
  eyebrow,
  title,
  subtitle,
  actionLabel,
  actionTo,
  products = [],
  loading = false,
  skeletonCount = 6,
}) {
  const scroller = useRef(null);

  const scrollBy = (dir) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const itemClass = "w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-[22%] xl:w-[19%]";

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          actionLabel={actionLabel}
          actionTo={actionTo}
          className="flex-1"
        />
        <div className="hidden shrink-0 gap-2 sm:flex">
          {[-1, 1].map((dir) => (
            <button
              key={dir}
              onClick={() => scrollBy(dir)}
              aria-label={dir < 0 ? "Scroll left" : "Scroll right"}
              className="grid h-10 w-10 place-items-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900 dark:border-zinc-800 dark:text-gray-300 dark:hover:border-zinc-700 dark:hover:text-white"
            >
              {dir < 0 ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={scroller}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:gap-4 sm:px-0"
      >
        {(loading ? Array.from({ length: skeletonCount }) : products).map((product, i) => (
          <div key={product?._id ?? i} className={cn(itemClass)}>
            {loading ? (
              <ProductCardSkeleton />
            ) : (
              <ProductCard product={product} index={i} priority={i < 4} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
