import { PhotoElement } from '../types/template';

export interface PhotoFilterPreset {
  id: string;
  name: string;
  description: string;
  css: string;
}

export const PHOTO_FILTER_PRESETS: PhotoFilterPreset[] = [
  { id: 'none', name: 'Normal', description: 'Original unedited photo', css: 'none' },
  { id: 'grayscale', name: 'B&W', description: 'Classic black and white', css: 'grayscale(100%) contrast(105%)' },
  { id: 'sepia', name: 'Sepia', description: 'Rich antique sepia tone', css: 'sepia(90%) contrast(105%) saturate(120%)' },
  { id: 'warm', name: 'Warm', description: 'Golden sunlit glow', css: 'sepia(30%) saturate(130%) brightness(105%)' },
  { id: 'vintage', name: 'Vintage', description: 'Retro film look', css: 'sepia(55%) contrast(110%) brightness(95%)' },
  { id: 'vivid', name: 'Vivid', description: 'Vibrant colors and boosted contrast', css: 'saturate(150%) contrast(115%)' },
  { id: 'dim', name: 'Dim for Text', description: 'Darkens photo to make light text pop', css: 'brightness(68%) contrast(95%)' },
  { id: 'lighten', name: 'Soft Wash', description: 'Lightens photo to make dark text pop', css: 'brightness(135%) contrast(90%)' },
  { id: 'soft', name: 'Soft Focus', description: 'Subtle blur to smooth textures behind text', css: 'contrast(88%) blur(1.5px)' },
];

/**
 * Computes the complete CSS filter string for a PhotoElement.
 */
export function getPhotoFilterCss(photo: PhotoElement): string {
  const parts: string[] = [];

  // Base preset filter
  switch (photo.filter) {
    case 'grayscale':
      parts.push('grayscale(100%) contrast(105%)');
      break;
    case 'sepia':
      parts.push('sepia(90%) contrast(105%) saturate(120%)');
      break;
    case 'warm':
      parts.push('sepia(30%) saturate(130%) brightness(105%)');
      break;
    case 'vintage':
      parts.push('sepia(55%) contrast(110%) brightness(95%)');
      break;
    case 'vivid':
      parts.push('saturate(150%) contrast(115%)');
      break;
    case 'dim':
      parts.push('brightness(68%) contrast(95%)');
      break;
    case 'lighten':
      parts.push('brightness(135%) contrast(90%)');
      break;
    case 'soft':
      parts.push('contrast(88%) blur(1.5px)');
      break;
    case 'none':
    default:
      break;
  }

  // Custom Brightness adjustment (slider from 40% to 180%)
  if (typeof photo.brightness === 'number' && photo.brightness !== 100) {
    parts.push(`brightness(${photo.brightness}%)`);
  }

  // Custom Contrast adjustment (slider from 50% to 160%)
  if (typeof photo.contrast === 'number' && photo.contrast !== 100) {
    parts.push(`contrast(${photo.contrast}%)`);
  }

  // Custom Soft Blur adjustment (slider from 0 to 10px)
  if (typeof photo.blur === 'number' && photo.blur > 0) {
    parts.push(`blur(${photo.blur}px)`);
  }

  return parts.length > 0 ? parts.join(' ') : 'none';
}

/**
 * Computes background color for tint wash overlays to help text stand out against busy photos.
 */
export function getPhotoOverlayColor(
  tint?: PhotoElement['overlayTint'],
  opacityPercent?: number
): string | null {
  if (!tint || tint === 'none') return null;
  const opacity = typeof opacityPercent === 'number' ? opacityPercent : 35;
  const alpha = Math.max(0, Math.min(1, opacity / 100));

  switch (tint) {
    case 'dark-wash':
      return `rgba(0, 0, 0, ${alpha})`;
    case 'light-wash':
      return `rgba(255, 255, 255, ${alpha})`;
    case 'warm-wash':
      return `rgba(245, 158, 11, ${alpha * 0.8})`;
    case 'rose-wash':
      return `rgba(244, 63, 94, ${alpha * 0.75})`;
    default:
      return null;
  }
}
