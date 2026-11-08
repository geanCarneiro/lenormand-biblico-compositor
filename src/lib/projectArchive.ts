import JSZip from 'jszip';
import { cardCatalog } from '../data/cards';
import { CARD_TEMPLATE } from '../template';
import { normalizeProject } from './normalizeProject';
import { parseFrameTextManifestBlob } from './frameManifest';
import type { ProjectDocument, StoredAsset } from '../types';

const MAX_ARCHIVE_BYTES = 220 * 1024 * 1024;
const MAX_ASSET_BYTES = 20 * 1024 * 1024;
const MANIFEST_PATH = 'manifest.json';

interface AssetManifest {
  id: string;
  filename: string;
  mimeType: string;
  role: StoredAsset['role'];
  createdAt: string;
  path: string;
}
interface ArchiveManifest {
  app: 'lenormand-biblico-compositor';
  schemaVersion: 1;
  templateVersion: string;
  project: ProjectDocument;
  assets: AssetManifest[];
}

export async function exportProjectZip(project: ProjectDocument, assets: StoredAsset[]): Promise<Blob> {
  const zip = new JSZip();
  const assetManifest: AssetManifest[] = [];
  for (const asset of assets) {
    const path = `assets/${encodeURIComponent(asset.id)}`;
    zip.file(path, asset.blob);
    assetManifest.push({ id: asset.id, filename: asset.filename, mimeType: asset.mimeType, role: asset.role, createdAt: asset.createdAt, path });
  }
  const manifest: ArchiveManifest = {
    app: 'lenormand-biblico-compositor',
    schemaVersion: 1,
    templateVersion: project.templateVersion,
    project,
    assets: assetManifest,
  };
  zip.file(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
}

export async function importProjectZip(file: Blob): Promise<{ project: ProjectDocument; assets: StoredAsset[] }> {
  if (file.size > MAX_ARCHIVE_BYTES) throw new Error('O projeto ZIP excede o limite de 220 MB.');
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(file, { checkCRC32: true }); }
  catch { throw new Error('O arquivo não é um ZIP válido ou está corrompido.'); }
  const manifestFile = zip.file(MANIFEST_PATH);
  if (!manifestFile) throw new Error('O ZIP não contém manifest.json.');
  let unknown: unknown;
  try { unknown = JSON.parse(await manifestFile.async('text')); }
  catch { throw new Error('O manifesto JSON está inválido.'); }
  const manifest = validateManifest(unknown);
  let totalBytes = 0;
  const assets: StoredAsset[] = [];
  for (const asset of manifest.assets) {
    const archiveFile = zip.file(asset.path);
    if (!archiveFile || archiveFile.dir) throw new Error(`Arquivo de recurso ausente: ${asset.filename}`);
    const blob = await archiveFile.async('blob');
    totalBytes += blob.size;
    if (!blob.size || blob.size > MAX_ASSET_BYTES || totalBytes > MAX_ARCHIVE_BYTES) {
      throw new Error('O projeto contém imagem vazia ou acima do limite permitido.');
    }
    if (blob.type && blob.type !== asset.mimeType) throw new Error(`Tipo de arquivo inconsistente: ${asset.filename}`);
    assets.push({ id: asset.id, filename: asset.filename, mimeType: asset.mimeType, role: asset.role, createdAt: asset.createdAt, blob: new Blob([blob], { type: asset.mimeType }) });
  }
  await validateProjectFrameManifest(manifest.project, assets);
  return { project: normalizeProject(manifest.project), assets };
}

