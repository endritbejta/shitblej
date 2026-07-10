import { useRef, useState } from "react";
import { ImagePlus, X, Star } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * Photo uploader for the sell flow. Drag-and-drop or click, a clear empty
 * state, a cover badge on the first image, "make cover" + remove controls, and
 * a live count. Purely presentational — parent owns the files/previews.
 */
export default function ImageUploader({ previews, onAdd, onRemove, onSetCover, max = 5, error }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const remaining = max - previews.length;

  const pick = (fileList) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length) onAdd(files);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (remaining > 0) pick(e.dataTransfer.files);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The first photo is your cover. Add up to {max}.
        </p>
        <span className="text-xs font-medium text-gray-400">
          {previews.length}/{max}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = ""; // allow re-selecting the same file
        }}
      />

      {previews.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
            dragging
              ? "border-brand-500 bg-brand-500/5"
              : error
                ? "border-red-300 dark:border-red-500/50"
                : "border-gray-300 hover:border-brand-500 dark:border-zinc-700"
          )}
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-gray-400 dark:bg-zinc-800">
            <ImagePlus className="h-6 w-6" />
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Drag photos here, or click to upload
          </span>
          <span className="text-xs text-gray-400">PNG or JPG</span>
        </button>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "grid grid-cols-3 gap-3 rounded-2xl sm:grid-cols-4 lg:grid-cols-5",
            dragging && "ring-2 ring-brand-500 ring-offset-4 ring-offset-white dark:ring-offset-zinc-900"
          )}
        >
          {previews.map((src, i) => (
            <div
              key={i}
              className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 dark:border-zinc-800"
            >
              <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />

              {i === 0 ? (
                <span className="absolute left-1.5 top-1.5 rounded-md bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Cover
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSetCover(i)}
                  className="absolute left-1.5 top-1.5 hidden items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/75 group-hover:flex"
                >
                  <Star className="h-3 w-3" /> Cover
                </button>
              )}

              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-red-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {remaining > 0 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-brand-500 hover:text-brand-600 dark:border-zinc-700"
            >
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs font-medium">Add</span>
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}
