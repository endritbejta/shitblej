import { Link } from "react-router-dom";
import { CATEGORIES } from "../../constants";
import {
  HERO_HEIGHT,
  HERO_SIZES,
  HERO_SRC,
  HERO_SRCSET,
  HERO_WIDTH,
} from "../../lib/heroImage";

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
        {/* The LCP element. See lib/heroImage.js - the same descriptor drives
            the <link rel="preload"> that vite.config.js writes into
            index.html, so the browser starts this download from the initial
            document instead of waiting for React to mount.

            fetchPriority="high" because the preload scanner otherwise treats
            an <img> as low priority until layout proves it is in the viewport,
            and it competes with the route chunks for the first connections.
            loading="eager" is stated rather than left to the default so that
            nobody "optimises" it to lazy later - this is the one image on the
            page that must never be deferred. */}
        <img
          src={HERO_SRC}
          srcSet={HERO_SRCSET || undefined}
          sizes={HERO_SIZES}
          width={HERO_WIDTH}
          height={HERO_HEIGHT}
          loading="eager"
          fetchPriority="high"
          decoding="async"
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
