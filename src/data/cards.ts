import cardSource from './cartas.json';
import type { CardData, DefinitionStatus, ReferenceStatus } from '../types';

interface SourceCard {
  numero: number;
  nome: string;
  representacao: string;
  referencia: string;
  observacao: string;
  status: DefinitionStatus;
}

const sourceCards = cardSource.cartas as SourceCard[];

export const catalogMetadata = {
  project: cardSource.projeto,
  canon: cardSource.canon,
  version: cardSource.versao,
};

function getReferenceStatus(reference: string, status: DefinitionStatus): ReferenceStatus {
  if (!reference.trim() || reference.trim() === '—') return 'pending';
  if (status === 'proposta') return 'proposed';
  if (status === 'aprovada') return 'approved';
  return 'pending';
}

export const cardCatalog: CardData[] = sourceCards.map((source) => ({
  id: `lenormand-${String(source.numero).padStart(2, '0')}`,
  number: source.numero,
  title: source.nome,
  representation: source.representacao,
  observation: source.observacao,
  definitionStatus: source.status,
  bibleReference: source.referencia.trim() === '—' ? '' : source.referencia,
  referenceStatus: getReferenceStatus(source.referencia, source.status),
  approvalStatus: 'draft',
}));

export const getCardById = (id: string) => cardCatalog.find((card) => card.id === id);
