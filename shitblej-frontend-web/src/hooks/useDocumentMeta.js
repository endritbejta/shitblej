import { useEffect } from "react";

export const DEFAULT_DOCUMENT_TITLE = "SHITBLEJ — Buy & sell, effortlessly";
export const DEFAULT_META_DESCRIPTION =
  "Buy and sell second-hand fashion, electronics and collectibles in Kosovo. Make an offer, negotiate with the seller, then check out securely on Shitblej.";

const DESCRIPTION_MAX_LENGTH = 160;

export function pageTitle(label) {
  return label ? `${label} | Shitblej` : DEFAULT_DOCUMENT_TITLE;
}

export function normalizeMetaDescription(value) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  const description = text || DEFAULT_META_DESCRIPTION;

  if (description.length <= DESCRIPTION_MAX_LENGTH) return description;

  const candidate = description.slice(0, DESCRIPTION_MAX_LENGTH - 1);
  const lastSpace = candidate.lastIndexOf(" ");
  const cutAt = lastSpace >= 120 ? lastSpace : candidate.length;
  return `${candidate.slice(0, cutAt).trimEnd()}…`;
}

export function useDocumentMeta({
  title = DEFAULT_DOCUMENT_TITLE,
  description = DEFAULT_META_DESCRIPTION,
} = {}) {
  useEffect(() => {
    const previousTitle = document.title;
    let descriptionMeta = document.querySelector('meta[name="description"]');
    const createdDescriptionMeta = !descriptionMeta;

    if (!descriptionMeta) {
      descriptionMeta = document.createElement("meta");
      descriptionMeta.setAttribute("name", "description");
      document.head.append(descriptionMeta);
    }

    const previousDescription = descriptionMeta.getAttribute("content");

    document.title = title || DEFAULT_DOCUMENT_TITLE;
    descriptionMeta.setAttribute("content", normalizeMetaDescription(description));

    return () => {
      document.title = previousTitle;

      if (createdDescriptionMeta) {
        descriptionMeta.remove();
      } else if (previousDescription === null) {
        descriptionMeta.removeAttribute("content");
      } else {
        descriptionMeta.setAttribute("content", previousDescription);
      }
    };
  }, [title, description]);
}
