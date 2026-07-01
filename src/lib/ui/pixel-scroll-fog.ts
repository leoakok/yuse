/** Matches DotMatrix: 4px mosaic cell. */
export const PIXEL_SCROLL_FOG_CELL_PX = 4;
/** Mask tiles horizontally across this many cells (16px strip). */
export const PIXEL_SCROLL_FOG_MASK_COLS = 4;
export const PIXEL_SCROLL_FOG_MASK_WIDTH_PX =
  PIXEL_SCROLL_FOG_CELL_PX * PIXEL_SCROLL_FOG_MASK_COLS;
/** Same as prior smooth fog: 7.5rem. */
export const PIXEL_SCROLL_FOG_HEIGHT_REM = 7.5;

const FOG_ROWS = 30;
const SOLID_ROW_FRACTION = 0.22;

function fogRowOpacity(row: number): number {
  const solidRows = Math.round(FOG_ROWS * SOLID_ROW_FRACTION);
  if (row < solidRows) return 1;
  const fadeRows = FOG_ROWS - solidRows;
  const fadeRow = row - solidRows;
  return 1 - fadeRow / fadeRows;
}

/** Mosaic dissolve mask: 4px blocks in a banded fade toward the scroll edge. */
function buildPixelFogMaskSvg(): string {
  const cell = PIXEL_SCROLL_FOG_CELL_PX;
  const cols = PIXEL_SCROLL_FOG_MASK_COLS;
  const width = cell * cols;
  const height = cell * FOG_ROWS;
  const rects: string[] = [];

  for (let row = 0; row < FOG_ROWS; row += 1) {
    const opacity = fogRowOpacity(row);
    if (opacity <= 0) continue;
    for (let col = 0; col < cols; col += 1) {
      rects.push(
        `<rect x="${col * cell}" y="${row * cell}" width="${cell}" height="${cell}" fill="white" fill-opacity="${opacity.toFixed(4)}"/>`
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${rects.join("")}</svg>`;
}

function toMaskDataUrl(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export const pixelScrollFogMask = toMaskDataUrl(buildPixelFogMaskSvg());

export function pixelScrollFogBlurFilterUrl(filterId: string): string {
  return `url(#${filterId})`;
}
