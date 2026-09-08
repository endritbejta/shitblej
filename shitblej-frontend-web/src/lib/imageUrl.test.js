import { describe, expect, it } from "vitest";
import { buildSrcSet, imageAtWidth, isResizable, WIDTHS } from "./imageUrl";

// These are the tests that prove the Cloudinary savings. The local development
// stack runs UPLOAD_DRIVER=local and serves images from /uploads, so a browser
// run against it never exercises a res.cloudinary.com URL - the transformation
// has to be verified here.

const CLOUDINARY =
  "https://res.cloudinary.com/demo-cloud/image/upload/v1699999999/shitblej-products/abc123.jpg";
const UNSPLASH =
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop";

describe("imageAtWidth", () => {
  it("asks Cloudinary for the width actually displayed", () => {
    // The stored asset is capped at 1200px by the upload transformation. A
    // card ~250px wide was downloading all of it.
    expect(imageAtWidth(CLOUDINARY, 320)).toBe(
      "https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto,c_limit,w_320/v1699999999/shitblej-products/abc123.jpg"
    );
  });

  it("uses c_limit so a small master is never upscaled", () => {
    // Asking for 960 from a 400px original must return 400px, not a blur.
    expect(imageAtWidth(CLOUDINARY, 960)).toContain("c_limit,w_960");
  });

  it("keeps the version and public id intact", () => {
    const out = imageAtWidth(CLOUDINARY, 480);
    expect(out).toContain("/v1699999999/shitblej-products/abc123.jpg");
    expect(out.endsWith(".jpg")).toBe(true);
  });

  it("leaves an explicit width alone", () => {
    // Someone who wrote w_100 into the URL meant it.
    const explicit =
      "https://res.cloudinary.com/demo-cloud/image/upload/w_100,c_thumb/v1/x/y.jpg";
    expect(imageAtWidth(explicit, 960)).toBe(explicit);
  });

  it("chains onto a transformation that does not set a width", () => {
    const rounded =
      "https://res.cloudinary.com/demo-cloud/image/upload/r_max/v1/x/y.jpg";
    expect(imageAtWidth(rounded, 320)).toBe(
      "https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto,c_limit,w_320/r_max/v1/x/y.jpg"
    );
  });

  it("rewrites the Unsplash width and preserves the other parameters", () => {
    const out = new URL(imageAtWidth(UNSPLASH, 640));
    expect(out.searchParams.get("w")).toBe("640");
    expect(out.searchParams.get("q")).toBe("80");
    expect(out.searchParams.get("fit")).toBe("crop");
    // auto=format is what gets us WebP/AVIF from Unsplash.
    expect(out.searchParams.get("auto")).toBe("format");
  });

  it("adds auto=format to an Unsplash URL that lacks it", () => {
    const bare = "https://images.unsplash.com/photo-123?w=100";
    expect(imageAtWidth(bare, 640)).toContain("auto=format");
  });

  describe("hosts it must not touch", () => {
    // The helper must never be the reason an image stops loading.
    it.each([
      ["a local upload (UPLOAD_DRIVER=local)", "/uploads/abc-123.jpg"],
      ["an absolute local upload", "http://127.0.0.1:4000/uploads/abc-123.jpg"],
      ["a placeholder", "https://via.placeholder.com/150"],
      ["a data URI", "data:image/png;base64,iVBORw0KGgo="],
      ["an unknown host", "https://cdn.example.com/a.jpg"],
      ["a bundled asset", "/assets/shitblej-logo-560.webp"],
    ])("passes through %s unchanged", (_label, url) => {
      expect(imageAtWidth(url, 320)).toBe(url);
      expect(isResizable(url)).toBe(false);
    });

    it.each([[undefined], [null], [""], [42]])("survives %p", (value) => {
      expect(imageAtWidth(value, 320)).toBe(value);
      expect(isResizable(value)).toBe(false);
    });
  });
});

describe("buildSrcSet", () => {
  it("emits one candidate per width, ascending", () => {
    const srcset = buildSrcSet(CLOUDINARY, [480, 240, 320]);
    expect(srcset.split(", ").map((c) => c.split(" ")[1])).toEqual([
      "240w",
      "320w",
      "480w",
    ]);
  });

  it("returns null for a host that cannot resize", () => {
    // Not an empty string and not a list of identical URLs: a srcset of the
    // same bytes at different `w` descriptors makes the browser think it is
    // choosing, and it would pick the largest.
    expect(buildSrcSet("/uploads/a.jpg", WIDTHS.card)).toBeNull();
    expect(buildSrcSet(CLOUDINARY, [])).toBeNull();
    expect(buildSrcSet(CLOUDINARY, undefined)).toBeNull();
  });

  it("de-duplicates repeated widths", () => {
    expect(buildSrcSet(CLOUDINARY, [320, 320, 480]).split(", ")).toHaveLength(2);
  });

  it("keeps every candidate on the same host as the original", () => {
    for (const candidate of buildSrcSet(UNSPLASH, WIDTHS.hero).split(", ")) {
      expect(candidate).toContain("images.unsplash.com");
    }
  });
});
