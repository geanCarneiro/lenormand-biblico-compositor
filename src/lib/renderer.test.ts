import { describe, expect, it, vi } from 'vitest';
import { cardCatalog } from '../data/cards';
import { CARD_TEMPLATE } from '../template';
import { exportCardPng } from './renderer';

describe('PNG composition', () => {
  it('exports at native size and clips the illustration before drawing the full frame', async () => {
    const calls: string[] = [];
    const context = {
      fillStyle: '', font: '', textAlign: 'center', textBaseline: 'alphabetic',
      fillRect: vi.fn(() => calls.push('background')), save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(),
      rect: vi.fn(() => calls.push('clip-region')), clip: vi.fn(() => calls.push('clip')),
      drawImage: vi.fn(() => calls.push('draw-image')), fillText: vi.fn(() => calls.push('text')),
    } as unknown as CanvasRenderingContext2D;
    const canvas = { width: 0, height: 0, getContext: vi.fn(() => context), toBlob: (cb: BlobCallback) => cb(new Blob(['png'], { type: 'image/png' })) } as unknown as HTMLCanvasElement;
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => tag === 'canvas' ? canvas : document.createElement(tag));
    vi.stubGlobal('Image', class {
      naturalWidth = 300; naturalHeight = 400; onload: (() => void) | null = null;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    });
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() });
    const result = await exportCardPng({
      card: cardCatalog[7]!, template: CARD_TEMPLATE,
      illustration: new Blob(['illustration'], { type: 'image/png' }), frame: new Blob(['frame'], { type: 'image/png' }),
      transform: { zoom: 1, x: 0, y: 0 },
    });
    expect(result.type).toBe('image/png');
    expect(canvas.width).toBe(750);
    expect(canvas.height).toBe(1050);
    expect(calls.indexOf('clip')).toBeLessThan(calls.lastIndexOf('draw-image'));
    expect(context.drawImage).toHaveBeenCalledTimes(2);
    expect(context.fillText).toHaveBeenCalledTimes(3);
  });
});
