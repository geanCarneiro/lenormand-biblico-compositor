export type ApprovalStatus = 'draft' | 'approved';
export type ReferenceStatus = 'pending' | 'approved';

export interface CardData {
  id: string;
  number: number;
  title: string;
  bibleReference: string;
  referenceStatus: ReferenceStatus;
  approvalStatus: ApprovalStatus;
}

export interface Rect { x: number; y: number; width: number; height: number }
export interface Point { x: number; y: number }
export interface ImageTransform { zoom: number; x: number; y: number }

export interface CardTemplate {
  version: string;
  provisional: boolean;
  canvas: { width: number; height: number };
  framePath: string;
  illustration: Rect;
  text: {
    number: { x: number; y: number; maxWidth: number; align: CanvasTextAlign; font: string; color: string };
    title: { x: number; y: number; maxWidth: number; align: CanvasTextAlign; font: string; color: string };
    reference: { x: number; y: number; maxWidth: number; align: CanvasTextAlign; font: string; color: string };
  };
}

export interface CardWorkspace {
  illustrationAssetId: string | null;
  transform: ImageTransform;
}

export interface ProjectDocument {
  id: 'lenormand-biblico-local-project';
  schemaVersion: 1;
  templateVersion: string;
  frameAssetId: string | null;
  cards: Record<string, CardData & CardWorkspace>;
  updatedAt: string;
}

export interface StoredAsset {
  id: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  role: 'frame' | 'illustration';
  createdAt: string;
}
