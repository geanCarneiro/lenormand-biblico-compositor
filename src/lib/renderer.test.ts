import { describe, expect, it, vi } from 'vitest';
import { cardCatalog } from '../data/cards';
import { CARD_TEMPLATE } from '../template';
import { exportCardPng } from './renderer';
import { validateFrameTextManifest } from './frameManifest';

describe('PNG composition', () => {
  it('exports at native size and clips the illustration before drawing the full frame', async () => {
    const calls: string[] = [];
    let compositeOperation: GlobalCompositeOperation = 'source-over';
    const compositeStack: GlobalCompositeOperation[] = [];
    const context = {
      fillStyle: '', font: '', textAlign: 'center', textBaseline: 'alphabetic',
      get globalCompositeOperation() { return compositeOperation; },
      set globalCompositeOperation(value: GlobalCompositeOperation) { compositeOperation = value; if (value === 'destination-in') calls.push('mask-mode'); },
      fillRect: vi.fn(() => calls.push('background')),
      save: vi.fn(() => compositeStack.push(compositeOperation)),
      restore: vi.fn(() => { compositeOperation = compositeStack.pop() ?? 'source-over'; }),
      beginPath: vi.fn(),
      rect: vi.fn(() => calls.push('clip-region')), clip: vi.fn(() => calls.push('clip')),
      drawImage: vi.fn(() => calls.push('draw-image')), fillText: vi.fn(() => calls.push('text')),
    } as unknown as CanvasRenderingContext2D;
    const canvas = { width: 0, height: 0, getContext: vi.fn(() => context), toBlob: (cb: BlobCallback) => cb(new Blob(['png'], { type: 'image/png' })) } as unknown as HTMLCanvasElement;
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => tag === 'canvas' ? canvas : document.createElement(tag));
    vi.stubGlobal('Image', class {
      naturalWidth = 750; naturalHeight = 1125; onload: (() => void) | null = null;
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
    expect(canvas.height).toBe(1125);
    expect(canvas.width / canvas.height).toBe(2 / 3);
    expect(calls.indexOf('clip')).toBeLessThan(calls.lastIndexOf('draw-image'));
    expect(context.drawImage).toHaveBeenCalledTimes(3);
    expect(context.fillText).toHaveBeenCalledTimes(3);
    expect(compositeOperation).toBe('source-over');
    expect(calls.indexOf('mask-mode')).toBeGreaterThan(calls.lastIndexOf('text'));
    expect(calls.indexOf('mask-mode')).toBeLessThan(calls.lastIndexOf('draw-image'));
  });

  it('uses normalized text regions from the sidecar in the native PNG renderer', async () => {
    const drawn: Array<{ text: string; x: number; y: number }> = [];
    const context = {
      fillStyle: '', font: '', textAlign: 'center', textBaseline: 'alphabetic', globalCompositeOperation: 'source-over',
      fillRect: vi.fn(), save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), drawImage: vi.fn(),
      measureText: vi.fn(() => ({ width: 20, actualBoundingBoxAscent: 24, actualBoundingBoxDescent: 6 })),
      fillText: vi.fn((text: string, x: number, y: number) => { drawn.push({ text, x, y }); }),
    } as unknown as CanvasRenderingContext2D;
    const canvas = { width: 0, height: 0, getContext: vi.fn(() => context), toBlob: (cb: BlobCallback) => cb(new Blob(['png'], { type: 'image/png' })) } as unknown as HTMLCanvasElement;
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => tag === 'canvas' ? canvas : document.createElement(tag));
    vi.stubGlobal('Image', class {
      naturalWidth = 750; naturalHeight = 1125; onload: (() => void) | null = null;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    });
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:manifest-test'), revokeObjectURL: vi.fn() });
    const textRegion = {
      x: 0.3, y: 0.1, width: 0.4, height: 0.1,
      style: { fontFamily: 'Georgia, serif', fontSize: 0.04, fontWeight: '700', fontStyle: 'italic', color: '#38200F', textAlign: 'center', verticalAlign: 'middle' },
    };
    const textManifest = validateFrameTextManifest({ schemaVersion: 1, textRegions: { number: textRegion, title: textRegion, reference: textRegion } });
    const result = await exportCardPng({
      card: cardCatalog[7]!, template: CARD_TEMPLATE, frame: new Blob(['frame'], { type: 'image/png' }), textManifest,
      transform: { zoom: 1, x: 0, y: 0 },
    });
    expect(result.type).toBe('image/png');
    expect(drawn).toHaveLength(3);
    expect(drawn[0]?.text).toBe('08');
    expect(drawn[0]?.x).toBe(375);
    expect(context.fillStyle).toBe('#38200F');
    expect(context.font).toBe('italic 700 30px Georgia, serif');
  });
});
