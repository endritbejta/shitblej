import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import SmartImage from "./SmartImage";

// jsdom never actually loads an image, so `complete`/`naturalWidth` have to be
// driven directly. That is exactly the browser state this component now reads:
// an image already in the HTTP cache is `complete` before React can attach an
// onLoad handler, which is why waiting for the event replayed the fade.
function withCachedImages(cached) {
  const spies = [
    vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(cached),
    vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(cached ? 800 : 0),
  ];
  return () => spies.forEach((s) => s.mockRestore());
}

const img = () => document.querySelector("img");
// The placeholder is the image's own wrapper now - see the note in the
// component about why it could not stay an absolutely-positioned child.
const skeleton = () => document.querySelector(".skeleton");
const classesOf = (el) => (el?.getAttribute("class") || "").split(/\s+/);

afterEach(cleanup);

describe("an image the browser has not loaded yet", () => {
  let restore;
  beforeEach(() => {
    restore = withCachedImages(false);
  });
  afterEach(() => restore());

  it("waits at opacity 0 behind a skeleton", () => {
    render(<SmartImage src="https://cdn.example.com/a.jpg" alt="A" />);

    expect(classesOf(img())).toContain("opacity-0");
    expect(skeleton()).not.toBeNull();
  });

  it("fades in once it loads", () => {
    render(<SmartImage src="https://cdn.example.com/a.jpg" alt="A" />);

    fireEvent.load(img());

    expect(classesOf(img())).toContain("opacity-100");
    expect(skeleton()).toBeNull();
  });

  it("keeps the deliberate fade - it is only skipped for a cached image", () => {
    render(<SmartImage src="https://cdn.example.com/a.jpg" alt="A" />);
    // The transition itself must survive; the fix is about when it starts,
    // not about removing the design.
    expect(classesOf(img())).toContain("transition-opacity");
    expect(classesOf(img())).toContain("duration-500");
  });
});

describe("an image the browser already has", () => {
  let restore;
  beforeEach(() => {
    restore = withCachedImages(true);
  });
  afterEach(() => restore());

  it("is visible on the very first commit, with no skeleton", () => {
    // This is the flash. A remount used to start at opacity 0 and fade for
    // 500ms over bytes that were already local. The layout effect seeds the
    // loaded state before paint, so that frame never happens.
    render(<SmartImage src="https://cdn.example.com/a.jpg" alt="A" />);

    expect(classesOf(img())).toContain("opacity-100");
    expect(classesOf(img())).not.toContain("opacity-0");
    expect(skeleton()).toBeNull();
  });

  it("does not re-fade when the component is remounted", () => {
    const { unmount } = render(<SmartImage src="https://cdn.example.com/a.jpg" alt="A" />);
    expect(classesOf(img())).toContain("opacity-100");
    unmount();

    // Exactly what switching chat threads did to every avatar and thumbnail.
    render(<SmartImage src="https://cdn.example.com/a.jpg" alt="A" />);
    expect(classesOf(img())).toContain("opacity-100");
    expect(skeleton()).toBeNull();
  });
});

describe("changing the source", () => {
  it("does not present the previous image as if it were the new one", () => {
    const restore = withCachedImages(false);
    const { rerender } = render(<SmartImage src="https://cdn.example.com/a.jpg" alt="A" />);
    fireEvent.load(img());
    expect(classesOf(img())).toContain("opacity-100");

    // Now the element is reused with a different src - which is what happens
    // without a remount. Holding on to `loaded` would show the OLD picture at
    // full opacity while the new one downloads.
    rerender(<SmartImage src="https://cdn.example.com/b.jpg" alt="B" />);

    expect(img().getAttribute("src")).toContain("b.jpg");
    expect(classesOf(img())).toContain("opacity-0");
    restore();
  });

  it("re-attempts after a failure rather than staying broken", () => {
    const restore = withCachedImages(false);
    const { rerender } = render(<SmartImage src="https://cdn.example.com/gone.jpg" alt="A" />);

    fireEvent.error(img());
    expect(screen.getByRole("img", { name: "A" })).toBeTruthy(); // the fallback
    expect(img()).toBeNull();

    // A different src is a different question; the old failure must not
    // suppress it.
    rerender(<SmartImage src="https://cdn.example.com/ok.jpg" alt="A" />);
    expect(img()).not.toBeNull();
    restore();
  });
});

describe("sources that can never load", () => {
  it.each([
    ["nothing", undefined],
    ["an empty string", ""],
    ["null", null],
  ])("shows the fallback for %s", (_label, src) => {
    render(<SmartImage src={src} alt="Avatar" />);
    expect(screen.getByRole("img", { name: "Avatar" })).toBeTruthy();
    expect(img()).toBeNull();
  });

  it.each([
    ["https://via.placeholder.com/150"],
    ["http://via.placeholder.com/600?text=No+Image"],
  ])("treats the dead placeholder host as no image: %s", (src) => {
    // via.placeholder.com does not resolve, and the backend uses it as the
    // default avatar. Rendering it left an EMPTY box on screen indefinitely:
    // onLoad never fires, so the image stayed at opacity 0, and onError only
    // fires once the connection finally gives up.
    render(<SmartImage src={src} alt="Avatar" />);

    expect(img()).toBeNull();
    expect(skeleton()).toBeNull();
    expect(screen.getByRole("img", { name: "Avatar" })).toBeTruthy();
  });

  it("still renders a normal image from a host with a similar name", () => {
    const restore = withCachedImages(false);
    render(<SmartImage src="https://placeholder.example.com/a.jpg" alt="A" />);
    expect(img()).not.toBeNull();
    restore();
  });
});

