import { Link } from "react-router-dom";
import { CATEGORIES } from "../../constants";

const QUICK = ["designer-items", "electronics", "sport", "hobby-collector", "home"];

/**
 * Full-bleed editorial hero. Big type, a prominent search that opens the
 * command palette, and quick category jumps. No carousel — one confident,
 * fast-loading statement that sets the premium tone.
 */
export default function Hero() {
  const quick = QUICK.map((id) => CATEGORIES.find((c) => c.id === id)).filter(Boolean);

  return (
    <section className="full-bleed relative overflow-hidden bg-gray-950 text-white">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop"
          alt=""
          className="h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-gray-950" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
        {/* Brand glow */}
        <div className="absolute -left-24 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-brand-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-container px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
        <div className="max-w-2xl">


          <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Buy & sell,
            <br />
            <span className="text-brand-400">effortlessly.</span>
          </h1>

          <p className="mt-5 max-w-lg text-base text-white/70 sm:text-lg">
            Discover thousands of curated pieces — from designer finds to rare
            collectibles. Sell yours in minutes.
          </p>

          {/* Big search
          <button
            onClick={open}
            className="group mt-8 flex w-full max-w-lg items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-left backdrop-blur-md transition-all duration-250 ease-premium hover:border-white/30 hover:bg-white/15"
          >
            <SearchIcon className="h-5 w-5 shrink-0 text-white/70" />
            <span className="flex-1 text-white/60">
              Search for anything — “vintage camera”, “sneakers”…
            </span>
            <span className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition-transform group-hover:translate-x-0.5 sm:flex">
              Search <ArrowRight className="h-4 w-4" />
            </span>
          </button> */}

          {/* Quick category chips */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-white/50">Popular:</span>
            {quick.map((c) => (
              <Link
                key={c.id}
                to={`/collections/${c.id}`}
                className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
