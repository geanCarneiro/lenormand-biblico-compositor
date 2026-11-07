import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ProjectDocument, StoredAsset } from '../types';
import { cardCatalog } from '../data/cards';
import { CARD_TEMPLATE } from '../template';

interface LenormandDB extends DBSchema {
  project: { key: string; value: ProjectDocument };
  assets: { key: string; value: StoredAsset };
}

const DATABASE_NAME = 'lenormand-biblico-compositor';
const PROJECT_ID = 'lenormand-biblico-local-project';
let databasePromise: Promise<IDBPDatabase<LenormandDB>> | undefined;

function db(): Promise<IDBPDatabase<LenormandDB>> {
  databasePromise ??= openDB<LenormandDB>(DATABASE_NAME, 1, {
    upgrade(database) {
      database.createObjectStore('project');
      database.createObjectStore('assets', { keyPath: 'id' });
    },
  });
  return databasePromise;
}

export function createEmptyProject(): ProjectDocument {
  const cards = Object.fromEntries(cardCatalog.map((card) => [card.id, {
    ...card,
    illustrationAssetId: null,
    transform: { zoom: 1, x: 0, y: 0 },
  }]));
  return {
    id: PROJECT_ID,
    schemaVersion: 1,
    templateVersion: CARD_TEMPLATE.version,
    frameAssetId: null,
    cards,
    updatedAt: new Date().toISOString(),
  };
}

export async function loadProject(): Promise<ProjectDocument> {
  const database = await db();
  return (await database.get('project', PROJECT_ID)) ?? createEmptyProject();
}

export async function saveProject(project: ProjectDocument): Promise<void> {
  const database = await db();
  await database.put('project', { ...project, updatedAt: new Date().toISOString() }, PROJECT_ID);
}

export async function saveAsset(asset: StoredAsset): Promise<void> {
  const database = await db();
  await database.put('assets', asset);
}

export async function getAsset(id: string): Promise<StoredAsset | undefined> {
  const database = await db();
  return database.get('assets', id);
}

export async function deleteAsset(id: string): Promise<void> {
  await (await db()).delete('assets', id);
}

export async function replaceProjectAndAssets(project: ProjectDocument, assets: StoredAsset[]): Promise<void> {
  const database = await db();
  const transaction = database.transaction(['project', 'assets'], 'readwrite');
  for (const asset of assets) await transaction.objectStore('assets').put(asset);
  await transaction.objectStore('project').put(project, PROJECT_ID);
  await transaction.done;
}

export async function clearDatabaseForTests(): Promise<void> {
  const database = await db();
  await database.clear('project');
  await database.clear('assets');
}
