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
  it('rejects a ZIP without a manifest', async () => {
    const zip = await new JSZip().generateAsync({ type: 'blob' });
    await expect(importProjectZip(zip)).rejects.toThrow(/manifest.json/);
  });
});
