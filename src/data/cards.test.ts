import { describe, expect, it } from 'vitest';
import { cardCatalog, catalogMetadata } from './cards';

describe('JSON card catalog', () => {
  it('loads all 36 traditional IDs and keeps proposal status visible', () => {
    expect(cardCatalog).toHaveLength(36);
    expect(cardCatalog[7]).toMatchObject({ number: 8, title: 'Sepultura (Caixão)', referenceStatus: 'proposed', definitionStatus: 'proposta' });
    expect(cardCatalog[15]).toMatchObject({ number: 16, title: 'Estrelas' });
    expect(cardCatalog[0]).toMatchObject({ bibleReference: '', referenceStatus: 'pending', definitionStatus: 'a_definir' });
    expect(catalogMetadata.canon).toBe('66 livros protestantes');
  });
});
