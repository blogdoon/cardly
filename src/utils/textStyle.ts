import { TextElement } from '../types/template';

/**
 * Converts a hex color (#ffffff, #fff, etc.) or existing rgb string to rgba with opacity.
 */
export function hexToRgba(hexOrRgb: string, opacity: number = 1): string {
  if (!hexOrRgb) return `rgba(255, 255, 255, ${opacity})`;

  // If already rgba or hsla, return as-is
  if (hexOrRgb.startsWith('rgba') || hexOrRgb.startsWith('hsla')) {
    return hexOrRgb;
  }

  // If rgb(r, g, b)
  if (hexOrRgb.startsWith('rgb(')) {
    const match = hexOrRgb.match(/\d+/g);
    if (match && match.length >= 3) {
      return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${opacity})`;
    }
  }

  let hex = hexOrRgb.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  const num = parseInt(hex, 16);
  if (isNaN(num)) {
    return `rgba(255, 255, 255, ${opacity})`;
  }

  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, opacity))})`;
}

/**
 * Returns text-shadow CSS string based on textShadow property.
 */
export function getTextShadowCss(shadowType?: TextElement['textShadow']): string {
  switch (shadowType) {
    case 'soft-dark':
      return '0 2px 6px rgba(0, 0, 0, 0.75)';
    case 'strong-dark':
      return '0 3px 12px rgba(0, 0, 0, 0.95), 0 1px 3px rgba(0, 0, 0, 0.85)';
    case 'soft-light':
      return '0 0 10px rgba(255, 255, 255, 0.95), 0 0 20px rgba(255, 255, 255, 0.75)';
    case 'outline-dark':
      return '-1px -1px 0 rgba(0,0,0,0.85), 1px -1px 0 rgba(0,0,0,0.85), -1px 1px 0 rgba(0,0,0,0.85), 1px 1px 0 rgba(0,0,0,0.85), 0 2px 5px rgba(0,0,0,0.6)';
    case 'outline-light':
      return '-1px -1px 0 rgba(255,255,255,0.95), 1px -1px 0 rgba(255,255,255,0.95), -1px 1px 0 rgba(255,255,255,0.95), 1px 1px 0 rgba(255,255,255,0.95), 0 2px 5px rgba(0,0,0,0.25)';
    case 'none':
    default:
      return 'none';
  }
}

/**
 * Computes the complete CSS properties for readability over photos & backgrounds.
 * scaleFactor: ratio to scale padding and border-radius proportionally across preview/print sizes.
 */
export function computeTextReadabilityStyle(
  textEl: TextElement,
  scaleFactor: number = 1
): React.CSSProperties {
  const style: React.CSSProperties = {};

  // Background Box / Banner
  if (textEl.hasBackground) {
    const bgCol = textEl.backgroundColor || '#ffffff';
    const opacity = typeof textEl.backgroundOpacity === 'number' ? textEl.backgroundOpacity : 0.82;
    style.backgroundColor = hexToRgba(bgCol, opacity);

    const padV = Math.round((textEl.backgroundPadding ?? 8) * scaleFactor);
    const padH = Math.round(((textEl.backgroundPadding ?? 8) + 4) * scaleFactor);
    style.padding = `${padV}px ${padH}px`;

    const radius = textEl.borderRadius ?? 8;
    style.borderRadius = radius >= 999 ? '9999px' : `${Math.round(radius * scaleFactor)}px`;

    if (textEl.backdropBlur !== false) {
      style.backdropFilter = 'blur(4px)';
      style.WebkitBackdropFilter = 'blur(4px)';
    }

    style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.12)';
    style.boxSizing = 'border-box';
  } else {
    style.backgroundColor = 'transparent';
    style.padding = '0';
  }

  // Text Shadow / Glow
  const shadow = getTextShadowCss(textEl.textShadow);
  if (shadow && shadow !== 'none') {
    style.textShadow = shadow;
  }

  return style;
}
