import { expect } from "@jest/globals";

import { ImageTrimmer } from "./image-trimmer";

describe("Initialization", () => {
  it("should be initialized", async () => {
    const imageTrimmer = new ImageTrimmer();
    expect(imageTrimmer).toBeDefined();
  });
});

describe("Margin & Trimming", () => {
  it("Detect margin color", async () => {
    const imageTrimmer = new ImageTrimmer();
    await imageTrimmer.loadByPath(`${__dirname}/../test-assets/frame.png`);
    const marginColor = await imageTrimmer.getMarginColor();
    expect(marginColor).toBe("#000000");
  });

  it("Detect top and bottom margin", async () => {
    const imageTrimmer = new ImageTrimmer();
    await imageTrimmer.loadByPath(`${__dirname}/../test-assets/frame.png`);
    const marginColor = await imageTrimmer.getMarginColor();
    if (marginColor === null) {
      return;
    }

    const trimmedMargin = await imageTrimmer.trimMargin(marginColor);
    expect(trimmedMargin).toMatchObject({
      marginTop: 59,
      marginBottom: 556,
    });
  });
});
