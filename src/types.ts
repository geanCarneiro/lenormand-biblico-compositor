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
  defaultTextManifestPath: string;
  outerMask: { version: string; path: string; radiusPx: number };
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
  frameManifestAssetId: string | null;
  cards: Record<string, CardData & CardWorkspace>;
  updatedAt: string;
}

export interface StoredAsset {
  id: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  role: 'frame' | 'frame-manifest' | 'illustration';
  createdAt: string;
}

export type ManifestTextAlign = 'left' | 'center' | 'right' | 'start' | 'end';
export type ManifestVerticalAlign = 'top' | 'middle' | 'bottom';

export interface FrameTextStyle {
  fontFamily: string;
  /** Fraction of the card width, not CSS pixels. */
  fontSize: number;
  fontWeight: string;
  fontStyle: 'normal' | 'italic';
  color: string;
  textAlign: ManifestTextAlign;
  verticalAlign: ManifestVerticalAlign;
  /** Unitless multiplier of the resolved font size. */
  lineHeight?: number;
  /** CSS length (px, em, or rem); defaults to 0px. */
  letterSpacing?: string;
}

export interface FrameTextRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  style: FrameTextStyle;
}

export interface FrameTextManifest {
  schemaVersion: 1;
  textRegions: {
    number: FrameTextRegion;
    title: FrameTextRegion;
    reference: FrameTextRegion;
    [key: string]: FrameTextRegion;
  };
  metadata?: Record<string, unknown>;
}
