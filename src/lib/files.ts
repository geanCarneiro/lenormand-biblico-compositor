const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const urlImageCache = new Map<string, Promise<HTMLImageElement>>();

export function validateImageFile(file: File, kind: 'frame' | 'illustration'): void {
  if (!file.size) throw new Error('O arquivo está vazio.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('A imagem deve ter no máximo 20 MB.');
  if (kind === 'frame' && (file.type !== 'image/png' || !file.name.toLowerCase().endsWith('.png'))) {
    throw new Error('A moldura deve ser um arquivo PNG.');
  }
  if (kind === 'illustration' && !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
    throw new Error('Use uma imagem PNG, JPEG, WebP ou GIF.');
  }
}

export function imageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(blob);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível abrir a imagem.')); };
    image.src = url;
  });
}

export function imageFromUrl(src: string): Promise<HTMLImageElement> {
  const cached = urlImageCache.get(src);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      urlImageCache.delete(src);
      reject(new Error(`Não foi possível carregar o recurso do template (${src}).`));
    };
    image.src = src;
  });
  urlImageCache.set(src, promise);
  return promise;
}
