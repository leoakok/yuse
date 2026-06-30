import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSliderGeometry,
  indexToLeftStyle,
  ratioToIndex,
} from "./discrete-slider-geometry";

const EPS = 1e-9;

function approx(actual: number, expected: number, message?: string) {
  assert.ok(
    Math.abs(actual - expected) < EPS,
    message ?? `expected ${expected}, got ${actual}`
  );
}

describe("buildSliderGeometry, segmented 5 steps", () => {
  const geometry = buildSliderGeometry({ layout: "segmented", stepCount: 5 });

  it("uses segmented layout", () => {
    assert.equal(geometry.isSegmented, true);
    assert.equal(geometry.snapRatios.length, 5);
    assert.equal(geometry.tickRatios.length, 2);
  });

  it("places tick ratios at 1/3 and 2/3", () => {
    approx(geometry.tickRatios[0], 1 / 3);
    approx(geometry.tickRatios[1], 2 / 3);
  });

  it("places snap ratios at zone centers", () => {
    const [s0, s1, s2, s3, s4] = geometry.snapRatios;
    approx(s0, 1 / 6);
    approx(s1, 5 / 12);
    approx(s2, 6 / 12);
    approx(s3, 7 / 12);
    approx(s4, 5 / 6);
  });
});

describe("buildSliderGeometry, linear 14 steps", () => {
  const geometry = buildSliderGeometry({ layout: "linear", stepCount: 14 });

  it("evenly spaces snaps on inset rail", () => {
    assert.equal(geometry.snapRatios.length, 14);
    approx(geometry.snapRatios[0], 0);
    approx(geometry.snapRatios[13], 1);
    approx(geometry.snapRatios[6], 6 / 13);
  });

  it("insets endpoints in left style", () => {
    const minLeft = indexToLeftStyle(0, geometry);
    const maxLeft = indexToLeftStyle(13, geometry);
    assert.equal(minLeft, "calc(1rem + 0 * (100% - 2 * 1rem))");
    assert.equal(maxLeft, "calc(1rem + 1 * (100% - 2 * 1rem))");
  });
});

describe("ratioToIndex, midpoint boundaries", () => {
  const geometry = buildSliderGeometry({ layout: "segmented", stepCount: 5 });
  const { snapRatios } = geometry;

  it("selects lowest index below first midpoint", () => {
    const mid01 = (snapRatios[0] + snapRatios[1]) / 2;
    assert.equal(ratioToIndex(snapRatios[0], snapRatios), 0);
    assert.equal(ratioToIndex(mid01 - EPS, snapRatios), 0);
  });

  it("selects next index at and above midpoint", () => {
    const mid01 = (snapRatios[0] + snapRatios[1]) / 2;
    assert.equal(ratioToIndex(mid01, snapRatios), 1);
    assert.equal(ratioToIndex(snapRatios[1], snapRatios), 1);
  });

  it("selects last index at max ratio", () => {
    assert.equal(ratioToIndex(1, snapRatios), 4);
    assert.equal(ratioToIndex(snapRatios[4], snapRatios), 4);
  });

  it("clamps out-of-range ratios", () => {
    assert.equal(ratioToIndex(-1, snapRatios), 0);
    assert.equal(ratioToIndex(2, snapRatios), 4);
  });
});
