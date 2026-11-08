import type { CardData, CardTemplate, ImageTransform } from '../types';
import { getImageDrawRect, matchesAspectRatio } from './geometry';
import { imageFromBlob, imageFromUrl } from './files';

export interface ComposeOptions {
  card: CardData;
  template: CardTemplate;
  illustration?: Blob | null;
  frame?: Blob | null;
  transform: ImageTransform;
}

export async function composeCard(options: ComposeOptions): Promise<HTMLCanvasElement> {
  const { card, template, illustration, frame, transform } = options;
  if (document.fonts?.ready) await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.width = template.canvas.width;
  canvas.height = template.canvas.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D não está disponível neste navegador.');

  context.fillStyle = '#f2ede3';
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (illustration) {
    const image = await imageFromBlob(illustration);
    const region = template.illustration;
    context.save();
    context.beginPath();
    context.rect(region.x, region.y, region.width, region.height);
    context.clip();
    const draw = getImageDrawRect(image.naturalWidth, image.naturalHeight, region, transform);
    context.drawImage(image, draw.x, draw.y, draw.width, draw.height);
    context.restore();
  }

  const frameImage = frame ? await imageFromBlob(frame) : await imageFromUrl(template.framePath);
  if (!matchesAspectRatio(frameImage.naturalWidth, frameImage.naturalHeight, canvas.width / canvas.height)) {
    throw new Error('A moldura precisa estar na mesma proporção 2:3 da carta.');
  }
  // Moldura cobre o canvas completo sem uma transformação independente.
  context.drawImage(frameImage, 0, 0, canvas.width, canvas.height);

  drawLabel(context, String(card.number).padStart(2, '0'), template.text.number);
  drawLabel(context, card.title, template.text.title);
  const reference = card.bibleReference.trim() || 'Referência bíblica pendente';
  drawLabel(context, reference, template.text.reference);

  const outerMask = await imageFromUrl(template.outerMask.path);
  if (outerMask.naturalWidth !== canvas.width || outerMask.naturalHeight !== canvas.height) {
    throw new Error(`A máscara ${template.outerMask.version} não corresponde à resolução do template.`);
  }
  context.save();
  context.globalCompositeOperation = 'destination-in';
  context.drawImage(outerMask, 0, 0, canvas.width, canvas.height);
  context.restore();
  return canvas;
}

function drawLabel(context: CanvasRenderingContext2D, text: string, style: CardTemplate['text']['title']): void {
  context.save();
  context.font = style.font;
  context.fillStyle = style.color;
  context.textAlign = style.align;
  context.textBaseline = 'alphabetic';
  context.fillText(text, style.x, style.y, style.maxWidth);
  context.restore();
}

export async function exportCardPng(options: ComposeOptions): Promise<Blob> {
  const canvas = await composeCard(options);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('O navegador não conseguiu exportar o PNG.')), 'image/png');
  });
}
