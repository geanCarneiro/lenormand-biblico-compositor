import { describe, expect, it } from 'vitest';
import { validateImageFile } from './files';

describe('image file validation', () => {
  it('accepts PNG frames and supported illustrations', () => {
    expect(() => validateImageFile(new File(['png'], 'frame.png', { type: 'image/png' }), 'frame')).not.toThrow();
    expect(() => validateImageFile(new File(['jpeg'], 'scene.jpg', { type: 'image/jpeg' }), 'illustration')).not.toThrow();
  });
  it('rejects an unsupported frame or illustration type', () => {
    expect(() => validateImageFile(new File(['x'], 'frame.jpg', { type: 'image/jpeg' }), 'frame')).toThrow(/PNG/);
    expect(() => validateImageFile(new File(['x'], 'scene.svg', { type: 'image/svg+xml' }), 'illustration')).toThrow(/Use uma imagem/);
  });
});
