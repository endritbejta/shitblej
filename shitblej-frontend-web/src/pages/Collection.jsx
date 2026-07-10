import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useCollectionCache } from "../context/CollectionCacheContext";
import ProductBrowser from "../components/collection/ProductBrowser";
import { CATEGORIES } from "../constants";

export default function CollectionPage() {
  const { id } = useParams();
  const { getCollectionProducts } = useCollectionCache();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const category = CATEGORIES.find((c) => c.id === id);
  const title = category?.label || id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, " ");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { products: data } = await getCollectionProducts(id, { limit: 40 });
        if (!cancelled) setProducts(data);
      } catch {
        if (!cancelled) setError("We couldn’t load this collection. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, getCollectionProducts]);

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
