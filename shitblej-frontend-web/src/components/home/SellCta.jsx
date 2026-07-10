import { ArrowRight } from "lucide-react";
import Button from "../ui/Button";

const STATS = [
  { value: "12k+", label: "Items listed" },
  { value: "4.8★", label: "Seller rating" },
  { value: "3 min", label: "To list an item" },
  { value: "9", label: "Categories" },
];

/**
 * Closing conversion band — community stats + a strong "start selling" CTA,
 * on a dark brand-tinted surface for contrast against the page rhythm.
 */
export default function SellCta() {
  return (
    <section className="relative overflow-hidden rounded-card-lg bg-gray-950 px-6 py-12 text-white sm:px-12 sm:py-16">
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" />
      <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />

      <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Turn what you don’t use into cash.
          </h2>
          <p className="mt-4 max-w-md text-white/70">
            List an item in under three minutes and reach thousands of buyers
            across Kosovo. No listing fees to get started.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to="/sell" size="lg">
              Start selling <ArrowRight className="h-4 w-4" />
            </Button>
            <Button to="/collections/designer-items" size="lg" variant="outline" className="border-white/20 text-white hover:border-white/40 hover:text-white">
              Explore items
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-white/10 bg-white/5">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white/[0.03] p-6">
              <dt className="text-3xl font-bold text-brand-400">{s.value}</dt>
              <dd className="mt-1 text-sm text-white/60">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
