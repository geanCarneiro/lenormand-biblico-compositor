export interface FrameCandidate {
  id: string;
  frame: File;
  manifest?: File;
}

export function findFrameManifestSidecar(frame: File, files: File[]): File | undefined {
  const expectedName = getFrameSidecarName(frame.name);
  const parent = relativeParent(frame);
  return files.find((file) => file.name === expectedName && relativeParent(file) === parent);
}

export function getFrameCandidates(files: File[]): FrameCandidate[] {
  return files
    .filter((file) => file.name.toLowerCase().endsWith('.png') || file.type === 'image/png')
    .map((frame, index) => ({
      id: `${index}:${relativePath(frame) || frame.name}`,
      frame,
      manifest: findFrameManifestSidecar(frame, files),
    }));
}

export function getFrameSidecarName(frameName: string): string {
  return `${frameName.replace(/\.png$/i, '')}.json`;
}

function relativePath(file: File): string {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || '';
}

function relativeParent(file: File): string {
  const path = relativePath(file);
  return path ? path.split('/').slice(0, -1).join('/') : '';
}
