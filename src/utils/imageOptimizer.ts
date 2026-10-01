/**
 * Utility for client-side image optimization and compression.
 * Resizes large user uploads (e.g. 5MB-15MB camera photos) down to lightweight web-ready
 * WebP/JPEG images (~60KB - 120KB) so they fit comfortably within both browser
 * localStorage quotas (5MB origin cap) and Postgres document limits (1MB per doc).
 */

export interface OptimizedImageResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Resizes and compresses an image File or Blob using HTML5 Canvas.
 */
export async function optimizeImageFile(
  file: File | Blob,
  maxDimension = 1200,
  quality = 0.82
): Promise<OptimizedImageResult> {
  return new Promise((resolve, reject) => {
    // If not in a browser environment with canvas
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('Window or document not available for canvas optimization'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { naturalWidth: width, naturalHeight: height } = img;
      if (!width || !height) {
        width = img.width || 800;
        height = img.height || 600;
      }

      // Proportional downscale
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d', { alpha: true });

      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Attempt webp export first, fallback to jpeg if unsupported
      let chosenType = 'image/webp';
      let dataUrl = canvas.toDataURL(chosenType, quality);

      if (!dataUrl.startsWith('data:image/webp')) {
        chosenType = 'image/jpeg';
        dataUrl = canvas.toDataURL(chosenType, quality);
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            // Fallback blob from base64
            const byteString = atob(dataUrl.split(',')[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            blob = new Blob([ab], { type: chosenType });
          }
          resolve({ dataUrl, blob, width, height });
        },
        chosenType,
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image for optimization: ${err}`));
    };

    img.src = objectUrl;
  });
}

/**
 * Optimizes an existing base64 Data URL if it is excessively large (>200KB).
 */
export async function optimizeDataUrlIfLarge(
  dataUrl: string,
  maxDimension = 1200,
  quality = 0.82
): Promise<string> {
  // If it's a remote URL or small data URL (< 250KB chars), return as is
  if (!dataUrl.startsWith('data:') || dataUrl.length < 250_000) {
    return dataUrl;
  }

  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const optimized = await optimizeImageFile(blob, maxDimension, quality);
    return optimized.dataUrl;
  } catch (err) {
    console.warn('Failed to compress large data URL:', err);
    return dataUrl;
  }
}

/**
 * Extracts the primary customized visual thumbnail for a card design.
 * Prioritizes the user's uploaded photo on the front page, followed by
 * background images or inside photos, and finally falls back to template thumbnail.
 */
export function getCardDesignThumbnail(
  pages?: {
    front?: { elements?: any[]; backgroundImage?: string };
    insideLeft?: { elements?: any[] };
    insideRight?: { elements?: any[] };
  },
  fallbackTemplateThumbnail = ''
): string {
  if (!pages?.front) return fallbackTemplateThumbnail;

  // 1. Look for user photo element on front page
  const frontPhoto = pages.front.elements?.find((el) => el.type === 'photo');
  if (frontPhoto?.imageUrl && !frontPhoto.imageUrl.includes('placeholder')) {
    return frontPhoto.imageUrl;
  }

  // 2. Look for customized front background image
  if (pages.front.backgroundImage) {
    return pages.front.backgroundImage;
  }

  // 3. Look for inside photo
  const insidePhoto = pages.insideLeft?.elements?.find((el) => el.type === 'photo');
  if (insidePhoto?.imageUrl && !insidePhoto.imageUrl.includes('placeholder')) {
    return insidePhoto.imageUrl;
  }

  return fallbackTemplateThumbnail || '';
}
