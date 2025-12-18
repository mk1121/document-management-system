/**
 * Processes an image file to ensure it fits within dimensions suitable for
 * storage and transmission, using High-Efficiency WebP compression.
 *
 * Strategy for "Lossless-like" Compression:
 * 1. Resizing: Limits max dimension to 2560px (QHD). This ensures full-page
 *    documents retain enough detail for text legibility.
 * 2. Format: Uses 'image/webp' for superior compression vs JPEG.
 * 3. Quality: Sets quality to 0.85. This minimizes artifacts around text edges,
 *    providing a balance where text remains sharp for OCR/human reading while
 *    still offering significant savings over raw camera outputs.
 */
export const compressImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Increased max dimension to 2560px to improve legibility for
        // full-page document captures.
        const MAX_DIMENSION = 2560;
        if (width > height) {
          if (width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // High quality smoothing for text readability
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP with 0.85 quality.
        // Adjusted to 0.85 to prioritize text clarity over aggressive compression.
        // Fallback: If browser doesn't support WebP, it returns PNG automatically.
        const dataUrl = canvas.toDataURL('image/webp', 0.85);
        resolve(dataUrl);
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
};
