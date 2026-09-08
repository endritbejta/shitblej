import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Spinner from "./Spinner";
import Loading from "../Loading";

afterEach(cleanup);

const arcOf = (container) => container.querySelector("[data-loader-arc]");

describe("Spinner", () => {
  // The reduced-motion fallback depends on a hook that lives in a DIFFERENT
  // file: index.css exempts [data-loader-arc] from the blanket
  // `animation-duration: 0.001ms !important` it applies under
  // prefers-reduced-motion. Delete the attribute and the spinner silently
  // becomes a frozen ring with no sign that anything is loading - no test
  // fails, nothing errors, and it is invisible unless you happen to browse
  // with the preference on. Hence this test.
  it("keeps the data-loader-arc hook the reduced-motion exemption targets", () => {
    const { container } = render(<Spinner />);
    expect(arcOf(container)).not.toBeNull();
  });

  it("declares both the motion-safe and motion-reduce animations", () => {
    const { container } = render(<Spinner />);
    const cls = arcOf(container).className;

    // Rotation only when motion is welcome; a breathing opacity otherwise.
    // Reduced motion means gentler, not absent - a loader that indicates
    // nothing is a worse outcome than one that moves.
    expect(cls).toContain("motion-safe:animate-spin");
    expect(cls).toContain("motion-reduce:animate-loader-pulse");
  });

  it("animates transform and opacity only, never layout", () => {
    const { container } = render(<Spinner />);
    const cls = arcOf(container).className;

    // Width/height/margin animation would force layout and paint on every
    // frame, on the exact main thread this spinner exists to cover for.
    expect(cls).not.toMatch(/animate-(pulse|bounce|ping)\b/);
    expect(arcOf(container).getAttribute("style")).toBeNull();
  });

  it("is hidden from assistive tech, because the copy beside it announces", () => {
    const { container } = render(<Spinner />);
    // Every usage pairs it with real text; exposing the graphic too would
    // announce the same state twice.
    expect(container.firstChild.getAttribute("aria-hidden")).toBe("true");
  });

  it("scales the stroke with the size so the arc never looks weedy", () => {
    const { container: small } = render(<Spinner size="sm" />);
    const { container: large } = render(<Spinner size="lg" />);

    expect(small.firstChild.className).toContain("h-4");
    expect(arcOf(small).className).toContain("border-2");

    expect(large.firstChild.className).toContain("h-9");
    expect(arcOf(large).className).toContain("border-[3px]");
  });

  it("falls back to the medium size for an unknown size", () => {
    const { container } = render(<Spinner size="enormous" />);
    expect(container.firstChild.className).toContain("h-6");
  });
});

describe("Loading", () => {
  it("announces politely via the visible message, not the graphic", () => {
    render(<Loading message="Loading product..." />);

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toContain("Loading product...");
  });

  // The delay is the feature: most loads finish inside 240ms, so the spinner
  // never flashes for work the user did not perceive as waiting.
  it("holds the whole block back before revealing it", () => {
    render(<Loading />);
    expect(screen.getByRole("status").className).toContain("animate-loader-in");
  });

  it("goes full-screen with the large spinner, inline with the medium one", () => {
    const { container: full } = render(<Loading fullScreen />);
    expect(full.firstChild.className).toContain("min-h-screen");
    expect(full.querySelector("[data-loader-arc]").className).toContain("border-[3px]");

    const { container: inline } = render(<Loading />);
    expect(inline.firstChild.className).not.toContain("min-h-screen");
    expect(inline.querySelector("[data-loader-arc]").className).toContain("border-2");
  });

  it("renders without a message when one is not wanted", () => {
    render(<Loading message="" />);
    expect(screen.getByRole("status").textContent).toBe("");
  });
});
