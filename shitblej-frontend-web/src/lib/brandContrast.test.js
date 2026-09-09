import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import config from "../../tailwind.config.js";

// WCAG contrast, guarded at the token level.
//
// The brand scale started life as Tailwind's `green` verbatim, and Tailwind's
// default palettes are not built for AA text: green-600 on white is 3.30:1,
// short of the 4.5:1 that 1.4.3 requires. That single fact broke 22 text sites,
// 15 white-on-green surfaces (the primary CTA, every count badge, the outgoing
// chat bubble) and two meaningful icons at once.
//
// The fix was to shift the ramp from 600 down one step darker rather than to
// edit 37 call sites, so `text-brand-600` is correct by construction. These
// tests exist so that stays true: they read the real config, so changing a hex
// in tailwind.config.js is what fails them, not a stale copy of the palette.

const hex = (h) => {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const channel = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
/** Relative luminance, per WCAG 2.x. */
const luminance = (h) => {
  const [r, g, b] = hex(h);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
/** Contrast ratio between two opaque colours, 1:1 to 21:1. */
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** Composite a colour at `alpha` over an opaque background. */
const over = (fg, bg, alpha) => {
  const [f, b] = [hex(fg), hex(bg)];
  const to = (n) => Math.round(n).toString(16).padStart(2, "0");
  return `#${f.map((c, i) => to(c * alpha + b[i] * (1 - alpha))).join("")}`;
};

const brand = config.theme.extend.colors.brand;
const WHITE = "#ffffff";
const GRAY_50 = "#f9fafb";
const BLACK = "#000000";
const ZINC_900 = "#18181b";
const ZINC_800 = "#27272a";
// `bg-brand-500/10` is the app's standard accent tint, and it holds
// `text-brand-600`. Alpha means the real background is the composite.
const TINT = over(brand[500], WHITE, 0.1);

const AA = 4.5; // 1.4.3, normal-size text
const AA_LARGE = 3; // 1.4.3 for >=24px or >=18.66px bold, and 1.4.11 non-text

describe("the brand ramp", () => {
  it("gets monotonically darker as the step number rises", () => {
    const steps = Object.keys(brand).map(Number).sort((a, b) => a - b);
    const lums = steps.map((s) => luminance(brand[s]));
    for (let i = 1; i < steps.length; i++) {
      expect(
        lums[i],
        `brand-${steps[i]} is lighter than brand-${steps[i - 1]}`
      ).toBeLessThan(lums[i - 1]);
    }
  });

  it("leaves 500 and lighter as Tailwind's green", () => {
    // Not cosmetic: 500 is a background 45 times over - fills, tints, borders,
    // the shadow-brand glow - so darkening it to fix text would have restyled
    // the whole app. The ramp only moves below it.
    expect(brand[50]).toBe("#f0fdf4");
    expect(brand[100]).toBe("#dcfce7");
    expect(brand[200]).toBe("#bbf7d0");
    expect(brand[300]).toBe("#86efac");
    expect(brand[400]).toBe("#4ade80");
    expect(brand[500]).toBe("#22c55e");
  });
});

describe("brand-600, the accessible accent", () => {
  // Every light-mode ground the app actually puts accent text on.
  it.each([
    ["white", WHITE],
    ["gray-50 (footer, section bands)", GRAY_50],
    ["the bg-brand-500/10 tint", TINT],
    ["brand-50 (active mobile nav pill)", brand[50]],
    ["brand-100 (product condition badge)", brand[100]],
  ])("clears AA as text on %s", (_ground, bg) => {
    expect(contrast(brand[600], bg)).toBeGreaterThanOrEqual(AA);
  });

  it("clears AA carrying white text, so it can be a filled surface", () => {
    // The CTA, count badges, the outgoing chat bubble and the active filter
    // chip are all white-on-brand. brand-500 gave them 2.28:1.
    expect(contrast(WHITE, brand[600])).toBeGreaterThanOrEqual(AA);
  });

  it("still clears AA when those surfaces darken on hover", () => {
    expect(contrast(WHITE, brand[700])).toBeGreaterThanOrEqual(AA);
  });
});

describe("brand-700 and 800, used as text on tinted grounds", () => {
  it("brand-700 clears AA on the brand-500/10 tint", () => {
    expect(contrast(brand[700], TINT)).toBeGreaterThanOrEqual(AA);
  });

  it("brand-800 clears AA on brand-50", () => {
    expect(contrast(brand[800], brand[50])).toBeGreaterThanOrEqual(AA);
  });
});

describe("brand-400, the dark-mode accent", () => {
  it.each([
    ["black (the page)", BLACK],
    ["zinc-900 (cards, sheets)", ZINC_900],
    ["zinc-800 (chips, inputs)", ZINC_800],
  ])("clears AA as text on %s", (_ground, bg) => {
    expect(contrast(brand[400], bg)).toBeGreaterThanOrEqual(AA);
  });
});

describe("brand-600 is a light-mode token", () => {
  // Pinned because it is the one thing this change made worse. brand-600 was
  // #16a34a, which cleared 4.5:1 on black (6.37:1) by accident; at #15803d it
  // does not. That is fine - dark mode uses brand-400 - but it means an accent
  // text class needs a dark: counterpart, and one site (SearchTrigger's hover)
  // did not have one. These assertions stop anyone reading the "brand-600 is
  // the accessible accent" rule above as unconditional.
  it.each([
    ["black", BLACK],
    ["zinc-900", ZINC_900],
  ])("does not clear AA on %s, so it is never dark-mode text", (_g, bg) => {
    expect(contrast(brand[600], bg)).toBeLessThan(AA);
  });

  it("hands over to brand-400, which does", () => {
    expect(contrast(brand[400], BLACK)).toBeGreaterThanOrEqual(AA);
  });
});

describe("brand-500, kept vivid for decoration", () => {
  it("clears the 3:1 non-text threshold against the dark page", () => {
    // Online-status dots and the Sell progress bar are meaningful non-text.
    expect(contrast(brand[500], BLACK)).toBeGreaterThanOrEqual(AA_LARGE);
  });

  it("is documented as failing text contrast on white", () => {
    // Pinned deliberately. If someone lightens or darkens 500 they should have
    // to come here and think about which of its 45 uses they are changing.
    expect(contrast(brand[500], WHITE)).toBeLessThan(AA_LARGE);
  });
});

// ── the rules above only hold if call sites keep to them ────────────────────

const sourceFiles = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(jsx?|css)$/.test(entry) && !entry.includes(".test.")
      ? [[path, readFileSync(path, "utf8")]]
      : [];
  });

