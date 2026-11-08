import type { CardData, CardTemplate, FrameTextManifest, FrameTextRegion, ImageTransform } from '../types';
import { getImageDrawRect, matchesAspectRatio } from './geometry';
import { imageFromBlob, imageFromUrl } from './files';
import { resolveTextRegion } from './frameManifest';

export interface ComposeOptions {
  card: CardData;
  template: CardTemplate;
  illustration?: Blob | null;
  frame?: Blob | null;
  textManifest?: FrameTextManifest | null;
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

  drawText(context, String(card.number).padStart(2, '0'), options.textManifest?.textRegions.number, template.text.number, canvas.width, canvas.height);
  drawText(context, card.title, options.textManifest?.textRegions.title, template.text.title, canvas.width, canvas.height);
  const reference = card.bibleReference.trim() || 'Referência bíblica pendente';
  drawText(context, reference, options.textManifest?.textRegions.reference, template.text.reference, canvas.width, canvas.height);

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

function drawText(
  context: CanvasRenderingContext2D,
  text: string,
  manifestRegion: FrameTextRegion | undefined,
  legacyStyle: CardTemplate['text']['title'],
  canvasWidth: number,
  canvasHeight: number,
): void {
  if (!manifestRegion) { drawLabel(context, text, legacyStyle); return; }
  const region = resolveTextRegion(manifestRegion, { width: canvasWidth, height: canvasHeight });
  const style = region.style;
  const spacingContext = context as CanvasRenderingContext2D & { letterSpacing?: string };
  const nativeSpacing = 'letterSpacing' in context;
  context.save();
  context.font = `${style.fontStyle} ${style.fontWeight} ${region.fontSizePx}px ${style.fontFamily}`;
  context.fillStyle = style.color;
  context.textAlign = style.textAlign;
  context.textBaseline = 'alphabetic';
  if (nativeSpacing) spacingContext.letterSpacing = `${region.letterSpacingPx}px`;

  const lines = wrapText(context, text, region.width, region.letterSpacingPx);
  const maxLines = Math.max(1, Math.floor(region.height / region.lineHeightPx));
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = ellipsize(context, lines[maxLines - 1]!, region.width, region.letterSpacingPx);
  }
  const blockHeight = lines.length * region.lineHeightPx;
  const blockTop = style.verticalAlign === 'top'
    ? region.y
    : style.verticalAlign === 'bottom'
      ? region.y + region.height - blockHeight
      : region.y + (region.height - blockHeight) / 2;
  const metrics = context.measureText('Mg');
  const ascent = metrics.actualBoundingBoxAscent || region.fontSizePx * 0.8;
  const descent = metrics.actualBoundingBoxDescent || region.fontSizePx * 0.2;
  const baselineOffset = (region.lineHeightPx - ascent - descent) / 2 + ascent;
  const anchorX = style.textAlign === 'center'
    ? region.x + region.width / 2
    : style.textAlign === 'right' || style.textAlign === 'end'
      ? region.x + region.width
      : region.x;
  for (let index = 0; index < lines.length; index += 1) {
    const baseline = blockTop + index * region.lineHeightPx + baselineOffset;
    if (nativeSpacing || region.letterSpacingPx === 0) {
      context.fillText(lines[index]!, anchorX, baseline, region.width);
    } else {
      drawWithSpacing(context, lines[index]!, anchorX, baseline, region.width, style.textAlign, region.letterSpacingPx);
    }
  }
  context.restore();
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number, spacing: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measureSpacedText(context, candidate, spacing) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

function measureSpacedText(context: CanvasRenderingContext2D, text: string, spacing: number): number {
  const glyphCount = Array.from(text).length;
  return context.measureText(text).width + Math.max(0, glyphCount - 1) * spacing;
}

function ellipsize(context: CanvasRenderingContext2D, text: string, maxWidth: number, spacing: number): string {
  let result = text;
  while (result && measureSpacedText(context, `${result}…`, spacing) > maxWidth) result = Array.from(result).slice(0, -1).join('');
  return `${result}…`;
}

function drawWithSpacing(
  context: CanvasRenderingContext2D,
  text: string,
  anchorX: number,
  baseline: number,
  maxWidth: number,
  align: FrameTextRegion['style']['textAlign'],
  spacing: number,
): void {
  const glyphs = Array.from(text);
  const naturalWidth = measureSpacedText(context, text, spacing);
  const scale = naturalWidth > maxWidth ? maxWidth / naturalWidth : 1;
  const totalWidth = naturalWidth * scale;
  const startX = align === 'center'
    ? anchorX - totalWidth / 2
    : align === 'right' || align === 'end'
      ? anchorX - totalWidth
      : anchorX;
  let cursor = startX;
  const oldAlign = context.textAlign;
  context.textAlign = 'left';
  for (const glyph of glyphs) {
    const width = context.measureText(glyph).width * scale;
    context.fillText(glyph, cursor, baseline, Math.max(0.01, width));
    cursor += width + spacing * scale;
  }
  context.textAlign = oldAlign;
}

export async function exportCardPng(options: ComposeOptions): Promise<Blob> {
  const canvas = await composeCard(options);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('O navegador não conseguiu exportar o PNG.')), 'image/png');
  });
}
