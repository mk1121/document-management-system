import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { compressImage } from './imageService';

describe('imageService', () => {
  beforeEach(() => {
    // Mock FileReader
    class MockFileReader {
      onload: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      readAsDataURL(_: Blob) {
        setTimeout(() => {
          if (this.onload) {
            this.onload({ target: { result: 'data:image/png;base64,fake-image-data' } });
          }
        }, 0);
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);

    // Mock Image
    class MockImage {
      onload: (() => void) | null = null;
      onerror: ((err: any) => void) | null = null;
      width = 1000;
      height = 1000;
      set src(_: string) {
        setTimeout(() => {
          if (this.onload) {
            this.onload();
          }
        }, 0);
      }
    }
    vi.stubGlobal('Image', MockImage);

    // Mock HTMLCanvasElement
    const mockContext = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      drawImage: vi.fn(),
    };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockContext),
      toDataURL: vi.fn((type, _) => `data:${type};base64,compressed-data`),
    };
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return mockCanvas as any;
      }
      return document.createElement(tagName);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('compresses image successfully', async () => {
    const file = new File(['fake content'], 'test.jpg', { type: 'image/jpeg' });
    const result = await compressImage(file);
    expect(result).toBe('data:image/webp;base64,compressed-data');
  });

  it('rejects if file reading fails', async () => {
    // Override MockFileReader for this test to fail
    class FailFileReader {
      onload: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      readAsDataURL(_: Blob) {
        setTimeout(() => {
          if (this.onerror) {
            this.onerror(new Error('Read failed'));
          }
        }, 0);
      }
    }
    vi.stubGlobal('FileReader', FailFileReader);

    const file = new File(['fake content'], 'test.jpg', { type: 'image/jpeg' });
    await expect(compressImage(file)).rejects.toThrow('Read failed');
  });
});
