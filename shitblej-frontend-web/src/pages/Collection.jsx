import { useParams, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "../api/products";
import { queryKeys } from "../lib/queryClient";
import ProductBrowser from "../components/collection/ProductBrowser";
import { CATEGORIES } from "../constants";

export default function CollectionPage() {
  const { id } = useParams();

  const category = CATEGORIES.find((c) => c.id === id);
  const title = category?.label || id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, " ");

  const params = { category: id, limit: 40 };

  // Replaces CollectionCacheContext, which had two bugs a shared cache does
  // not: it recorded a `timestamp` and never read it, so a category was stale
  // for the whole session; and its fetch callback was memoised on [cache], so
  // its identity changed on every write - and because it sat in this effect's
  // dependency array, the effect ran twice per navigation and the second pass
  // set loading true again. This page flashed for the same reason the chat did.
  const {
    data: products = [],
    isPending: loading,
    isError,
  } = useQuery({
    queryKey: queryKeys.products(params),
    queryFn: () => getProducts(params),
  });

  const error = isError ? "We couldn’t load this collection. Please try again." : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <nav className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <Link to="/" className="transition-colors hover:text-brand-600 dark:hover:text-brand-400">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
        </nav>
        <div className="mt-3 flex items-center gap-3">
          {category && (
            <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <category.icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {title}
          </h1>
        </div>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Browse the latest {title.toLowerCase()} listings from sellers across Kosovo.
        </p>
      </div>

      {error ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400">
          {error}
        </div>
      ) : (
        <ProductBrowser
          products={products}
          loading={loading}
          emptyTitle="No items in this collection yet"
          emptyDescription="Check back soon — new listings are added every day."
        />
      )}
    </div>
  );
}
