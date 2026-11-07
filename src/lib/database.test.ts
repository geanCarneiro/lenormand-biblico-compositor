import { beforeEach, describe, expect, it } from 'vitest';
import { Blob as NodeBlob } from 'node:buffer';
import { clearDatabaseForTests, createEmptyProject, getAsset, loadProject, saveAsset, saveProject } from './database';

describe('local persistence', () => {
  beforeEach(async () => clearDatabaseForTests());
  it('persists project fields and image blobs in IndexedDB', async () => {
    const project = createEmptyProject();
    project.cards['lenormand-08']!.bibleReference = 'Referência revisada';
    const image = new NodeBlob(['local-image'], { type: 'image/png' });
    await saveProject(project);
    await saveAsset({ id: 'asset-test', blob: image as unknown as Blob, filename: 'sepultura.png', mimeType: 'image/png', role: 'illustration', createdAt: new Date().toISOString() });
    expect((await loadProject()).cards['lenormand-08']?.bibleReference).toBe('Referência revisada');
    expect((await getAsset('asset-test'))?.blob.size).toBe(image.size);
  });
});
