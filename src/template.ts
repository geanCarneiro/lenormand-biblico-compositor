import type { CardTemplate } from './types';

/**
 * PROVISÓRIO: coordenadas visuais de trabalho, não aprovadas e sem dimensão
 * física de impressão implícita. A moldura é sempre desenhada no canvas inteiro.
 */
export const CARD_TEMPLATE: CardTemplate = {
  version: 'provisional-1',
  provisional: true,
  canvas: { width: 750, height: 1050 },
  framePath: '/template/moldura-provisoria.png',
  illustration: { x: 74, y: 112, width: 602, height: 650 },
  text: {
    number: { x: 375, y: 78, maxWidth: 120, align: 'center', font: '700 34px Georgia, serif', color: '#33291f' },
    title: { x: 375, y: 830, maxWidth: 550, align: 'center', font: '700 42px Georgia, serif', color: '#33291f' },
    reference: { x: 375, y: 890, maxWidth: 530, align: 'center', font: '400 24px Georgia, serif', color: '#57483a' },
  },
};
