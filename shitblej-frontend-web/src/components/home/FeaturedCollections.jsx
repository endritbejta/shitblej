import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import SmartImage from "../ui/SmartImage";
import { FEATURED_COLLECTIONS } from "../../constants";

/**
 * Editorial collection cards — large imagery, gradient scrim, hover zoom.
 * The first tile spans two columns on desktop for visual rhythm.
 */
export default function FeaturedCollections() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {FEATURED_COLLECTIONS.map((col, i) => (
        <Link
          key={col.id}
          to={`/collections/${col.id}`}
          className={`group relative flex min-h-[220px] items-end overflow-hidden rounded-card-lg sm:min-h-[300px] ${i === 0 ? "col-span-2 lg:col-span-2 lg:row-span-1" : ""
            }`}
        >
          <SmartImage
            src={col.image}
            alt={col.title}
            wrapperClassName="absolute inset-0 h-full w-full"
            className="h-full w-full object-cover transition-transform duration-700 ease-premium group-hover:scale-105 absolute"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <div className="relative flex w-full items-end justify-between gap-3 p-5 sm:p-6">
            <div>
              <p className="text-lg font-bold text-white sm:text-xl">{col.title}</p>
              <p className="mt-0.5 text-sm text-white/70">{col.subtitle}</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md transition-all duration-250 group-hover:bg-brand-500">
              <ArrowUpRight className="h-5 w-5 group-hover:rotate-90 transition-transform" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
