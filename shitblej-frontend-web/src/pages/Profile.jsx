import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PackageOpen, Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { updateUserProfile } from "../api/auth";
import { getProducts } from "../api/products";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProductGrid from "../components/ui/ProductGrid";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import { cn } from "../utils/cn";

const TABS = [
  { id: "listings", label: "My listings" },
  { id: "saved", label: "Saved" },
];

export default function Profile() {
  const { user, logout, loading: authLoading, refreshUser } = useAuth();
  const { items: savedItems } = useWishlist();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [tab, setTab] = useState("listings");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { state: { from: "/profile" } });
      return;
    }
    let cancelled = false;
    (async () => {
      if (!user?._id) return;
      try {
        setLoadingProducts(true);
        const data = await getProducts({ user: user._id });
        if (!cancelled) setProducts(data);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError("");
    if (!file.type.startsWith("image/")) return setAvatarError("Please choose an image file.");
    if (file.size > 5 * 1024 * 1024) return setAvatarError("Image must be under 5MB.");

    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append("image", file);
      await updateUserProfile(user._id, formData);
      await refreshUser();
    } catch {
      setAvatarError("Couldn’t update your photo. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (authLoading || (!user && loadingProducts)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-zinc-700 dark:border-t-brand-500" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="mx-auto max-w-container space-y-6">
      {avatarError && <Alert tone="error">{avatarError}</Alert>}

      <ProfileHeader
        user={user}
        listingsCount={products.length}
        savedCount={savedItems.length}
        onAvatarChange={handleAvatarChange}
        uploadingAvatar={uploadingAvatar}
        onLogout={handleLogout}
      />

      {/* Section nav — scales to Sold / Purchases / Reviews later */}
      <div className="border-b border-gray-200 dark:border-zinc-800">
        <nav className="flex gap-1" role="tablist">
          {TABS.map((t) => {
            const active = tab === t.id;
            const count = t.id === "listings" ? products.length : savedItems.length;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "border-brand-500 text-gray-900 dark:text-white"
                    : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs",
                    active
                      ? "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                      : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Panels */}
      {tab === "listings" ? (
        loadingProducts ? (
          <ProductGrid loading skeletonCount={5} />
        ) : products.length ? (
          <ProductGrid products={products} />
        ) : (
          <EmptyState
            icon={PackageOpen}
            title="You haven’t listed anything yet"
            description="Turn things you no longer need into cash — it only takes a couple of minutes."
            action={<Button to="/sell">List your first item</Button>}
          />
        )
      ) : savedItems.length ? (
        <ProductGrid products={savedItems} />
      ) : (
        <EmptyState
          icon={Heart}
          title="No saved items yet"
          description="Tap the heart on any listing to keep it here for later."
          action={<Button to="/">Browse listings</Button>}
        />
      )}
    </div>
  );
}
