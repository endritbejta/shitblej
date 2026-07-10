import { Link } from "react-router-dom";
import logoBlack from "../../assets/shitblej.png";
import logoWhite from "../../assets/shitblej-white.png";

/**
 * Shared frame for the sign-in / sign-up pages: centered brand mark, a single
 * focused card, and an optional footer link. Keeps both auth screens identical
 * in structure so they feel like one system.
 */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto flex min-h-[76vh] w-full max-w-[26rem] flex-col justify-center py-6">
      <Link to="/" aria-label="Shitblej — home" className="mb-8 flex justify-center">
        <img src={logoBlack} alt="Shitblej" className="h-7 w-auto dark:hidden" />
        <img src={logoWhite} alt="Shitblej" className="hidden h-7 w-auto dark:block" />
      </Link>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
        {children}
      </div>

      {footer && (
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">{footer}</p>
      )}
    </div>
  );
}
