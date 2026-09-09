import { HERO_SIZES, HERO_SRC, HERO_SRCSET } from "./src/lib/heroImage.js";
import { CRAWLABLE_ROUTES } from "./src/lib/siteRoutes.js";

// Build-time changes to index.html. Both exist because this is a
// client-rendered SPA: index.html ships an empty #root, so anything the
// browser should start early has to be written into the document at build
// time - there is no server render to put it there.

/** `&` is not valid raw inside an HTML attribute, and srcset URLs are full of it. */
const escapeAttr = (value) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * Preload the homepage hero, which is the LCP element.
 *
 * Without this the image cannot be discovered until the entry bundle has
 * downloaded, React has mounted and the route chunk has arrived - measured at
 * 2.6s into the load on the deployed site. The preload scanner reads this tag
 * while the HTML is still streaming, so the download starts alongside the
 * JavaScript rather than after it.
 *
 * `imagesrcset`/`imagesizes` mirror the <img>'s `srcset`/`sizes` exactly, from
 * the same constants (src/lib/heroImage.js). If they disagreed the browser
 * would resolve two different candidates and download the image twice, so the
 * shared module is load-bearing, not tidiness.
 *
 * Only the hero. A preload competes for the first connections, so preloading
 * anything that is not the LCP element makes the LCP element slower.
 */
export function injectHeroPreload() {
  return {
    name: "inject-hero-preload",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const attrs = HERO_SRCSET
          ? `imagesrcset="${escapeAttr(HERO_SRCSET)}" imagesizes="${escapeAttr(HERO_SIZES)}"`
          : `href="${escapeAttr(HERO_SRC)}"`;

        // No companion <link rel="preconnect">, on purpose. The preload itself
        // opens the connection at the same point in the document, so a
        // preconnect adds nothing - and adding one with `crossorigin` (the
        // usual copy-paste) actively hurts: `preload as="image"` without
        // crossorigin is a no-CORS fetch, so it cannot reuse an anonymous-CORS
        // connection and you pay for two handshakes instead of one.
        const tag = `<link rel="preload" as="image" ${attrs} fetchpriority="high">`;

        return html.replace("</head>", `  ${tag}\n  </head>`);
      },
    },
  };
}

/**
 * Inline the entry stylesheet instead of linking it.
 *
 * The stylesheet is one render-blocking request that Lighthouse costs at
 * 240-600ms, and it is almost entirely round-trip latency: 54 KiB raw is only
 * ~9 KiB gzipped, there are no @import chains and no web fonts. Inlining
 * removes the request outright.
 *
 * Deliberately the WHOLE stylesheet, not an extracted "critical" subset, and
 * deliberately not `media="print"`/`onload` async loading. Both of those
 * techniques improve the Lighthouse audit by moving styles off the critical
 * path, which is exactly how you get a flash of unstyled content. Inlining
 * keeps the styles blocking - the page still never paints unstyled - and just
 * stops paying a network round trip for them.
 *
 * Route-level CSS chunks (ProductDetail-*.css) are left alone: Vite loads
 * those with their route chunk, so they are already non-blocking, and putting
 * them in the document would make every visitor pay for a page they may never
 * open.
 *
 * @param {object}  [options]
 * @param {number}  [options.maxBytes] Above this, leave the link alone. A
 *   stylesheet that has grown past a few tens of KiB costs more as repeated
 *   HTML weight than it saves as one round trip, and this should fail safe
 *   rather than quietly bloat every response.
 */
export function inlineEntryCss({ maxBytes = 96 * 1024 } = {}) {
  return {
    name: "inline-entry-css",
    apply: "build",
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        // Only possible during a real build, where the emitted assets exist.
        if (!ctx?.bundle) return html;

        const linkPattern =
          /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g;
        let out = html;

        for (const match of html.matchAll(linkPattern)) {
          const [tag, href] = match;
          const fileName = href.replace(/^\/+/, "").split("?")[0];
          const asset = ctx.bundle[fileName];
          if (!asset || asset.type !== "asset") continue;

          const css = String(asset.source);
          if (new TextEncoder().encode(css).length > maxBytes) continue;

          out = out.replace(tag, `<style>${css}</style>`);
          // Nothing else references the entry stylesheet, so shipping it too
          // would leave an unreachable 54 KiB in dist.
          delete ctx.bundle[fileName];
        }

        return out;
      },
    },
  };
}

/**
 * Emit sitemap.xml from the crawlable route list.
 *
 * Generated rather than checked in so it cannot drift from the categories: the
 * routes come from src/lib/siteRoutes.js, and a test there asserts every
 * category in constants/index.js has an entry.
 *
 * The origin comes from the build environment - Netlify sets `URL` - because a
 * sitemap must use absolute URLs, and a deploy preview advertising production
 * URLs would be wrong.
 */
export function emitSitemap({
  origin = process.env.SITE_URL || process.env.URL || "https://shitblej.netlify.app",
} = {}) {
  return {
    name: "emit-sitemap",
    apply: "build",
    generateBundle() {
      const base = origin.replace(/\/+$/, "");
      const today = new Date().toISOString().slice(0, 10);

      const urls = CRAWLABLE_ROUTES.map(
        ({ path, priority, changefreq }) => `  <url>
    <loc>${base}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
      ).join("\n");

      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
      });
    },
  };
}
