import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { ChevronDown, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import Container from "../ui/Container";
import { CATEGORIES } from "../../constants";
import { cn } from "../../utils/cn";

/**
 * Desktop category navigation with a premium hover mega-menu.
 * Hovering (or focusing) a category with children reveals its subcategories;
 * the chevron rotates and the panel fades/slides in. A short close delay lets
 * the pointer travel from trigger to panel without flicker.
 */
export default function CategoryNav() {
  const { t } = useTranslation();
  const [active, setActive] = useState(null);
  const closeTimer = useRef(null);
  const location = useLocation();

  // Close the mega-menu on any navigation.
  useEffect(() => {
    setActive(null);
  }, [location.pathname, location.search]);

  const open = (id) => {
    clearTimeout(closeTimer.current);
    setActive(id);
  };
  const scheduleClose = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setActive(null), 130);
  };

  const activeCategory = CATEGORIES.find((c) => c.id === active);

  return (
    <div
      className="relative hidden border-t border-gray-100 dark:border-zinc-900 md:block"
      onMouseLeave={scheduleClose}
    >
      <Container>
        {/* The skip-link target. tabIndex={-1} so it can receive focus from
            `#main-navigation` - a <nav> is not focusable otherwise, and the
            browser would only scroll to it. aria-label because a page can hold
            several <nav>s and "Main" is what distinguishes this one. */}
        <nav
          id="main-navigation"
          tabIndex={-1}
          aria-label="Main"
          className="no-scrollbar flex items-center gap-0.5 overflow-x-auto py-1.5"
        >
          {CATEGORIES.map((cat) => {
            const hasChildren = cat.children?.length > 0;
            const isActive = active === cat.id;
            return (
              <div key={cat.id} onMouseEnter={() => open(cat.id)} onFocus={() => open(cat.id)}>
                <NavLink
                  to={`/collections/${cat.id}`}
                  className={({ isActive: isCurrent }) =>
                    cn(
                      "group flex items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-200",
                      isCurrent || isActive
                        ? "bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-white"
                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    )
                  }
                >
                  {t(`nav.${cat.id.replace(/-/g, "_")}`)}
                  {hasChildren && (
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-gray-400 transition-transform duration-250 ease-premium",
                        isActive && "rotate-180 text-current"
                      )}
                    />
                  )}
                </NavLink>
              </div>
            );
          })}
        </nav>
      </Container>

      {/* Mega-menu panel */}
      {activeCategory?.children?.length > 0 && (
        <div
          onMouseEnter={() => open(activeCategory.id)}
          onMouseLeave={scheduleClose}
          className="absolute inset-x-0 top-full origin-top animate-overlay-in border-b border-gray-200 bg-white/95 shadow-overlay backdrop-blur-xl dark:border-zinc-800 dark:bg-black/90"
        >
          <Container className="py-6">
            <div className="flex items-start justify-between gap-8">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <activeCategory.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Browse
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {activeCategory.label}
                  </p>
                </div>
              </div>

              <ul className="grid flex-1 grid-cols-2 gap-x-8 gap-y-1 lg:grid-cols-3">
                {activeCategory.children.map((child) => (
                  <li key={child}>
                    <Link
                      to={`/search?q=${encodeURIComponent(child)}`}
                      onClick={() => setActive(null)}
                      className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-brand-600 dark:text-gray-300 dark:hover:bg-zinc-900 dark:hover:text-brand-400"
                    >
                      {child}
                      <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>

              <Link
                to={`/collections/${activeCategory.id}`}
                onClick={() => setActive(null)}
                className="group hidden shrink-0 items-center gap-1.5 self-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 dark:bg-white dark:text-black dark:hover:bg-brand-600 dark:hover:text-white lg:inline-flex"
              >
                View all
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Container>
        </div>
      )}
    </div>
  );
}
