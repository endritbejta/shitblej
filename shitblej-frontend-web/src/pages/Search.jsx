import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import { searchProducts } from "../api/products";
import { queryKeys } from "../lib/queryClient";
import ProductBrowser from "../components/collection/ProductBrowser";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import { TRENDING_SEARCHES } from "../constants";

export default function SearchResults() {
  const [params] = useSearchParams();
  const query = (params.get("q") || "").trim();


  // Keyed on the term, so going back to a previous search is instant and a
  // repeated one costs nothing.
  const { data: products = [], isPending } = useQuery({
    queryKey: queryKeys.productSearch(query),
    queryFn: () => searchProducts(query),
    enabled: Boolean(query),
  });

  const loading = Boolean(query) && isPending;

  if (!query) {
    return (
      <EmptyState
        icon={SearchIcon}
        title="Search Shitblej"
        description="Type in the search bar to find products, or try one of these:"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {TRENDING_SEARCHES.slice(0, 5).map((t) => (
              <Link
                key={t}
                to={`/search?q=${encodeURIComponent(t)}`}
                className="chip transition-colors hover:!bg-brand-500 hover:!text-white"
              >
                {t}
              </Link>
            ))}
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Search results</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          “{query}”
        </h1>
      </div>

      <ProductBrowser
        products={products}
        loading={loading}
        emptyTitle={`No results for “${query}”`}
        emptyDescription="Try a different keyword or browse our categories."
      />
    </div>
  );
}
