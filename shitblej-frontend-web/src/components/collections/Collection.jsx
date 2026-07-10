import SectionHeader from "../ui/SectionHeader";
import ProductGrid from "../ui/ProductGrid";

/**
 * A titled block of products. Thin wrapper over the design-system primitives
 * kept for backwards compatibility (Home, Profile, Collection page).
 */
export default function Collection({
  title,
  products = [],
  loading = false,
  actionLabel,
  actionTo,
  emptyTitle,
  emptyDescription,
}) {
  return (
    <section className="space-y-5">
      {title && (
        <SectionHeader
          title={title}
          actionLabel={actionLabel}
          actionTo={actionTo}
        />
      )}
      <ProductGrid
        products={products}
        loading={loading}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    </section>
  );
}
