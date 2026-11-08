import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { createEmptyProject } from './database';
import { exportProjectZip, importProjectZip } from './projectArchive';

describe('project archive validation', () => {
  it('round-trips metadata and assets in a ZIP', async () => {
    const project = createEmptyProject(); project.frameAssetId = 'frame-1';
    const asset = { id: 'frame-1', blob: new Blob(['transparent-png'], { type: 'image/png' }), filename: 'frame.png', mimeType: 'image/png', role: 'frame' as const, createdAt: new Date().toISOString() };
    const archive = await exportProjectZip(project, [asset]);
    const imported = await importProjectZip(archive);
    expect(imported.project.frameAssetId).toBe('frame-1');
    expect(imported.assets[0]?.filename).toBe('frame.png');
    const restoredText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(imported.assets[0]!.blob);
    });
    expect(restoredText).toBe('transparent-png');
  });
  it('round-trips and validates the sidecar manifest associated with a frame', async () => {
    const project = createEmptyProject();
    project.frameAssetId = 'frame-id';
    project.frameManifestAssetId = 'manifest-id';
    const region = {
      x: 0.1, y: 0.1, width: 0.8, height: 0.1,
      style: { fontFamily: 'Georgia, serif', fontSize: 0.04, fontWeight: '400', fontStyle: 'normal', color: '#333333', textAlign: 'center', verticalAlign: 'middle' },
    };
    const manifest = new Blob([JSON.stringify({ schemaVersion: 1, textRegions: { number: region, title: region, reference: region } })], { type: 'application/json' });
    const archive = await exportProjectZip(project, [
      { id: 'frame-id', blob: new Blob(['png'], { type: 'image/png' }), filename: 'moldura_classica.png', mimeType: 'image/png', role: 'frame', createdAt: new Date().toISOString() },
      { id: 'manifest-id', blob: manifest, filename: 'moldura_classica.json', mimeType: 'application/json', role: 'frame-manifest', createdAt: new Date().toISOString() },
    ]);
    const imported = await importProjectZip(archive);
    expect(imported.project.frameManifestAssetId).toBe('manifest-id');
    expect(imported.assets.find((asset) => asset.id === 'manifest-id')?.role).toBe('frame-manifest');
  });
  it('rejects a ZIP without a manifest', async () => {
    const zip = await new JSZip().generateAsync({ type: 'blob' });
    await expect(importProjectZip(zip)).rejects.toThrow(/manifest.json/);
  });
});
