import type { FrameTextManifest, FrameTextRegion } from '../types';

const MAX_MANIFEST_BYTES = 512 * 1024;

export interface CardSize { width: number; height: number }
export interface ResolvedTextRegion extends Omit<FrameTextRegion, 'x' | 'y' | 'width' | 'height' | 'style'> {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSizePx: number;
  lineHeightPx: number;
  letterSpacingPx: number;
  style: FrameTextRegion['style'];
}

export async function parseFrameTextManifestBlob(blob: Blob): Promise<FrameTextManifest> {
  if (blob.size > MAX_MANIFEST_BYTES) throw new Error('O manifesto da moldura excede o limite de 512 KB.');
  let value: unknown;
  try {
    const contents = typeof blob.text === 'function' ? await blob.text() : await readBlobWithFileReader(blob);
    value = JSON.parse(contents);
  } catch {
    throw new Error('O arquivo não contém JSON válido.');
  }
  return validateFrameTextManifest(value);
}

export function validateFrameTextManifest(input: unknown): FrameTextManifest {
  if (!isRecord(input)) throw new Error('O manifesto da moldura precisa ser um objeto JSON.');
  if (input.schemaVersion !== 1) throw new Error('Versão de manifesto não suportada; esperado schemaVersion 1.');
  if (!isRecord(input.textRegions)) throw new Error('Manifesto inválido: textRegions deve ser um objeto.');
  for (const key of ['number', 'title', 'reference'] as const) {
    if (!(key in input.textRegions)) throw new Error(`Manifesto inválido: falta a região "${key}".`);
  }
  const regions: Record<string, FrameTextRegion> = {};
  for (const [name, value] of Object.entries(input.textRegions)) {
    regions[name] = validateRegion(value, name);
  }
  return {
    schemaVersion: 1,
    textRegions: regions as FrameTextManifest['textRegions'],
    ...(isRecord(input.metadata) ? { metadata: input.metadata } : {}),
  };
}

export function resolveTextRegion(region: FrameTextRegion, card: CardSize): ResolvedTextRegion {
  return {
    ...region,
    x: region.x * card.width,
    y: region.y * card.height,
    width: region.width * card.width,
    height: region.height * card.height,
    fontSizePx: region.style.fontSize * card.width,
    lineHeightPx: (region.style.lineHeight ?? 1.2) * region.style.fontSize * card.width,
    letterSpacingPx: resolveLetterSpacing(region.style.letterSpacing ?? '0px', region.style.fontSize * card.width),
  };
}

function validateRegion(input: unknown, name: string): FrameTextRegion {
  if (!isRecord(input)) throw new Error(`Região "${name}" deve ser um objeto.`);
  const { x, y, width, height } = input;
  if (![x, y, width, height].every((value) => typeof value === 'number' && Number.isFinite(value))) {
    throw new Error(`Região "${name}": x, y, width e height precisam ser números finitos.`);
  }
  if ((x as number) < 0 || (y as number) < 0 || (width as number) <= 0 || (height as number) <= 0
    || (x as number) + (width as number) > 1 || (y as number) + (height as number) > 1) {
    throw new Error(`Região "${name}" precisa caber dentro da carta usando coordenadas de 0 a 1.`);
  }
  if (!isRecord(input.style)) throw new Error(`Região "${name}": style deve ser um objeto.`);
  const style = input.style;
  const fontFamily = style.fontFamily;
  const fontSize = style.fontSize;
  const fontWeight = style.fontWeight;
  const fontStyle = style.fontStyle;
  const color = style.color;
  const textAlign = style.textAlign;
  const verticalAlign = style.verticalAlign;
  if (typeof fontFamily !== 'string' || !fontFamily.trim() || fontFamily.length > 200) throw new Error(`Região "${name}": fontFamily inválida.`);
  if (typeof fontSize !== 'number' || !Number.isFinite(fontSize) || fontSize <= 0 || fontSize > 0.5) throw new Error(`Região "${name}": fontSize deve ser uma fração positiva da largura da carta (máximo 0.5).`);
  if (typeof fontWeight !== 'string' || !/^(normal|bold|bolder|lighter|[1-9]00)$/.test(fontWeight)) throw new Error(`Região "${name}": fontWeight inválido.`);
  if (fontStyle !== 'normal' && fontStyle !== 'italic') throw new Error(`Região "${name}": fontStyle deve ser normal ou italic.`);
  if (typeof color !== 'string' || !isValidColor(color)) throw new Error(`Região "${name}": color não é uma cor CSS reconhecida.`);
  if (!['left', 'center', 'right', 'start', 'end'].includes(String(textAlign))) throw new Error(`Região "${name}": textAlign inválido.`);
  if (!['top', 'middle', 'bottom'].includes(String(verticalAlign))) throw new Error(`Região "${name}": verticalAlign deve ser top, middle ou bottom.`);
  const lineHeight = style.lineHeight;
  if (lineHeight !== undefined && (typeof lineHeight !== 'number' || !Number.isFinite(lineHeight) || lineHeight < 0.5 || lineHeight > 4)) {
    throw new Error(`Região "${name}": lineHeight deve ser um multiplicador entre 0.5 e 4.`);
  }
  const letterSpacing = style.letterSpacing;
  if (letterSpacing !== undefined && (typeof letterSpacing !== 'string' || !isLetterSpacing(letterSpacing))) {
    throw new Error(`Região "${name}": letterSpacing deve ser "normal" ou uma medida CSS em px, em ou rem.`);
  }
  return {
    x: x as number, y: y as number, width: width as number, height: height as number,
    style: {
      fontFamily, fontSize, fontWeight, fontStyle, color,
      textAlign: textAlign as FrameTextRegion['style']['textAlign'],
      verticalAlign: verticalAlign as FrameTextRegion['style']['verticalAlign'],
      ...(lineHeight !== undefined ? { lineHeight: lineHeight as number } : {}),
      ...(letterSpacing !== undefined ? { letterSpacing: letterSpacing as string } : {}),
    },
  };
}

function resolveLetterSpacing(value: string, fontSizePx: number): number {
  if (value === 'normal') return 0;
  const match = /^(-?(?:\d+\.?\d*|\.\d+))(px|em|rem)$/.exec(value);
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === 'px') return amount;
  if (unit === 'rem') return amount * 16;
  return amount * fontSizePx;
}

function isLetterSpacing(value: string): boolean {
  return value === 'normal' || /^-?(?:\d+\.?\d*|\.\d+)(px|em|rem)$/.test(value);
}

function isValidColor(value: string): boolean {
  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') return CSS.supports('color', value);
  return /^#[\da-f]{3,8}$/i.test(value)
    || /^(?:rgba?|hsla?)\([\d.%\s,/-]+\)$/i.test(value)
    || /^(?:black|white|red|green|blue|transparent|brown|orange|purple|gold|gray|grey|navy|teal|maroon|olive|silver|yellow|aqua|fuchsia)$/i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readBlobWithFileReader(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Falha lendo o manifesto.'));
    reader.readAsText(blob);
  });
}
