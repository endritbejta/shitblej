import { describe, expect, it } from "vitest";
import { dataUrlToImage } from "./dataUrl";

describe("dataUrlToImage", () => {
  it("splits a data URL into the shape the API expects", () => {
    expect(dataUrlToImage("data:image/jpeg;base64,QUJD")).toEqual({
      kind: "base64",
      mediaType: "image/jpeg",
      data: "QUJD",
    });
  });

  it("keeps the base64 payload intact, padding and all", () => {
    // A truncated payload decodes to a corrupt image, and the failure would
    // surface as an unhelpful 400 from the far side of two services.
    const data = "QUJDRA==";
    expect(dataUrlToImage(`data:image/png;base64,${data}`).data).toBe(data);
  });

  it("handles a payload containing newlines", () => {
    // Some encoders wrap base64. The `s` flag on the pattern is what makes this
    // pass rather than silently returning null.
    const image = dataUrlToImage("data:image/png;base64,QUJD\nRA==");
    expect(image.data).toBe("QUJD\nRA==");
  });

  it.each([
    ["a plain URL", "https://example.com/a.jpg"],
    ["a non-base64 data URL", "data:image/svg+xml,<svg/>"],
    ["an empty string", ""],
    ["undefined", undefined],
    ["null", null],
  ])("returns null for %s", (_label, input) => {
    expect(dataUrlToImage(input)).toBeNull();
  });
});
