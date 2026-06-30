export type DiscreteSliderLayout = "linear" | "segmented";

export const LINEAR_INSET_REM = "1rem";
export const LINEAR_INSET_PX = 16;

export interface SliderGeometry {
  layout: DiscreteSliderLayout;
  stepCount: number;
  maxIndex: number;
  /** Segmented: 0–1 along full track. Linear: 0–1 along inset rail. */
  snapRatios: number[];
  /** Segmented: tick lines on full track. Linear: gap-center fractions on inset rail. */
  tickRatios: number[];
  isSegmented: boolean;
}

function zoneSnapRatios(start: number, end: number, snapCount: number): number[] {
  if (snapCount <= 0) return [];
  const span = end - start;
  return Array.from({ length: snapCount }, (_, i) =>
    start + ((i + 1) / (snapCount + 1)) * span
  );
}

function buildSegmentedSnapRatios(stepCount: number): number[] {
  const tickCount = (stepCount - 1) / 2;
  if (tickCount <= 0) return [0.5];

  const tick1 = 1 / (tickCount + 1);
  const tickN = tickCount / (tickCount + 1);
  const middleCount = stepCount - 2;

  return [
    ...zoneSnapRatios(0, tick1, 1),
    ...zoneSnapRatios(tick1, tickN, middleCount),
    ...zoneSnapRatios(tickN, 1, 1),
  ];
}

function buildSegmentedTickRatios(stepCount: number): number[] {
  const tickCount = (stepCount - 1) / 2;
  if (tickCount <= 0) return [];
  return Array.from({ length: tickCount }, (_, j) => (j + 1) / (tickCount + 1));
}

function buildLinearSnapRatios(stepCount: number): number[] {
  const maxIndex = Math.max(0, stepCount - 1);
  if (maxIndex === 0) return [0.5];
  return Array.from({ length: stepCount }, (_, i) => i / maxIndex);
}

export function isSegmentedLayout(layout: DiscreteSliderLayout, stepCount: number): boolean {
  return layout === "segmented" && stepCount >= 3 && stepCount % 2 === 1;
}

export function buildSliderGeometry({
  layout,
  stepCount,
}: {
  layout: DiscreteSliderLayout;
  stepCount: number;
}): SliderGeometry {
  const maxIndex = Math.max(0, stepCount - 1);
  const segmented = isSegmentedLayout(layout, stepCount);

  if (segmented) {
    return {
      layout: "segmented",
      stepCount,
      maxIndex,
      snapRatios: buildSegmentedSnapRatios(stepCount),
      tickRatios: buildSegmentedTickRatios(stepCount),
      isSegmented: true,
    };
  }

  const snapRatios = buildLinearSnapRatios(stepCount);
  const tickRatios =
    maxIndex === 0
      ? [0.5]
      : Array.from({ length: maxIndex }, (_, j) => (j + 0.5) / maxIndex);

  return {
    layout: "linear",
    stepCount,
    maxIndex,
    snapRatios,
    tickRatios,
    isSegmented: false,
  };
}

/** Map pointer position (0–1 on the active rail) to the nearest step index. */
export function ratioToIndex(ratio: number, snapRatios: number[]): number {
  if (snapRatios.length <= 1) return 0;

  const clamped = Math.max(0, Math.min(1, ratio));

  for (let i = 0; i < snapRatios.length - 1; i++) {
    const midpoint = (snapRatios[i] + snapRatios[i + 1]) / 2;
    if (clamped < midpoint) return i;
  }
  return snapRatios.length - 1;
}

function linearLeftStyle(fraction: number): string {
  return `calc(${LINEAR_INSET_REM} + ${fraction} * (100% - 2 * ${LINEAR_INSET_REM}))`;
}

export function indexToLeftStyle(
  index: number,
  geometry: SliderGeometry
): string {
  const { snapRatios, isSegmented, maxIndex } = geometry;
  if (snapRatios.length === 0) return linearLeftStyle(0.5);
  const safeIndex = Math.max(0, Math.min(snapRatios.length - 1, index));

  if (isSegmented) {
    return `${snapRatios[safeIndex] * 100}%`;
  }
  if (maxIndex === 0) return linearLeftStyle(0.5);
  return linearLeftStyle(snapRatios[safeIndex]);
}

export function tickRatioToLeftStyle(
  tickRatio: number,
  geometry: SliderGeometry
): string {
  if (geometry.isSegmented) {
    return `${tickRatio * 100}%`;
  }
  return linearLeftStyle(tickRatio);
}

export function pointerRatioFromTrackRect(
  clientX: number,
  rect: { left: number; width: number },
  geometry: SliderGeometry
): number {
  if (rect.width <= 0) return 0;

  if (geometry.isSegmented) {
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  const innerLeft = rect.left + LINEAR_INSET_PX;
  const innerWidth = rect.width - 2 * LINEAR_INSET_PX;
  if (innerWidth <= 0) return 0;
  return Math.max(0, Math.min(1, (clientX - innerLeft) / innerWidth));
}

/** Gap indices (between linear snap points) that get a visible tick mark. */
export function visibleTickGaps(gapCount: number): number[] {
  if (gapCount <= 0) return [];
  const maxTicks = 8;
  if (gapCount <= maxTicks) {
    return Array.from({ length: gapCount }, (_, j) => j);
  }
  const stride = Math.ceil(gapCount / maxTicks);
  const gaps: number[] = [];
  for (let j = 0; j < gapCount; j += stride) {
    gaps.push(j);
  }
  if (gaps[gaps.length - 1] !== gapCount - 1) {
    gaps.push(gapCount - 1);
  }
  return gaps;
}