describe("the loading placeholder is actually visible", () => {
  it("sits on the image's own wrapper, so it has a box to fill", () => {
    // Regression: it used to be an `absolute inset-0` child of a statically
    // positioned, overflow-hidden wrapper, which resolved against a distant
    // ancestor and got clipped to 0x0. Nothing ever showed.
    const restore = withCachedImages(false);
    const { container } = render(
      <SmartImage src="https://cdn.example.com/a.jpg" alt="A" wrapperClassName="h-10 w-10" />
    );

    const wrapper = container.querySelector(".skeleton");
    expect(wrapper).not.toBeNull();
    // Same element that sizes the image, so it cannot be clipped away.
    expect(wrapper.querySelector("img")).not.toBeNull();
    expect(wrapper.className).toContain("h-10");
    restore();
  });

  it("lets a caller position the wrapper itself", () => {
    // FeaturedCollections and SearchOverlay pass `absolute inset-0`. A
    // hardcoded `relative` would have overridden it, because `cn` is a plain
    // join and Tailwind emits `relative` after `absolute`.
    const restore = withCachedImages(false);
    const { container } = render(
      <SmartImage
        src="https://cdn.example.com/a.jpg"
        alt="A"
        wrapperClassName="absolute inset-0 h-full w-full"
      />
    );

    const wrapper = container.querySelector("div");
    expect(wrapper.className).toContain("absolute");
    expect(wrapper.className).not.toMatch(/\brelative\b/);
    restore();
  });

  it("drops the placeholder once the image is showing", () => {
    const restore = withCachedImages(false);
    const { container } = render(<SmartImage src="https://cdn.example.com/a.jpg" alt="A" />);
    expect(container.querySelector(".skeleton")).not.toBeNull();

    fireEvent.load(img());

    // Otherwise a transparent PNG would sit on grey forever.
    expect(container.querySelector(".skeleton")).toBeNull();
    restore();
  });
});

describe("the fallback keeps the caller's box", () => {
  it("is sized by wrapperClassName, not by the image's own classes", () => {
    // The chat header passes wrapperClassName="h-10 w-10 shrink-0 rounded-full"
    // and className="h-full w-full object-cover". Applying both made the
    // fallback 690px wide instead of 40px.
    render(
      <SmartImage
        src={null}
        alt="Avatar"
        wrapperClassName="h-10 w-10 shrink-0 rounded-full"
        className="h-full w-full rounded-full object-cover"
      />
    );

    const fallback = screen.getByRole("img", { name: "Avatar" });
    expect(fallback.className).toContain("h-10");
    expect(fallback.className).toContain("w-10");
    expect(fallback.className).not.toContain("w-full");
    expect(fallback.className).not.toContain("object-cover");
  });
});

describe("responsive delivery combined with the cached-image path", () => {
  const CLOUDINARY =
    "https://res.cloudinary.com/demo/image/upload/v1/shitblej-products/a.jpg";
  const LADDER = [240, 320, 480];

  it("asks for the displayed size and still skips the fade when cached", () => {
    // These two behaviours were built on separate branches; this is the
    // interaction between them. State keys on the URL actually put on the
    // element, which with a srcset is the mid-ladder candidate, not `src`.
    const restore = withCachedImages(true);
    render(
      <SmartImage src={CLOUDINARY} alt="A" widths={LADDER} sizes="320px" />
    );

    const el = img();
    expect(el.getAttribute("src")).toContain("w_320");
    expect(el.getAttribute("srcset")).toContain("240w");
    expect(el.getAttribute("sizes")).toBe("320px");
    expect(classesOf(el)).toContain("opacity-100");
    expect(skeleton()).toBeNull();
    restore();
  });

  it("still fades a responsive image the browser does not have yet", () => {
    const restore = withCachedImages(false);
    render(
      <SmartImage src={CLOUDINARY} alt="A" widths={LADDER} sizes="320px" />
    );

    expect(classesOf(img())).toContain("opacity-0");
    expect(skeleton()).not.toBeNull();
    fireEvent.load(img());
    expect(classesOf(img())).toContain("opacity-100");
    restore();
  });

  it("omits srcset and sizes for a host that cannot resize", () => {
    // A local /uploads path under UPLOAD_DRIVER=local. A srcset of identical
    // URLs would make the browser think it was choosing.
    const restore = withCachedImages(false);
    render(
      <SmartImage src="/uploads/a.jpg" alt="A" widths={LADDER} sizes="320px" />
    );

    const el = img();
    expect(el.getAttribute("src")).toBe("/uploads/a.jpg");
    expect(el.getAttribute("srcset")).toBeNull();
    expect(el.getAttribute("sizes")).toBeNull();
    restore();
  });

  it("does not treat the dead placeholder as resizable", () => {
    render(
      <SmartImage src="https://via.placeholder.com/150" alt="Avatar" widths={LADDER} />
    );
    expect(img()).toBeNull();
    expect(screen.getByRole("img", { name: "Avatar" })).toBeTruthy();
  });
});
