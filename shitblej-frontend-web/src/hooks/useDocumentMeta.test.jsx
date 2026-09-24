import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import {
  DEFAULT_DOCUMENT_TITLE,
  DEFAULT_META_DESCRIPTION,
  normalizeMetaDescription,
  pageTitle,
  useDocumentMeta,
} from "./useDocumentMeta";

const getDescription = () =>
  document.querySelector('meta[name="description"]')?.getAttribute("content");

beforeEach(() => {
  document.title = DEFAULT_DOCUMENT_TITLE;
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    document.head.append(meta);
  }
  meta.setAttribute("content", DEFAULT_META_DESCRIPTION);
});

afterEach(cleanup);

describe("useDocumentMeta", () => {
  it("sets and restores the current route metadata", () => {
    const { unmount } = renderHook(() =>
      useDocumentMeta({
        title: "Electronics | Shitblej",
        description: "Browse electronics listings from sellers across Kosovo.",
      })
    );

    expect(document.title).toBe("Electronics | Shitblej");
    expect(getDescription()).toBe("Browse electronics listings from sellers across Kosovo.");

    unmount();

    expect(document.title).toBe(DEFAULT_DOCUMENT_TITLE);
    expect(getDescription()).toBe(DEFAULT_META_DESCRIPTION);
  });

  it("updates dynamic metadata when route data changes", () => {
    const { rerender } = renderHook(
      ({ query }) =>
        useDocumentMeta({
          title: pageTitle(`Search: ${query}`),
          description: `Search Shitblej for ${query}.`,
        }),
      { initialProps: { query: "camera" } }
    );

    expect(document.title).toBe("Search: camera | Shitblej");
    expect(getDescription()).toBe("Search Shitblej for camera.");

    rerender({ query: "road bike" });

    expect(document.title).toBe("Search: road bike | Shitblej");
    expect(getDescription()).toBe("Search Shitblej for road bike.");
  });

  it("creates and removes the description tag when the shell does not provide one", () => {
    document.querySelector('meta[name="description"]').remove();

    const { unmount } = renderHook(() =>
      useDocumentMeta({ title: "Wishlist | Shitblej", description: "Saved listings." })
    );

    expect(getDescription()).toBe("Saved listings.");

    unmount();

    expect(document.querySelector('meta[name="description"]')).toBeNull();
  });

  it("normalizes and bounds dynamic descriptions", () => {
    const noisy = `  ${"A useful product description ".repeat(12)}  `;
    const normalized = normalizeMetaDescription(noisy);

    expect(normalized.length).toBeLessThanOrEqual(160);
    expect(normalized).not.toMatch(/\s{2,}/);
    expect(normalized.endsWith("…")).toBe(true);
  });
});
