import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { CATEGORIES } from "../../constants";

const HeaderDrawerCategories = ({ setHeaderDrawerOpen }) => {
  return (
    <div className="w-full">
      <h2 className="mb-2 px-5 text-xs font-semibold uppercase tracking-widest text-gray-400">
        Categories
      </h2>

      <ul>
        {CATEGORIES.map((cat) => (
          <li key={cat.id}>
            <Link
              to={`/collections/${cat.id}`}
              onClick={() => setHeaderDrawerOpen(false)}
              className="flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-brand-600 dark:text-gray-200 dark:hover:bg-zinc-900 dark:hover:text-brand-400"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-300">
                <cat.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              <span className="flex-1">{cat.label}</span>
              <ChevronRight className="h-4 w-4 text-gray-300 dark:text-zinc-600" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HeaderDrawerCategories;
