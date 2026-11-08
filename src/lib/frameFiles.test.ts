import { describe, expect, it } from 'vitest';
import { findFrameManifestSidecar, getFrameCandidates } from './frameFiles';

describe('frame manifest sidecar matching', () => {
  it('matches a same-basename JSON file from the selected folder', () => {
    const frame = new File(['png'], 'moldura_classica.png', { type: 'image/png' });
    const sidecar = new File(['{}'], 'moldura_classica.json', { type: 'application/json' });
    const candidates = getFrameCandidates([frame, sidecar]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.manifest).toBe(sidecar);
  });

  it('does not pair a different basename or a sidecar in another directory', () => {
    const frame = new File(['png'], 'moldura_classica.png', { type: 'image/png' });
    const differentName = new File(['{}'], 'moldura_ornamental.json', { type: 'application/json' });
    expect(findFrameManifestSidecar(frame, [differentName])).toBeUndefined();
    const nestedFrame = new File(['png'], 'moldura_classica.png', { type: 'image/png' });
    const nestedJson = new File(['{}'], 'moldura_classica.json', { type: 'application/json' });
    Object.defineProperty(nestedFrame, 'webkitRelativePath', { value: 'frames/a/moldura_classica.png' });
    Object.defineProperty(nestedJson, 'webkitRelativePath', { value: 'frames/b/moldura_classica.json' });
    expect(findFrameManifestSidecar(nestedFrame, [nestedJson])).toBeUndefined();
  });
});
