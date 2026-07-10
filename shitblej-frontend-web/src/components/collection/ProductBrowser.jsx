import { useEffect, useState } from "react";
import { SearchX } from "lucide-react";
import CollectionToolbar from "./CollectionToolbar";
import ProductGrid from "../ui/ProductGrid";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";
import { useProductFilters } from "../../hooks/useProductFilters";

const PAGE_SIZE = 15;

/**
 * The browsing surface shared by collection and search pages: a sticky
 * filter/sort toolbar, a responsive grid, incremental "load more" reveal and
 * filter-aware empty states.
 */
export default function ProductBrowser({ products, loading, emptyTitle, emptyDescription }) {
  const {
    filters,
    filtered,
    availableConditions,
    activeCount,
    setSort,
    toggleCondition,
    setPrice,
    clear,
  } = useProductFilters(products);

  const [visible, setVisible] = useState(PAGE_SIZE);

  // Reset the reveal window whenever the filtered result set changes.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [filters, products]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-14" />
        <ProductGrid loading skeletonCount={15} />
      </div>
    );
  }

  const shown = filtered.slice(0, visible);
  const hasFilters = activeCount > 0;

  return (
    <div className="space-y-6">
      <CollectionToolbar
        resultCount={filtered.length}
        filters={filters}
        availableConditions={availableConditions}
        activeCount={activeCount}
        setSort={setSort}
        toggleCondition={toggleCondition}
        setPrice={setPrice}
        clear={clear}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={hasFilters ? "No matches for these filters" : emptyTitle}
          description={hasFilters ? "Try removing a filter to see more results." : emptyDescription}
          action={hasFilters ? <Button variant="secondary" onClick={clear}>Clear filters</Button> : undefined}
        />
      ) : (
        <>
          <ProductGrid products={shown} />

          {visible < filtered.length && (
            <div className="flex flex-col items-center gap-3 pt-4">
              <p className="text-sm text-gray-400">
                Showing {shown.length} of {filtered.length}
              </p>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
              >
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
