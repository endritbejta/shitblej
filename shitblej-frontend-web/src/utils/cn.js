/**
 * Tiny className combiner — joins truthy values with a space.
 * Keeps JSX readable without pulling in an extra dependency.
 * @param {...(string|false|null|undefined)} classes
 * @returns {string}
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