function validateManifest(value: unknown): ArchiveManifest {
  if (!isRecord(value) || value.app !== 'lenormand-biblico-compositor' || value.schemaVersion !== 1 || !Array.isArray(value.assets)) {
    throw new Error('Manifesto de projeto incompatível.');
  }
  if (typeof value.templateVersion !== 'string' || !isProject(value.project)) throw new Error('Dados do projeto inválidos.');
  if (value.project.schemaVersion !== 1 || value.project.id !== 'lenormand-biblico-local-project') throw new Error('Versão ou identificador do projeto incompatível.');
  const assets = value.assets;
  if (assets.length > 38) throw new Error('O projeto contém recursos demais.');
  const ids = new Set<string>();
  for (const item of assets) {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id || ids.has(item.id)
      || typeof item.filename !== 'string' || typeof item.mimeType !== 'string'
      || !['frame', 'frame-manifest', 'illustration'].includes(String(item.role)) || typeof item.createdAt !== 'string'
      || typeof item.path !== 'string' || item.path !== `assets/${encodeURIComponent(item.id)}`) {
      throw new Error('Metadados de recurso inválidos no manifesto.');
    }
    ids.add(item.id);
    if (item.role === 'frame' && item.mimeType !== 'image/png') throw new Error('A moldura do projeto deve ser PNG.');
    if (item.role === 'frame-manifest' && !['application/json', 'text/json'].includes(item.mimeType)) throw new Error('O manifesto da moldura deve ser JSON.');
    if (item.role === 'illustration' && !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(item.mimeType)) throw new Error('Tipo de ilustração não permitido.');
  }
  const project = value.project;
  if (project.templateVersion !== value.templateVersion) throw new Error('Versões de template inconsistentes no manifesto.');
  if (project.frameAssetId && !ids.has(project.frameAssetId)) throw new Error('A moldura referenciada não está no ZIP.');
  if (project.frameAssetId && !assets.some((asset) => isRecord(asset) && asset.id === project.frameAssetId && asset.role === 'frame')) throw new Error('O recurso de moldura está marcado incorretamente.');
  if (project.frameManifestAssetId && !ids.has(project.frameManifestAssetId)) throw new Error('O manifesto da moldura não está no ZIP.');
  if (project.frameManifestAssetId && !assets.some((asset) => isRecord(asset) && asset.id === project.frameManifestAssetId && asset.role === 'frame-manifest')) throw new Error('O recurso de manifesto está marcado incorretamente.');
  if (project.frameManifestAssetId && !project.frameAssetId) throw new Error('O manifesto está sem uma moldura associada.');
  const catalogIds = new Set(cardCatalog.map((card) => card.id));
  if (Object.keys(project.cards).length !== 36) throw new Error('O projeto precisa conter as 36 cartas.');
  for (const [id, card] of Object.entries(project.cards)) {
    if (!catalogIds.has(id) || !isRecord(card) || card.id !== id) throw new Error(`Carta inválida: ${id}`);
    if (typeof card.number !== 'number' || !Number.isInteger(card.number) || card.number < 1 || card.number > 36 || typeof card.title !== 'string' || typeof card.bibleReference !== 'string') throw new Error(`Dados inválidos na carta ${id}.`);
    if (card.number !== Number(id.slice(-2))) throw new Error(`Numeração tradicional incorreta na carta ${id}.`);
    // Accept 'proposed' from ZIPs created by the previous JSON-integrated UI;
    // normalization maps it back to the app's existing pending approval state.
    if (card.referenceStatus !== undefined && !['pending', 'proposed', 'approved'].includes(String(card.referenceStatus))) throw new Error(`Status da referência inválido na carta ${id}.`);
    if (card.approvalStatus !== undefined && !['draft', 'approved'].includes(String(card.approvalStatus))) throw new Error(`Status de aprovação inválido na carta ${id}.`);
    if (!isRecord(card.transform) || ![card.transform.x, card.transform.y, card.transform.zoom].every((n) => typeof n === 'number' && Number.isFinite(n)) || card.transform.zoom < 0.5 || card.transform.zoom > 3) throw new Error(`Transformação inválida na carta ${id}.`);
    if (card.illustrationAssetId !== null && (typeof card.illustrationAssetId !== 'string' || !ids.has(card.illustrationAssetId))) throw new Error(`Ilustração ausente na carta ${id}.`);
    if (typeof card.illustrationAssetId === 'string' && !assets.some((asset) => isRecord(asset) && asset.id === card.illustrationAssetId && asset.role === 'illustration')) throw new Error(`Recurso de ilustração inválido na carta ${id}.`);
  }
  return value as unknown as ArchiveManifest;
}

async function validateProjectFrameManifest(project: ProjectDocument, assets: StoredAsset[]): Promise<void> {
  if (!project.frameManifestAssetId) return;
  const frame = assets.find((asset) => asset.id === project.frameAssetId);
  const manifest = assets.find((asset) => asset.id === project.frameManifestAssetId);
  if (!frame || !manifest) throw new Error('Moldura ou manifesto associado ausente no arquivo do projeto.');
  if (baseName(frame.filename) !== baseName(manifest.filename)) throw new Error('O manifesto da moldura precisa ter o mesmo nome-base do PNG.');
  try {
    await parseFrameTextManifestBlob(manifest.blob);
  } catch (cause) {
    if (cause instanceof Error && cause.message.startsWith('Manifesto')) throw cause;
    throw new Error(`Manifesto da moldura inválido: ${cause instanceof Error ? cause.message : 'JSON inválido.'}`);
  }
}

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

function isProject(value: unknown): value is ProjectDocument {
  if (!isRecord(value) || !isRecord(value.cards)) return false;
  return typeof value.templateVersion === 'string'
    && (value.frameAssetId === null || typeof value.frameAssetId === 'string')
    && typeof value.updatedAt === 'string';
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isKnownTemplateVersion(version: string): boolean {
  return version === CARD_TEMPLATE.version;
}
