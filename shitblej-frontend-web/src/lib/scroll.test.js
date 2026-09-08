import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isNearBottom, scrollToBottom } from "./scroll";

// A stand-in for a scroll container. jsdom does not lay out, so scrollHeight
// and clientHeight are stubbed to describe the situation under test.
const container = ({ scrollHeight, clientHeight, scrollTop }) => {
  const el = document.createElement("div");
  Object.defineProperty(el, "scrollHeight", { value: scrollHeight, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: clientHeight, configurable: true });
  el.scrollTop = scrollTop;
  el.scrollTo = vi.fn(({ top }) => { el.scrollTop = top; });
  return el;
};

describe("isNearBottom", () => {
  it("is true at the bottom", () => {
    expect(isNearBottom(container({ scrollHeight: 1000, clientHeight: 400, scrollTop: 600 }))).toBe(true);
  });

  it("is true just short of the bottom", () => {
    // Within the threshold: the reader is still following along.
    expect(isNearBottom(container({ scrollHeight: 1000, clientHeight: 400, scrollTop: 520 }))).toBe(true);
  });

  it("is false when the reader has scrolled back through history", () => {
    // This is the case that must NOT auto-scroll - doing so pulls whatever
    // they went back to re-read off the screen.
    expect(isNearBottom(container({ scrollHeight: 1000, clientHeight: 400, scrollTop: 100 }))).toBe(false);
  });

  it("is true when the content does not overflow at all", () => {
    expect(isNearBottom(container({ scrollHeight: 300, clientHeight: 400, scrollTop: 0 }))).toBe(true);
  });

  it("tolerates a missing element", () => {
    expect(isNearBottom(null)).toBe(false);
  });
});

describe("scrollToBottom", () => {
  const el = () => container({ scrollHeight: 1000, clientHeight: 400, scrollTop: 0 });

  it("jumps instantly by default", () => {
    const list = el();
    scrollToBottom(list);

    expect(list.scrollTop).toBe(1000);
    // Instant means assigning scrollTop, not asking for an animated scroll.
    expect(list.scrollTo).not.toHaveBeenCalled();
  });

  it("scrolls smoothly when asked", () => {
    const list = el();
    scrollToBottom(list, { smooth: true });

    expect(list.scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: "smooth" });
  });

  // The bug this replaced: endRef.scrollIntoView() scrolls every scrollable
  // ancestor, the document included, so pinning the chat to its newest
  // message dragged the whole page down with it.
  it("never touches anything but the container it was given", () => {
    const list = el();
    const intoView = vi.fn();
    const child = document.createElement("div");
    child.scrollIntoView = intoView;
    list.appendChild(child);

    const windowScroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    scrollToBottom(list);
    scrollToBottom(list, { smooth: true });

    expect(intoView).not.toHaveBeenCalled();
    expect(windowScroll).not.toHaveBeenCalled();
    windowScroll.mockRestore();
  });

  it("tolerates a missing element", () => {
    expect(() => scrollToBottom(null, { smooth: true })).not.toThrow();
  });
});

describe("scrollToBottom under prefers-reduced-motion", () => {
  let original;
  beforeEach(() => {
    original = window.matchMedia;
    window.matchMedia = vi.fn((query) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });
  afterEach(() => {
    window.matchMedia = original;
  });

  it("jumps instead of animating, even when smooth was requested", () => {
    const list = container({ scrollHeight: 1000, clientHeight: 400, scrollTop: 0 });
    scrollToBottom(list, { smooth: true });

    // index.css sets `scroll-behavior: auto !important` under the preference,
    // but that does not constrain a JS-requested smooth scroll - so the
    // preference has to be honoured here as well.
    expect(list.scrollTo).not.toHaveBeenCalled();
    expect(list.scrollTop).toBe(1000);
  });
});
