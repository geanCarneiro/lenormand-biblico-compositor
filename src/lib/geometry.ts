import type { ImageTransform, Rect } from '../types';

export interface DrawRect extends Rect {}

/** Cover an illustration region, then apply user zoom and pixel translation. */
export function getImageDrawRect(imageWidth: number, imageHeight: number, region: Rect, transform: ImageTransform): DrawRect {
  if (![imageWidth, imageHeight, region.width, region.height].every((n) => Number.isFinite(n) && n > 0)) {
    throw new Error('Dimensões da imagem ou da região inválidas.');
  }
  const zoom = clampZoom(transform.zoom);
  const coverScale = Math.max(region.width / imageWidth, region.height / imageHeight) * zoom;
  const width = imageWidth * coverScale;
  const height = imageHeight * coverScale;
  return {
    x: region.x + (region.width - width) / 2 + transform.x,
    y: region.y + (region.height - height) / 2 + transform.y,
    width,
    height,
  };
}

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  return Math.min(3, Math.max(0.5, zoom));
}

export function validateRect(rect: Rect, canvas: { width: number; height: number }): boolean {
  return [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)
    && rect.width > 0 && rect.height > 0
    && rect.x >= 0 && rect.y >= 0
    && rect.x + rect.width <= canvas.width
    && rect.y + rect.height <= canvas.height;
}
