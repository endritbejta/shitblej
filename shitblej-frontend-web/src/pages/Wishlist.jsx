import { Heart } from "lucide-react";
import { useWishlist } from "../context/WishlistContext";
import ProductGrid from "../components/ui/ProductGrid";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";

export default function WishlistPage() {
  const { items, count, clear } = useWishlist();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Your collection</p>
          <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Wishlist
            {count > 0 && (
              <span className="rounded-full bg-brand-500/10 px-3 py-1 text-base font-semibold text-brand-600 dark:text-brand-400">
                {count}
              </span>
            )}
          </h1>
        </div>
        {count > 0 && (
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear all
          </Button>
        )}
      </div>

      {count === 0 ? (
        <EmptyState
          icon={Heart}
          title="No saved items yet"
          description="Tap the heart on any product to save it here for later."
          action={<Button to="/">Start browsing</Button>}
        />
      ) : (
        <ProductGrid products={items} />
      )}
    </div>
  );
}
