/**
 * The drift tripwire.
 *
 * This service duplicates the backend's category, condition and length rules
 * (see src/domain/taxonomy.ts for why). A duplicate is only safe if something
 * fails loudly when the original moves, so this test reads the backend's
 * validation file and compares.
 *
 * It reads the file as text rather than importing it: that module is CommonJS
 * and pulls in zod and a sibling validator, so importing it would make this test
 * depend on the backend's installed node_modules. Text is the weaker coupling
 * and the one that survives a fresh clone.
 *
 * If this fails, the backend changed. Update src/domain/taxonomy.ts to match -
 * do not edit the expectation.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { CATEGORIES, CONDITIONS, FIELD_LIMITS } from "../src/domain/taxonomy.js";

const here = dirname(fileURLToPath(import.meta.url));
const VALIDATION_PATH = join(
  here,
  "../../backend/src/modules/products/product.validation.js",
);

const source = readFileSync(VALIDATION_PATH, "utf8");

/** Pulls `const NAME = [ "a", "b" ]` out of the backend source. */
function extractStringArray(name: string): string[] {
  const block = new RegExp(`const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`, "u").exec(source);
  if (!block?.[1]) {
    throw new Error(`Could not find a "${name}" array in ${VALIDATION_PATH}`);
  }
  return [...block[1].matchAll(/"([^"]+)"/gu)].map(([, value]) => value!);
}

/** Pulls the numeric argument out of the `.max(N, "…")` whose message matches. */
function extractMaxLength(messageFragment: string): number {
  const pattern = new RegExp(`\\.max\\((\\d+),\\s*"[^"]*${messageFragment}[^"]*"\\)`, "u");
  const match = pattern.exec(source);
  if (!match?.[1]) {
    throw new Error(`Could not find a .max() with a message about "${messageFragment}"`);
  }
  return Number(match[1]);
}

describe("taxonomy matches the marketplace backend", () => {
  it("has the same categories, in the same order", () => {
    expect([...CATEGORIES]).toEqual(extractStringArray("CATEGORIES"));
  });

  it("has the same conditions, in the same order", () => {
    expect([...CONDITIONS]).toEqual(extractStringArray("CONDITIONS"));
  });

  it("has the same name length limit", () => {
    expect(FIELD_LIMITS.nameMaxLength).toBe(extractMaxLength("Name cannot be more than"));
  });

  it("has the same description length limit", () => {
    expect(FIELD_LIMITS.descriptionMaxLength).toBe(
      extractMaxLength("Description cannot be more than"),
    );
  });
});
