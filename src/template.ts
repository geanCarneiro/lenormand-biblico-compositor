import type { CardTemplate } from './types';
import frameManifestSource from './data/moldura_provisoria.json';
import { validateFrameTextManifest } from './lib/frameManifest';

export const DEFAULT_FRAME_TEXT_MANIFEST = validateFrameTextManifest(frameManifestSource);

/**
 * PROVISÓRIO: coordenadas visuais de trabalho, não aprovadas e sem dimensão
 * física de impressão implícita. A moldura e a máscara usam o canvas completo;
 * a máscara externa arredondada é aplicada por último na composição.
 */
export const CARD_TEMPLATE: CardTemplate = {
  version: 'provisional-4-frame-manifest-v1',
  provisional: true,
  canvas: { width: 750, height: 1125 },
  framePath: '/template/moldura-provisoria.png',
  defaultTextManifestPath: '/template/moldura-provisoria.json',
  outerMask: { version: 'rounded-2-3-r48-v1', path: '/template/mask-rounded-2-3-r48-v1.png', radiusPx: 48 },
  illustration: { x: 74, y: 120, width: 602, height: 696 },
  text: {
    number: { x: 375, y: 84, maxWidth: 120, align: 'center', font: '700 34px Georgia, serif', color: '#33291f' },
    title: { x: 375, y: 890, maxWidth: 550, align: 'center', font: '700 42px Georgia, serif', color: '#33291f' },
    reference: { x: 375, y: 954, maxWidth: 530, align: 'center', font: '400 24px Georgia, serif', color: '#57483a' },
  },
};
