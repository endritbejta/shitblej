import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";

/**
 * The single button primitive for the app. Variants and sizes are derived
 * straight from the PDP (green primary, subtle secondary, ghost, pill).
 *
 * Renders an <a> when `href` is set, a react-router <Link> when `to` is set,
 * otherwise a <button>.
 */
const base =
  "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap " +
  "transition-all duration-250 ease-premium select-none disabled:opacity-50 " +
  "disabled:pointer-events-none focus-visible:outline-none";

const variants = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 shadow-brand hover:-translate-y-0.5 active:translate-y-0",
  secondary:
    "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700",
  outline:
    "border border-gray-300 text-gray-700 hover:border-brand-500 hover:text-brand-600 dark:border-zinc-700 dark:text-gray-200 dark:hover:border-brand-400 dark:hover:text-brand-400",
  ghost:
    "text-gray-600 hover:text-brand-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-brand-400 dark:hover:bg-zinc-800",
};

const sizes = {
  sm: "h-9 px-4 text-sm rounded-xl",
  md: "h-11 px-5 text-sm rounded-xl",
  lg: "h-14 px-8 text-base rounded-xl",
  icon: "h-10 w-10 rounded-full",
};

const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    className,
    as,
    to,
    href,
    fullWidth = false,
    children,
    ...props
  },
  ref
) {
  const classes = cn(
    base,
    variants[variant],
    sizes[size],
    fullWidth && "w-full",
    className
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }
  const Comp = as || "button";
  return (
    <Comp ref={ref} className={classes} {...props}>
      {children}
    </Comp>
  );
});

export default Button;
