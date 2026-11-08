import { describe, expect, it } from 'vitest';
import { cardCatalog } from './cards';

describe('JSON card catalog', () => {
  it('loads all 36 traditional IDs and keeps proposal status visible', () => {
    expect(cardCatalog).toHaveLength(36);
    expect(cardCatalog[7]).toMatchObject({ number: 8, title: 'Sepultura (Caixão)', bibleReference: 'Mt 27:59–60', referenceStatus: 'pending' });
    expect(cardCatalog[15]).toMatchObject({ number: 16, title: 'Estrelas' });
    expect(cardCatalog[0]).toMatchObject({ bibleReference: '', referenceStatus: 'pending' });
    expect(cardCatalog[2]?.bibleReference).toBe('Gn 7:17–18');
  });
});
