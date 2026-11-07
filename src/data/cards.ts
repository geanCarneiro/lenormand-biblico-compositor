import type { CardData } from '../types';

const names = [
  'Cavaleiro', 'Trevo', 'Navio', 'Casa', 'Árvore', 'Nuvens', 'Cobra', 'Sepultura',
  'Buquê', 'Foice', 'Chicote', 'Pássaros', 'Criança', 'Raposa', 'Urso', 'Estrela',
  'Cegonha', 'Cão', 'Torre', 'Jardim', 'Montanha', 'Caminhos', 'Ratos', 'Coração',
  'Anel', 'Livro', 'Carta', 'Homem', 'Mulher', 'Lírios', 'Sol', 'Lua',
  'Chave', 'Peixes', 'Âncora', 'Cruz',
];

export const cardCatalog: CardData[] = names.map((title, index) => ({
  id: `lenormand-${String(index + 1).padStart(2, '0')}`,
  number: index + 1,
  title,
  bibleReference: '',
  referenceStatus: 'pending',
  approvalStatus: 'draft',
}));

export const getCardById = (id: string) => cardCatalog.find((card) => card.id === id);
