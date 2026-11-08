import { cardCatalog } from '../data/cards';
import { CARD_TEMPLATE } from '../template';
import type { CardData, CardWorkspace, ProjectDocument } from '../types';

type ExistingCard = Partial<CardData & CardWorkspace> & { referenceStatus?: string };

/** Updates catalog fields from cartas.json without overwriting local card edits. */
export function normalizeProject(input: ProjectDocument): ProjectDocument {
  const oldCards = input.cards ?? {};
  const cards = Object.fromEntries(cardCatalog.map((seed) => {
    const existing = oldCards[seed.id] as ExistingCard | undefined;
    const existingReference = typeof existing?.bibleReference === 'string' ? existing.bibleReference : '';
    const hasReferenceEdit = existingReference.trim().length > 0;
    const transform = isTransform(existing?.transform) ? existing.transform : { zoom: 1, x: 0, y: 0 };
    return [seed.id, {
      ...seed,
      id: seed.id,
      number: seed.number,
      title: migrateDefaultTitle(existing?.title, seed),
      bibleReference: hasReferenceEdit ? existingReference : seed.bibleReference,
      referenceStatus: hasReferenceEdit && existing?.referenceStatus === 'approved' ? 'approved' : 'pending',
      approvalStatus: existing?.approvalStatus === 'approved' ? 'approved' : 'draft',
      illustrationAssetId: typeof existing?.illustrationAssetId === 'string' ? existing.illustrationAssetId : null,
      transform,
    }];
  })) as ProjectDocument['cards'];

  return {
    ...input,
    id: 'lenormand-biblico-local-project',
    schemaVersion: 1,
    templateVersion: typeof input.templateVersion === 'string' ? input.templateVersion : CARD_TEMPLATE.version,
    frameAssetId: typeof input.frameAssetId === 'string' ? input.frameAssetId : null,
    frameManifestAssetId: typeof input.frameAssetId === 'string' && typeof input.frameManifestAssetId === 'string' ? input.frameManifestAssetId : null,
    cards,
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : new Date().toISOString(),
  };
}

function migrateDefaultTitle(title: unknown, seed: CardData): string {
  if (typeof title !== 'string') return seed.title;
  const legacyTitle = seed.number === 8 ? 'Sepultura' : seed.number === 16 ? 'Estrela' : seed.title;
  return title === legacyTitle || title === seed.title ? seed.title : title;
}

function isTransform(value: unknown): value is CardWorkspace['transform'] {
  if (typeof value !== 'object' || value === null) return false;
  const transform = value as CardWorkspace['transform'];
  return [transform.x, transform.y, transform.zoom].every((number) => typeof number === 'number' && Number.isFinite(number))
    && transform.zoom >= 0.5 && transform.zoom <= 3;
}
