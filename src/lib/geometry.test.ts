import { describe, expect, it } from 'vitest';
import { clampZoom, getImageDrawRect, validateRect } from './geometry';

describe('geometry helpers', () => {
  it('covers the fixed illustration region and centers the image', () => {
    const rect = getImageDrawRect(1200, 800, { x: 50, y: 100, width: 600, height: 500 }, { zoom: 1, x: 0, y: 0 });
    expect(rect).toEqual({ x: -25, y: 100, width: 750, height: 500 });
  });
  it('applies zoom and translation without changing the region', () => {
    const rect = getImageDrawRect(400, 800, { x: 10, y: 20, width: 200, height: 300 }, { zoom: 2, x: 14, y: -9 });
    expect(rect).toEqual({ x: -76, y: -239, width: 400, height: 800 });
  });
  it('clamps zoom and rejects invalid image dimensions', () => {
    expect(clampZoom(20)).toBe(3);
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(() => getImageDrawRect(0, 200, { x: 0, y: 0, width: 10, height: 10 }, { zoom: 1, x: 0, y: 0 })).toThrow();
  });
  it('validates template coordinates against canvas bounds', () => {
    expect(validateRect({ x: 10, y: 15, width: 20, height: 30 }, { width: 40, height: 50 })).toBe(true);
    expect(validateRect({ x: 25, y: 15, width: 20, height: 30 }, { width: 40, height: 50 })).toBe(false);
  });
});
