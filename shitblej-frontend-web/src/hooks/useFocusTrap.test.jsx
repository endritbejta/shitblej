import { afterEach, describe, expect, it } from "vitest";
import { useRef, useState } from "react";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { useFocusTrap } from "./useFocusTrap";

afterEach(cleanup);

// A page with a trigger, plus a dialog that traps focus while open. Mirrors
// the real arrangement: the trigger stays in the document behind the dialog,
// which is exactly what Tab used to escape into.
//
// NOTE on what these tests can prove: jsdom does not move focus in response to
// a Tab keydown, so only the points where the hook itself calls focus() are
// observable - the wrap at each edge, the initial focus, and the restore. A
// mid-list Tab is the browser's job and cannot be asserted here.
function Harness({ withControls = true, initiallyOpen = true }) {
  const [open, setOpen] = useState(initiallyOpen);
  const ref = useRef(null);
  useFocusTrap(ref, open);

  return (
    <div>
      <button onClick={() => setOpen(true)}>trigger</button>
      <button>behind-the-dialog</button>
      {open && (
        // tabIndex mirrors the real dialogs, so the container can take
        // programmatic focus when it holds nothing tabbable.
        <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="test dialog">
          {withControls && (
            <>
              <button>first</button>
              <input aria-label="middle" />
              <button onClick={() => setOpen(false)}>close</button>
              {/* Last in the DOM but not tabbable, which is the point of the
                  test below: if it were counted, Tab from "close" would not
                  wrap. */}
              <button disabled>skipped-because-disabled</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const tab = (shift = false) =>
  fireEvent.keyDown(document.activeElement || document.body, { key: "Tab", shiftKey: shift });

describe("useFocusTrap", () => {
  it("moves focus into the dialog on open", () => {
    render(<Harness />);
    // A keyboard user summoning a dialog should not have to Tab blindly to
    // find it.
    expect(document.activeElement).toBe(screen.getByText("first"));
  });

  it("wraps forward at the last control instead of leaving the dialog", () => {
    render(<Harness />);

    screen.getByText("close").focus();
    tab();

    // This is the bug: Tab used to land on "behind-the-dialog", where the
    // user operates a control they cannot see.
    expect(document.activeElement).toBe(screen.getByText("first"));
    expect(document.activeElement).not.toBe(screen.getByText("behind-the-dialog"));
  });

  it("wraps backward at the first control", () => {
    render(<Harness />);

    screen.getByText("first").focus();
    tab(true);

    expect(document.activeElement).toBe(screen.getByText("close"));
  });

  it("pulls focus back if it has drifted outside the dialog", () => {
    render(<Harness />);

    // Something else moved focus while the dialog was open.
    screen.getByText("behind-the-dialog").focus();
    tab();

    expect(document.activeElement).toBe(screen.getByText("first"));
  });

  it("does not treat a disabled control as the last stop", () => {
    render(<Harness />);

    // "skipped-because-disabled" sits last in the DOM. Tab from "close" still
    // wraps, which it only can if the disabled button was excluded - trapping
    // onto one would strand the user somewhere Tab cannot leave.
    screen.getByText("close").focus();
    tab();

    expect(document.activeElement).toBe(screen.getByText("first"));
  });

  it("returns focus to whatever opened the dialog", () => {
    render(<Harness initiallyOpen={false} />);
    const trigger = screen.getByText("trigger");

    trigger.focus();
    fireEvent.click(trigger);
    expect(document.activeElement).toBe(screen.getByText("first"));

    fireEvent.click(screen.getByText("close"));

    // Without this the page loses its place and a keyboard user restarts from
    // the top of the document.
    expect(document.activeElement).toBe(trigger);
  });

  it("focuses the dialog itself when it holds nothing tabbable yet", () => {
    // A dialog whose content is still loading. Focus lands on the container so
    // the screen reader is inside it rather than left back on the page.
    render(<Harness withControls={false} />);

    const dialog = screen.getByRole("dialog");
    expect(document.activeElement).toBe(dialog);

    // And Tab keeps it there rather than escaping to the page behind.
    tab();
    expect(document.activeElement).toBe(dialog);
  });

  it("does nothing while inactive", () => {
    render(<Harness initiallyOpen={false} />);
    const behind = screen.getByText("behind-the-dialog");

    behind.focus();
    tab();

    // No dialog is open, so Tab is the browser's business.
    expect(document.activeElement).toBe(behind);
  });
});
