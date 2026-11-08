import { describe, expect, it } from 'vitest';
import { resolveTextRegion, validateFrameTextManifest } from './frameManifest';

const region = {
  x: 0.35, y: 0.015, width: 0.3, height: 0.085,
  style: {
    fontFamily: 'Georgia, serif', fontSize: 0.075, fontWeight: '400', fontStyle: 'normal',
    color: '#38200F', textAlign: 'center', verticalAlign: 'middle', lineHeight: 1.2, letterSpacing: '0.02em',
  },
};
const validManifest = {
  schemaVersion: 1,
  textRegions: { number: region, title: region, reference: region },
};

describe('frame text manifests', () => {
  it('validates CSS-like styles and resolves normalized geometry at any card size', () => {
    const manifest = validateFrameTextManifest(validManifest);
    const resolved = resolveTextRegion(manifest.textRegions.number, { width: 750, height: 1125 });
    expect(resolved).toMatchObject({ x: 262.5, y: 16.875, width: 225, height: 95.625, fontSizePx: 56.25, lineHeightPx: 67.5, letterSpacingPx: 1.125 });
    expect(resolveTextRegion(manifest.textRegions.number, { width: 1500, height: 2250 }).fontSizePx).toBe(112.5);
  });

  it('rejects unsupported versions, out-of-bounds regions and invalid vertical alignment', () => {
    expect(() => validateFrameTextManifest({ ...validManifest, schemaVersion: 2 })).toThrow(/schemaVersion 1/);
    expect(() => validateFrameTextManifest({ schemaVersion: 1, textRegions: { number: { ...region, x: 0.8 }, title: region, reference: region } })).toThrow(/caber dentro da carta/);
    expect(() => validateFrameTextManifest({ schemaVersion: 1, textRegions: { number: { ...region, style: { ...region.style, verticalAlign: 'baseline' } }, title: region, reference: region } })).toThrow(/verticalAlign/);
  });

  it('parses an attached JSON blob through the browser file reader', async () => {
    const blob = new Blob([JSON.stringify(validManifest)], { type: 'application/json' });
    const { parseFrameTextManifestBlob } = await import('./frameManifest');
    expect((await parseFrameTextManifestBlob(blob)).schemaVersion).toBe(1);
  });
});
