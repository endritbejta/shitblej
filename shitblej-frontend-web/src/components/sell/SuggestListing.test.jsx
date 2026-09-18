import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import SuggestListing from "./SuggestListing";
import { suggestListing } from "../../api/products";

vi.mock("../../api/products", () => ({ suggestListing: vi.fn() }));

afterEach(cleanup);
// No explicit mockReset here: vite.config.js sets `restoreMocks: true`, so the
// runner already resets every mock between tests. Adding a second reset also
// makes a rejected mock result escape as an unhandled error rather than being
// caught by the component.

const PHOTO = "data:image/jpeg;base64,QUJD";

const SUGGESTION = {
  name: "Nike Air Max 90",
  description: "Black, good condition.",
  category: "men",
  condition: "Used - Good",
  brand: "Nike",
  size: "42",
  price: {
    low: 30,
    suggested: 45,
    high: 60,
    currency: "EUR",
    basis: "model_estimate",
    comparablesUsed: 0,
    confidence: "medium",
  },
  warnings: [],
};

/** The summary onApply hands back, which is what the component renders. */
const applied = (overrides = {}) => ({
  filled: ["title", "price"],
  skipped: [],
  price: SUGGESTION.price,
  warnings: [],
  ...overrides,
});

const draftButton = () => screen.getByRole("button", { name: /draft from photo/i });
const clickDraft = () => fireEvent.click(draftButton());

/**
 * Makes the next call fail the way axios does.
 *
 * The rejection is created inside the implementation rather than passed to
 * mockRejectedValue, which builds the rejected promise immediately and leaves
 * it unhandled until the click - which the runner reports as an unhandled
 * rejection and fails the file for.
 */
const mockFailure = (status, error) =>
  suggestListing.mockImplementation(async () => {
    const err = new Error(`HTTP ${status}`);
    err.response = { status, data: error ? { error } : {} };
    throw err;
  });

function setup(props = {}) {
  const onApply = vi.fn(() => applied());
  const utils = render(
    <SuggestListing previewDataUrl={PHOTO} hint="" onApply={onApply} {...props} />
  );
  return { onApply, ...utils };
}

describe("SuggestListing", () => {
  it("is disabled until a photo is added", () => {
    setup({ previewDataUrl: undefined });

    expect(draftButton().disabled).toBe(true);
    expect(screen.getByText(/add a photo first/i)).toBeTruthy();
  });

  it("sends the photo as base64 and passes the result to onApply", async () => {
    suggestListing.mockResolvedValue(SUGGESTION);
    const { onApply } = setup();

    clickDraft();

    await waitFor(() => expect(onApply).toHaveBeenCalledWith(SUGGESTION));
    expect(suggestListing).toHaveBeenCalledWith({
      image: { kind: "base64", mediaType: "image/jpeg", data: "QUJD" },
      hint: undefined,
    });
  });

  it("forwards a non-empty hint, trimmed", async () => {
    suggestListing.mockResolvedValue(SUGGESTION);
    setup({ hint: "  Nike 42  " });

    clickDraft();

    await waitFor(() => expect(suggestListing).toHaveBeenCalled());
    expect(suggestListing.mock.calls[0][0].hint).toBe("Nike 42");
  });

  it("omits a blank hint rather than sending whitespace", async () => {
    suggestListing.mockResolvedValue(SUGGESTION);
    setup({ hint: "   " });

    clickDraft();

    await waitFor(() => expect(suggestListing).toHaveBeenCalled());
    expect(suggestListing.mock.calls[0][0].hint).toBeUndefined();
  });

  it("reports which fields it filled", async () => {
    suggestListing.mockResolvedValue(SUGGESTION);
    setup();

    clickDraft();

    expect(await screen.findByText(/filled title, price/i)).toBeTruthy();
  });

  it("says when it left the seller's own text alone", async () => {
    // The promise this component makes: it never overwrites what you typed.
    suggestListing.mockResolvedValue(SUGGESTION);
    const onApply = vi.fn(() => applied({ filled: ["price"], skipped: ["title"] }));
    render(<SuggestListing previewDataUrl={PHOTO} onApply={onApply} />);

    clickDraft();

    expect(await screen.findByText(/left your title as you wrote it/i)).toBeTruthy();
  });

  it("labels the price as an estimate rather than comparable sales", async () => {
    // A seller prices a real possession off this number, so it must not read as
    // market data when it is a guess from a photo.
    suggestListing.mockResolvedValue(SUGGESTION);
    setup();

    clickDraft();

    expect(await screen.findByText(/not based on comparable sales/i)).toBeTruthy();
  });

  it("shows the model's warnings", async () => {
    suggestListing.mockResolvedValue(SUGGESTION);
    const onApply = vi.fn(() =>
      applied({ warnings: ["The photo is dark, so condition is a rough guess."] })
    );
    render(<SuggestListing previewDataUrl={PHOTO} onApply={onApply} />);

    clickDraft();

    expect(await screen.findByText(/the photo is dark/i)).toBeTruthy();
  });

  it("surfaces the API's message when a photo cannot be used", async () => {
    mockFailure(422, "We could not generate a listing.");
    setup();

    clickDraft();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("We could not generate a listing.");
  });

  it("hides itself when the feature is not configured", async () => {
    // A deployment without the suggestion service should not keep offering a
    // button that cannot work.
    mockFailure(503);
    const { container } = setup();

    clickDraft();

    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("does not call the API for a photo it cannot encode", async () => {
    setup({ previewDataUrl: "https://example.com/not-a-data-url.jpg" });

    clickDraft();

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(suggestListing).not.toHaveBeenCalled();
  });
});
