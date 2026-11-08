import { describe, expect, it } from 'vitest';
import { createEmptyProject } from './database';
import { normalizeProject } from './normalizeProject';

describe('project migration', () => {
  it('fills catalog fields from cartas.json while preserving local edits', () => {
    const legacy = createEmptyProject();
    const eight = legacy.cards['lenormand-08']!;
    eight.title = 'Sepultura';
    eight.bibleReference = '';
    delete (eight as Partial<typeof eight>).representation;
    delete (eight as Partial<typeof eight>).observation;
    delete (eight as Partial<typeof eight>).definitionStatus;
    const nine = legacy.cards['lenormand-09']!;
    nine.title = 'Meu Buquê';
    nine.bibleReference = 'Minha referência';
    const normalized = normalizeProject(legacy);
    expect(normalized.cards['lenormand-08']).toMatchObject({ title: 'Sepultura (Caixão)', bibleReference: 'Mt 27:59–60', referenceStatus: 'proposed', representation: 'Sepultura de Jesus, pedra fechando entrada' });
    expect(normalized.cards['lenormand-09']).toMatchObject({ title: 'Meu Buquê', bibleReference: 'Minha referência' });
  });
});