const files = sourceFiles("src");

describe("the call sites", () => {
  it("never puts white text on brand-500", () => {
    // Line-scoped, which is what Prettier's class formatting gives us. A
    // className split across lines could slip past; the token assertions above
    // are the backstop that keeps the damage to one element rather than 15.
    const offenders = files.flatMap(([path, src]) =>
      src
        .split("\n")
        .map((line, i) => [i + 1, line])
        // `bg-brand-500/10` is a tint carrying dark text, not a white-on-green
        // surface, so the negative lookahead on the slash matters.
        .filter(([, line]) => /bg-brand-500(?!\/)/.test(line) && /text-white/.test(line))
        .map(([n, line]) => `${path}:${n}  ${line.trim().slice(0, 90)}`)
    );
    expect(offenders).toEqual([]);
  });

  it("pairs accent text with a dark-mode counterpart in the same file", () => {
    // File-scoped rather than line-scoped on purpose: SkipLinks builds its
    // class string across several lines of a cn() call, so a line-level rule
    // reports it falsely. File level is coarse - it would miss one unpaired
    // site in a file that pairs another - but it is the granularity that
    // actually caught the real omission, and the token assertions above say
    // why the pairing is needed at all.
    const LIGHT_ONLY = /(?:^|["'\s:])(?:hover:|focus:|group-hover:)?text-brand-(?:600|700|800)\b/;
    const HAS_DARK = /dark:(?:hover:|focus:|group-hover:)?text-brand-\d00\b/;
    const offenders = files
      .filter(([, src]) => LIGHT_ONLY.test(src) && !HAS_DARK.test(src))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it("uses the brand tokens rather than a second raw green palette", () => {
    // Five files used to style buttons, prices and the active mobile nav item
    // with `green-*` straight from Tailwind, so `text-brand-600` and
    // `text-green-600` rendered differently and only one of them was fixable.
    const offenders = files.flatMap(([path, src]) =>
      src
        .split("\n")
        .map((line, i) => [i + 1, line])
        .filter(([, line]) => /\b(?:bg|text|border|ring|shadow|from|to|via)-green-\d/.test(line))
        .map(([n, line]) => `${path}:${n}  ${line.trim().slice(0, 90)}`)
    );
    expect(offenders).toEqual([]);
  });
});
