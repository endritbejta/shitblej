import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { createProduct } from "../api/products";
import { CATEGORIES } from "../constants";
import { TextField, TextArea, SelectField } from "../components/ui/form";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import ProductCard from "../components/ui/ProductCard";
import ImageUploader from "../components/sell/ImageUploader";

const MAX_IMAGES = 5; // must match the backend multer limit (upload.array("images", 5))

const CONDITIONS = [
  "New",
  "Used - Like New",
  "Used - Very Good",
  "Used - Good",
  "Used - Acceptable",
];

const EMPTY = {
  name: "",
  description: "",
  price: "",
  category: "",
  condition: "New",
  brand: "",
  size: "",
  location: "Prishtina, Kosovo",
};

function Section({ step, title, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-500/10 text-xs font-bold text-brand-600 dark:text-brand-400">
          {step}
        </span>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function Sell() {
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [createdId, setCreatedId] = useState(null);

  const setField = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => (p[name] ? { ...p, [name]: undefined } : p));
    setSubmitError("");
  };

  const addImages = (files) => {
    const room = MAX_IMAGES - images.length;
    const next = files.slice(0, room);
    setImages((p) => [...p, ...next]);
    next.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => setPreviews((p) => [...p, reader.result]);
      reader.readAsDataURL(file);
    });
    setErrors((p) => ({ ...p, images: undefined }));
  };

  const removeImage = (i) => {
    setImages((p) => p.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  };

  const setCover = (i) => {
    const move = (arr) => [arr[i], ...arr.filter((_, idx) => idx !== i)];
    setImages(move);
    setPreviews(move);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Give your item a title.";
    if (!form.category) e.category = "Pick a category.";
    if (!form.price || parseFloat(form.price) <= 0) e.price = "Enter a price above 0.";
    if (images.length === 0) e.images = "Add at least one photo.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    const fd = new FormData();
    fd.append("name", form.name.trim());
    fd.append("price", form.price);
    fd.append("category", form.category);
    fd.append("condition", form.condition);
    if (form.description.trim()) fd.append("description", form.description.trim());
    if (form.brand.trim()) fd.append("brand", form.brand.trim());
    if (form.size.trim()) fd.append("size", form.size.trim());
    // Backend stores location on `address` (unknown keys are stripped).
    if (form.location.trim()) fd.append("address", form.location.trim());
    images.forEach((img) => fd.append("images", img));

    try {
      setLoading(true);
      setProgress(0);
      const res = await createProduct(fd, {
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });
      setCreatedId(res.data?._id || res.data?.id || null);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login", { state: { from: "/sell" } });
        return;
      }
      setSubmitError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "We couldn’t publish your listing. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(EMPTY);
    setImages([]);
    setPreviews([]);
    setErrors({});
    setSubmitError("");
    setCreatedId(null);
    window.scrollTo(0, 0);
  };

  const previewProduct = useMemo(
    () => ({
      _id: "preview",
      name: form.name || "Your item",
      price: form.price || 0,
      images: previews,
      condition: form.condition,
      location: form.location,
      description: form.description,
      category: form.category,
    }),
    [form, previews]
  );

  // ── Success ───────────────────────────────────────────────────
  if (createdId) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center py-10 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Your listing is live
        </h1>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
          “{form.name}” is now visible to buyers on Shitblej.
        </p>
        <div className="mt-7 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Button to={`/products/${createdId}`} size="lg">
            View listing
          </Button>
          <Button variant="secondary" size="lg" onClick={resetForm}>
            List another
          </Button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          List an item
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          A few clear photos and honest details help your item sell faster.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Form column */}
        <div className="space-y-5 lg:col-span-2">
          <Section step="1" title="Photos">
            <ImageUploader
              previews={previews}
              onAdd={addImages}
              onRemove={removeImage}
              onSetCover={setCover}
              max={MAX_IMAGES}
              error={errors.images}
            />
          </Section>

          <Section step="2" title="Details">
            <div className="space-y-4">
              <TextField
                label="Title"
                name="name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="e.g. iPhone 13 Pro — 256GB"
                maxLength={50}
                required
                error={errors.name}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="Category"
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  required
                  error={errors.category}
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="Condition"
                  value={form.condition}
                  onChange={(e) => setField("condition", e.target.value)}
                  required
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="Brand"
                  value={form.brand}
                  onChange={(e) => setField("brand", e.target.value)}
                  placeholder="e.g. Apple"
                />
                <TextField
                  label="Size"
                  value={form.size}
                  onChange={(e) => setField("size", e.target.value)}
                  placeholder="e.g. M · 42 · One size"
                />
              </div>

              <TextArea
                label="Description"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Condition, what's included, any flaws — buyers trust detail."
                maxLength={500}
                rows={4}
                hint={`${form.description.length}/500`}
              />
            </div>
          </Section>

          <Section step="3" title="Price & location">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setField("price", e.target.value)}
                placeholder="0.00"
                leading={<span className="text-sm">$</span>}
                required
                error={errors.price}
              />
              <TextField
                label="Location"
                value={form.location}
                onChange={(e) => setField("location", e.target.value)}
                placeholder="City, Country"
              />
            </div>
          </Section>

          {submitError && <Alert tone="error">{submitError}</Alert>}

          {loading && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-brand-500 transition-[width] duration-200"
                style={{ width: `${Math.max(progress, 8)}%` }}
              />
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => navigate(-1)}
              disabled={loading}
              className="sm:flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" size="lg" loading={loading} className="sm:flex-[2]">
              {loading ? `Publishing… ${progress}%` : "Publish listing"}
            </Button>
          </div>
        </div>

        {/* Live preview */}
        <aside className="hidden lg:block">
          <div className="sticky top-[120px]">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Live preview
            </p>
            <div className="pointer-events-none max-w-[15rem]">
              <ProductCard product={previewProduct} />
            </div>
            <p className="mt-3 text-xs text-gray-400">
              This is how your listing appears in the marketplace.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
