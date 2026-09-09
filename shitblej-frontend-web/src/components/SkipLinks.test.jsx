import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SkipLinks from "./SkipLinks";
import CategoryNav from "./header/CategoryNav";

// The layouts' own <main> elements are asserted from source rather than by
// rendering: AppLayout and ProductDetail each pull in the whole header (auth,
// wishlist, search, i18n, query client, router), which is a lot of setup to
// prove one attribute. Reading the source catches the failure that matters -
// someone removing the id and silently breaking the skip link - and follows the
// `?raw` precedent already used in lib/siteRoutes.test.js.
import appLayoutSource from "../layouts/AppLayout.jsx?raw";
import productDetailSource from "../pages/ProductDetail.jsx?raw";

// jsdom applies no stylesheet and evaluates no media queries, so "is it visible
// when focused" and "is it hidden below md" cannot be asserted here - those were
// verified in a real browser. What is checked here is the markup contract the
// CSS depends on.

afterEach(cleanup);

const hrefs = () =>
  [...document.querySelectorAll("a")].map((a) => a.getAttribute("href"));

describe("SkipLinks", () => {
  it("offers the three documented destinations, in reading order", () => {
    render(<SkipLinks />);
    expect(hrefs()).toEqual(["#main-content", "#search", "#main-navigation"]);
  });

  it("labels each link with where it goes", () => {
    render(<SkipLinks />);
    for (const label of [
      "Skip to main content",
      "Skip to search",
      "Skip to main navigation",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeTruthy();
    }
  });

  it("uses real links, so Tab reaches them and Enter activates them", () => {
    // The reason this needs no JavaScript: an <a href="#id"> already moves the
    // focus navigation starting point, and a link is keyboard-activatable for
    // free. A <button> with an onClick handler would have needed both.
    render(<SkipLinks />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link.tagName).toBe("A");
      expect(link.getAttribute("href")).toMatch(/^#/);
      // No tabindex: their natural position in the document is the point.
      expect(link.hasAttribute("tabindex")).toBe(false);
    }
  });

  it("is screen-reader-only until focused", () => {
    render(<SkipLinks />);
    for (const link of screen.getAllByRole("link")) {
      expect(link.className).toContain("sr-only");
      expect(link.className).toContain("focus:not-sr-only");
    }
  });

  it("cannot be clicked by a mouse while hidden", () => {
    // sr-only leaves a 1px box in the corner. pointer-events-none on the
    // container makes it unreachable by pointer, and each link re-enables
    // pointer events only once focused.
    render(<SkipLinks />);
    const container = screen.getAllByRole("link")[0].parentElement;
    expect(container.className).toContain("pointer-events-none");
    for (const link of screen.getAllByRole("link")) {
      expect(link.className).toContain("focus:pointer-events-auto");
    }
  });

  it("takes the links out of flow so focusing one cannot shift the layout", () => {
    render(<SkipLinks />);
    const container = screen.getAllByRole("link")[0].parentElement;
    expect(container.className).toContain("absolute");
  });

  it("only offers a link when its target exists at that breakpoint", () => {
    // #search and #main-navigation are both `hidden md:block` targets. A link
    // to a display:none element does nothing at all - focus stays put - so the
    // links carry `hidden` below md, which is what removes them from the tab
    // order. sr-only would not: it sets no `display`.
    render(<SkipLinks />);
    const [main, search, nav] = screen.getAllByRole("link");

    expect(main.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    for (const scoped of [search, nav]) {
      expect(scoped.className).toMatch(/(^|\s)hidden(\s|$)/);
      expect(scoped.className).toContain("md:inline-flex");
    }
  });

  it("draws its own focus indicator, because index.css removes outlines", () => {
    // `:focus { outline: none }` is set app-wide, so a skip link that relied on
    // the default outline would be invisible exactly when it matters.
    render(<SkipLinks />);
    for (const link of screen.getAllByRole("link")) {
      expect(link.className).toContain("focus:border-2");
      expect(link.className).toContain("focus:border-brand-600");
      expect(link.className).toContain("focus:ring-2");
      // Opaque background, or it would be unreadable over the header behind it.
      expect(link.className).toContain("focus:bg-white");
    }
  });
});

describe("the skip-link targets", () => {
  it("navigation is a labelled <nav> that can receive focus", () => {
    render(
      <MemoryRouter>
        <CategoryNav />
      </MemoryRouter>
    );

    const nav = document.getElementById("main-navigation");
    expect(nav).not.toBeNull();
    expect(nav.tagName).toBe("NAV");
    // Without tabindex the browser would only scroll to it, never focus it.
    expect(nav.getAttribute("tabindex")).toBe("-1");
    // A page can hold several <nav>s; this is the one that needs naming.
    expect(nav.getAttribute("aria-label")).toBe("Main");
  });

  it("reuses the existing <nav> rather than adding a wrapper", () => {
    render(
      <MemoryRouter>
        <CategoryNav />
      </MemoryRouter>
    );
    expect(document.querySelectorAll("nav")).toHaveLength(1);
  });

  it.each([
    ["AppLayout", appLayoutSource],
    ["ProductDetail", productDetailSource],
  ])("%s marks its own <main> as the content target", (_name, source) => {
    // Both render a <main>, on different routes, so the id is unique at runtime.
    expect(source).toMatch(/<main\b[\s\S]*?id="main-content"/);
    expect(source).toMatch(/<main\b[\s\S]*?tabIndex=\{-1\}/);
  });
});
