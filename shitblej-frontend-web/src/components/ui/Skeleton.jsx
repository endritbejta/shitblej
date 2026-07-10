import { cn } from "../../utils/cn";

/**
 * Shimmer skeleton block. Uses the `.skeleton` component class defined in
 * index.css so the animation stays consistent everywhere.
 */
export default function Skeleton({ className, rounded = "rounded-lg", ...props }) {
  return <div className={cn("skeleton", rounded, className)} {...props} />;
}
