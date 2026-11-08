import cardSource from './cartas.json';
import type { CardData } from '../types';

interface SourceCard {
  numero: number;
  nome: string;
  referencia: string;
}

const sourceCards = cardSource.cartas as SourceCard[];

export const cardCatalog: CardData[] = sourceCards.map((source) => ({
  id: `lenormand-${String(source.numero).padStart(2, '0')}`,
  number: source.numero,
  title: source.nome,
  bibleReference: source.referencia.trim() === '—' ? '' : source.referencia,
  // Bibliographic associations from cartas.json are candidates; app approval stays explicit.
  referenceStatus: 'pending',
  approvalStatus: 'draft',
}));

export const getCardById = (id: string) => cardCatalog.find((card) => card.id === id);
