import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isItemShownInPreview,
  isSectionShownInPreview,
} from "./preview-visibility";

describe("preview visibility helpers", () => {
  it("treats sections as visible unless explicitly hidden", () => {
    assert.equal(isSectionShownInPreview(true), true);
    assert.equal(isSectionShownInPreview(undefined), true);
    assert.equal(isSectionShownInPreview(null), true);
    assert.equal(isSectionShownInPreview(false), false);
  });

  it("treats items as visible only when explicitly shown", () => {
    assert.equal(isItemShownInPreview(true), true);
    assert.equal(isItemShownInPreview(false), false);
    assert.equal(isItemShownInPreview(undefined), false);
    assert.equal(isItemShownInPreview(null), false);
  });

  it("matches resume API mapping defaults for section and item visibility", () => {
    const sectionVisible = (showInPreview?: boolean | null) =>
      isSectionShownInPreview(showInPreview ?? true);
    const itemVisible = (showInPreview?: boolean | null) =>
      isItemShownInPreview(showInPreview ?? false);

    assert.equal(sectionVisible(undefined), true);
    assert.equal(sectionVisible(false), false);
    assert.equal(itemVisible(undefined), false);
    assert.equal(itemVisible(true), true);
  });
});
