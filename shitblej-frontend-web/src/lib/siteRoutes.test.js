import { describe, expect, it } from "vitest";
import { CATEGORY_SLUGS, CRAWLABLE_ROUTES, DISALLOWED_ROUTES } from "./siteRoutes";
import { CATEGORIES } from "../constants";
// `?raw` rather than fs: under Vite's test transform `import.meta.url` is not
// a file: URL, so readFileSync cannot use it.
import robotsTxt from "../../public/robots.txt?raw";
import llmsTxt from "../../public/llms.txt?raw";

// These keep three files honest about each other: the route list that
// generates sitemap.xml, the categories the app actually renders, and the
// static robots.txt. Each is a separate file for a good reason - the Vite
// config cannot import constants/index.js without pulling in lucide-react,
// and robots.txt has to be a real static file - so the coupling is checked
// here instead of being designed away.

describe("the sitemap route list", () => {
  it("covers every category the app renders", () => {
    // The failure this prevents: add a category to constants/index.js, forget
    // siteRoutes.js, and ship a sitemap that omits a whole section of the
    // site. Nothing else would notice.
    const rendered = CATEGORIES.map((c) => c.id).sort();
    expect([...CATEGORY_SLUGS].sort()).toEqual(rendered);
  });

  it("has a collection route for each slug", () => {
    const paths = CRAWLABLE_ROUTES.map((r) => r.path);
    for (const slug of CATEGORY_SLUGS) {
      expect(paths).toContain(`/collections/${slug}`);
    }
  });

  it("includes the home page at the highest priority", () => {
    const home = CRAWLABLE_ROUTES.find((r) => r.path === "/");
    expect(home).toBeDefined();
    expect(home.priority).toBe("1.0");
  });

  it("lists no route twice", () => {
    const paths = CRAWLABLE_ROUTES.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("gives every route a valid priority and changefreq", () => {
    const allowed = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"];
    for (const r of CRAWLABLE_ROUTES) {
      expect(Number(r.priority)).toBeGreaterThan(0);
      expect(Number(r.priority)).toBeLessThanOrEqual(1);
      expect(allowed).toContain(r.changefreq);
    }
  });

  it("advertises no route that robots.txt disallows", () => {
    // Telling a crawler to index a page and to skip it is a contradiction, and
    // Search Console reports it as one.
    for (const route of CRAWLABLE_ROUTES) {
      expect(DISALLOWED_ROUTES).not.toContain(route.path);
    }
  });

  it("does not enumerate product pages", () => {
    // They exist per listing, so building them would mean querying the API
    // during `npm run build`.
    expect(CRAWLABLE_ROUTES.some((r) => r.path.startsWith("/products/"))).toBe(false);
  });
});

describe("public/robots.txt", () => {
  it("is a real file, not the SPA fallback", () => {
    // The whole reason it exists: netlify.toml rewrites unmatched paths to
    // index.html with a 200, so a request for /robots.txt used to be answered
    // with the app's HTML and every line parsed as a broken directive.
    // Directive lines only - the file's own comments quote the broken HTML
    // while explaining why it exists, and comments are legal in robots.txt.
    const directives = robotsTxt
      .split("\n")
      .filter((l) => l.trim() && !l.trim().startsWith("#"));
    expect(directives.some((l) => l.includes("<"))).toBe(false);
    expect(directives.length).toBeGreaterThan(0);
    expect(robotsTxt).toMatch(/^User-agent:/m);
  });

  it("allows crawling", () => {
    expect(robotsTxt).toMatch(/^Allow: \/$/m);
    expect(robotsTxt).not.toMatch(/^Disallow: \/$/m);
  });

  it("disallows exactly the routes siteRoutes declares", () => {
    const declared = robotsTxt
      .split("\n")
      .filter((l) => l.startsWith("Disallow:"))
      .map((l) => l.replace("Disallow:", "").trim());
    expect(declared.sort()).toEqual([...DISALLOWED_ROUTES].sort());
  });

  it("points at a sitemap with an absolute URL", () => {
    // The robots.txt spec requires it; a relative path is ignored.
    const sitemap = robotsTxt.match(/^Sitemap:\s*(\S+)$/m);
    expect(sitemap).not.toBeNull();
    expect(() => new URL(sitemap[1])).not.toThrow();
    expect(sitemap[1]).toMatch(/\/sitemap\.xml$/);
  });

  it("contains only directives a parser understands", () => {
    // Which is what the audit checks. Comments and blank lines are fine;
    // anything else must be a known `Field: value` directive.
    const known = /^(user-agent|allow|disallow|sitemap|crawl-delay|host):/i;
    const bad = robotsTxt
      .split("\n")
      .filter((l) => l.trim() && !l.trim().startsWith("#"))
      .filter((l) => !known.test(l.trim()));
    expect(bad).toEqual([]);
  });
});

describe("public/llms.txt", () => {
  // Lighthouse's "Agentic Browsing" category is not in the Lighthouse CLI yet,
  // so the real audit cannot be run here. These assert the llmstxt.org shape
  // instead, which is what that audit checks against, and stop the file being
  // edited into something malformed.
  const lines = llmsTxt.split("\n");

  it("is a real file, not the SPA fallback", () => {
    expect(llmsTxt).not.toMatch(/^<!doctype/i);
    expect(lines[0]).toMatch(/^# /);
  });

  it("has exactly one H1, which names the site", () => {
    const h1 = lines.filter((l) => /^# /.test(l));
    expect(h1).toHaveLength(1);
    expect(h1[0]).toBe("# Shitblej");
  });

  it("opens with a blockquote summary", () => {
    const firstProse = lines.findIndex((l, i) => i > 0 && l.trim() !== "");
    expect(lines[firstProse]).toMatch(/^> /);
  });

  it("uses section headings with linked entries", () => {
    expect(lines.filter((l) => /^## /.test(l)).length).toBeGreaterThan(0);
    expect([...llmsTxt.matchAll(/- \[[^\]]+\]\([^)]+\)/g)].length).toBeGreaterThan(0);
  });

  it("links only to absolute URLs", () => {
    // An agent may read this file without knowing the origin it came from.
    for (const [, url] of llmsTxt.matchAll(/\]\(([^)]+)\)/g)) {
      expect(() => new URL(url)).not.toThrow();
    }
  });

  it("names a collection page for every category", () => {
    // Same drift risk as the sitemap: add a category and this file silently
    // stops describing part of the site.
    for (const slug of CATEGORY_SLUGS) {
      expect(llmsTxt).toContain(`/collections/${slug}`);
    }
  });

  it("does not advertise the authenticated routes as browsable", () => {
    // They are listed, but under a heading that says they need an account -
    // never as a link an agent should follow.
    for (const route of DISALLOWED_ROUTES) {
      expect(llmsTxt).not.toContain(`](https://shitblej.netlify.app${route})`);
    }
  });
});
