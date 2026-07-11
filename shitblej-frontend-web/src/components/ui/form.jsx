import { useId, forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";

// Shared control styling so every input/select/textarea looks and behaves the
// same. Focus styling comes from the global `input:focus-visible` rule.
const controlBase =
  "w-full rounded-xl border bg-white text-gray-900 placeholder-gray-400 transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-900 dark:text-white";
const controlPad = "h-11 px-3.5 text-sm";
const borderNormal = "border-gray-200 dark:border-zinc-800";
const borderError = "border-red-400 dark:border-red-500/60";

/** Label + control + error/hint wrapper. Owns the a11y wiring. */
function Field({ label, htmlFor, required, error, hint, descId, className, children }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="ml-0.5 text-brand-600 dark:text-brand-400">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={descId} role="alert" className="text-xs font-medium text-red-500">
          {error}
        </p>
      ) : hint ? (
        <p id={descId} className="text-xs text-gray-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const TextField = forwardRef(function TextField(
  { label, error, hint, required, className, leading, trailing, id, ...props },
  ref
) {
  const auto = useId();
  const fieldId = id || auto;
  const descId = error || hint ? `${fieldId}-desc` : undefined;
  return (
    <Field label={label} htmlFor={fieldId} required={required} error={error} hint={hint} descId={descId} className={className}>
      <div className="relative">
        {leading && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            {leading}
          </span>
        )}
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={!!error || undefined}
          aria-describedby={descId}
          className={cn(controlBase, controlPad, error ? borderError : borderNormal, leading && "pl-10", trailing && "pr-11")}
          {...props}
        />
        {trailing && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
    </Field>
  );
});

export const TextArea = forwardRef(function TextArea(
  { label, error, hint, required, className, id, rows = 4, ...props },
  ref
) {
  const auto = useId();
  const fieldId = id || auto;
  const descId = error || hint ? `${fieldId}-desc` : undefined;
  return (
    <Field label={label} htmlFor={fieldId} required={required} error={error} hint={hint} descId={descId} className={className}>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={!!error || undefined}
        aria-describedby={descId}
        className={cn(controlBase, "resize-none px-3.5 py-3 text-sm", error ? borderError : borderNormal)}
        {...props}
      />
    </Field>
  );
});

export const SelectField = forwardRef(function SelectField(
  { label, error, hint, required, className, id, children, ...props },
  ref
) {
  const auto = useId();
  const fieldId = id || auto;
  const descId = error || hint ? `${fieldId}-desc` : undefined;
  return (
    <Field label={label} htmlFor={fieldId} required={required} error={error} hint={hint} descId={descId} className={className}>
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={!!error || undefined}
          aria-describedby={descId}
          className={cn(controlBase, controlPad, "appearance-none pr-10", error ? borderError : borderNormal)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
    </Field>
  );
});
