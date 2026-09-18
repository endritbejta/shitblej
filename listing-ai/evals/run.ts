/**
 * Eval runner: how good are the suggestions, and did that change?
 *
 * The fixture set is the marketplace's own seed catalogue
 * (backend/_data/products.json) - 28 items covering all nine categories, each
 * with a photo, a category, a condition and a price. Reusing it means the eval
 * needs no new assets and stays in step with the catalogue.
 *
 * What this measures, stated plainly: agreement with the catalogue's own
 * labels. Those labels are what the seeder's author chose, not ground truth
 * about the photographs, and the photos are stock images rather than the
 * phone snapshots real sellers upload. So a high score here means "consistent
 * with how this marketplace already describes things", which is the right first
 * proxy and not the same as "correct". Replace the fixtures with real seller
 * photos when there are enough of them.
 *
 * Costs real money - one vision call per fixture. Use --limit while iterating.
 *
 *   npm run eval -- --limit 5
 *   npm run eval -- --concurrency 3
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { loadConfig } from "../src/config.js";
import { ClaudeListingAnalyzer } from "../src/analyze/analyzer.js";
import { suggestionSchema, type Suggestion } from "../src/contracts/suggestion.js";
import { CONDITIONS, type Category, type Condition } from "../src/domain/taxonomy.js";

type Fixture = {
  name: string;
  category: Category;
  condition: Condition;
  price: number;
  images: string[];
};

type Outcome = {
  fixture: Fixture;
  suggestion?: Suggestion;
  error?: string;
};

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURES_PATH = join(here, "../../backend/_data/products.json");

function loadFixtures(limit: number | undefined): Fixture[] {
  const raw = JSON.parse(readFileSync(FIXTURES_PATH, "utf8")) as Fixture[];
  const usable = raw.filter((item) => item.images?.[0]);
  return limit ? usable.slice(0, limit) : usable;
}

/**
 * Distance between two conditions on the five-point scale. "Used - Very Good"
 * against "Used - Good" is a judgement call a human would also get wrong; being
 * three steps out is a real miss. Scoring the distance rather than exact match
 * keeps that distinction visible.
 */
function conditionDistance(expected: Condition, actual: Condition): number {
  return Math.abs(CONDITIONS.indexOf(expected) - CONDITIONS.indexOf(actual));
}

/** Runs `task` over `items` with at most `limit` in flight. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index]!, index);
    }
  });

  await Promise.all(workers);
  return results;
}

function percent(count: number, total: number): string {
  if (total === 0) return "n/a";
  return `${((count / total) * 100).toFixed(0)}% (${count}/${total})`;
}

function report(outcomes: Outcome[]): void {
  const scored = outcomes.filter(
    (outcome): outcome is Outcome & { suggestion: Suggestion } => Boolean(outcome.suggestion),
  );
  const failed = outcomes.filter((outcome) => outcome.error);

  let categoryHits = 0;
  let conditionExact = 0;
  let conditionWithinOne = 0;
  let priceInBand = 0;
  let schemaValid = 0;

  console.log("\nPer-item\n" + "-".repeat(78));
  for (const { fixture, suggestion } of scored) {
    const categoryOk = suggestion.category === fixture.category;
    const distance = conditionDistance(fixture.condition, suggestion.condition);
    const inBand =
      fixture.price >= suggestion.price.low && fixture.price <= suggestion.price.high;

    if (categoryOk) categoryHits += 1;
    if (distance === 0) conditionExact += 1;
    if (distance <= 1) conditionWithinOne += 1;
    if (inBand) priceInBand += 1;
    if (suggestionSchema.safeParse(suggestion).success) schemaValid += 1;

    console.log(
      [
        categoryOk ? "cat ok  " : "cat MISS",
        `cond ${distance}`,
        inBand ? "price in " : "price out",
        `${String(fixture.price).padStart(5)}${String(
          ` [${suggestion.price.low}-${suggestion.price.high}]`,
        ).padEnd(12)}`,
        fixture.name.slice(0, 28).padEnd(28),
        categoryOk ? "" : `-> ${suggestion.category}`,
      ].join("  "),
    );
  }

  for (const { fixture, error } of failed) {
    console.log(`ERROR    ${fixture.name.slice(0, 28).padEnd(28)}  ${error}`);
  }

  const total = scored.length;
  console.log("\nSummary\n" + "-".repeat(78));
  console.log(`  scored                 ${total} of ${outcomes.length}`);
  console.log(`  category exact         ${percent(categoryHits, total)}`);
  console.log(`  condition exact        ${percent(conditionExact, total)}`);
  console.log(`  condition within one   ${percent(conditionWithinOne, total)}`);
  console.log(`  catalogue price in band${percent(priceInBand, total)}`);
  console.log(`  schema valid           ${percent(schemaValid, total)}`);
  if (failed.length) console.log(`  errors                 ${failed.length}`);
  console.log();

  // Only hard failures gate. There is no measured baseline for the quality
  // numbers yet, so asserting a threshold would be inventing one - read the
  // summary, then set thresholds once a few runs have established a range.
  if (schemaValid !== total || failed.length > 0) {
    console.error("FAIL: some items errored or produced a contract-invalid suggestion.");
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      limit: { type: "string" },
      concurrency: { type: "string", default: "2" },
    },
  });

  const config = loadConfig();
  if (!config.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY is not set. The eval makes real model calls and cannot run without it.",
    );
    process.exitCode = 1;
    return;
  }

  const fixtures = loadFixtures(values.limit ? Number(values.limit) : undefined);
  const analyzer = new ClaudeListingAnalyzer(config);

  console.log(
    `Evaluating ${fixtures.length} fixtures against ${config.ANTHROPIC_MODEL} ` +
      `(effort: ${config.ANTHROPIC_EFFORT}). This makes ${fixtures.length} billed calls.`,
  );

  const startedAt = Date.now();
  const outcomes = await mapWithConcurrency(
    fixtures,
    Number(values.concurrency),
    async (fixture): Promise<Outcome> => {
      try {
        const suggestion = await analyzer.analyze({
          image: { kind: "url", url: fixture.images[0]! },
        });
        return { fixture, suggestion };
      } catch (error) {
        return { fixture, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );

  report(outcomes);
  console.log(`Completed in ${((Date.now() - startedAt) / 1000).toFixed(1)}s\n`);
}

await main();
