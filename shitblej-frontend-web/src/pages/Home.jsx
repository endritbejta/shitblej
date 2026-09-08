import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "../api/products";
import { queryKeys } from "../lib/queryClient";
import Hero from "../components/home/Hero";
import CategoryStrip from "../components/home/CategoryStrip";
import ProductRail from "../components/home/ProductRail";
import FeaturedCollections from "../components/home/FeaturedCollections";
import ValueProps from "../components/home/ValueProps";
import SellCta from "../components/home/SellCta";
import SectionHeader from "../components/ui/SectionHeader";
import ProductGrid from "../components/ui/ProductGrid";

export default function Home() {
  const params = { limit: 30, sort: "-createdAt" };

  // Cached, so returning to the home page from a product renders instantly
  // and revalidates behind the content instead of starting from empty.
  const { data: products = [], isPending: loading } = useQuery({
    queryKey: queryKeys.products(params),
    queryFn: () => getProducts(params),
  });

  // Derive the rails from a single fetch to keep the homepage to one request.
  const { trending, recent, luxury } = useMemo(() => {
    const byPrice = [...products].sort((a, b) => b.price - a.price);
    return {
      trending: products.slice(0, 10),
      recent: products.slice(0, 10),
      luxury: byPrice.filter((p) => p.price >= 150).slice(0, 10),
    };
  }, [products]);

  return (
    <div className="-mt-6 space-y-16 pb-4 sm:space-y-20">
      <Hero />

      <section className="space-y-5">
        <SectionHeader
          title="Browse by category"
          subtitle="Find exactly what you’re looking for."
        />
        <CategoryStrip />
      </section>

      <ProductRail
        eyebrow="Hot right now"
        title="Trending now"
        subtitle="What everyone’s watching this week."
        products={trending}
        loading={loading}
        actionLabel="View all"
        actionTo="/collections/hobby-collector"
      />

      <section className="space-y-5">
        <SectionHeader
          eyebrow="Curated"
          title="Featured collections"
          subtitle="Hand-picked edits, refreshed regularly."
        />
        <FeaturedCollections />
      </section>

      <section className="space-y-5">
        <SectionHeader
          title="Recently added"
          subtitle="Fresh listings from sellers near you."
          actionLabel="View all"
          actionTo="/collections/electronics"
        />
        <ProductGrid products={recent} loading={loading} skeletonCount={10} />
      </section>

      <ProductRail
        eyebrow="Luxury"
        title="Editor’s luxury picks"
        subtitle="Premium pieces worth the splurge."
        products={luxury}
        loading={loading}
      />

      <section className="space-y-6">
        <SectionHeader
          title="Why shop on Shitblej"
          subtitle="A marketplace built on trust."
        />
        <ValueProps />
      </section>

      <SellCta />
    </div>
  );
}
