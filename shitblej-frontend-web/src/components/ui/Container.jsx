import { cn } from "../../utils/cn";

/**
 * Centered page container. One source of truth for the app's max width
 * and horizontal padding so every page lines up with the header and PDP.
 */
export default function Container({ className, as: Comp = "div", children, ...props }) {
  return (
    <Comp
      className={cn("mx-auto w-full max-w-container px-4 sm:px-6", className)}
      {...props}
    >
      {children}
    </Comp>
  );
}
