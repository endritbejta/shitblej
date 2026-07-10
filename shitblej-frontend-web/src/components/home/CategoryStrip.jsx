import { Link } from "react-router-dom";
import { CATEGORIES } from "../../constants";

/**
 * Browse-by-category strip. Compact, tactile tiles that scroll on mobile and
 * wrap into a grid on larger screens.
 */
export default function CategoryStrip() {
  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.id}
          to={`/collections/${cat.id}`}
          className="group flex w-32 shrink-0 flex-col items-center gap-3 rounded-card border border-gray-200 bg-white p-5 text-center shadow-card transition-all duration-250 ease-premium hover:-translate-y-1 hover:shadow-card-hover dark:border-zinc-800 dark:bg-zinc-900 sm:w-auto"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-gray-100 text-gray-700 transition-colors duration-250 group-hover:bg-brand-500/10 group-hover:text-brand-600 dark:bg-zinc-800 dark:text-gray-200 dark:group-hover:text-brand-400">
            <cat.icon className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {cat.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
