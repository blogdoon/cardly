/**
 * The print renderer — a `designSnapshot` in, print-ready HTML out.
 *
 * WHY A SEPARATE RENDERER. `src/components/PrintPreview.tsx` renders the same
 * four pages in the browser, and that is the layout a customer approves. If
 * fulfilment drew the card its own way, the thing arriving in the post would not
 * be the thing they bought — and nothing would catch it, because both renderers
 * would still be individually correct. So this module is the single definition
 * of how a page becomes ink, and it is deliberately PURE (no React, no DOM, no
 * Deno, no Supabase): the same file is imported by the `fulfil-order` Edge
 * Function to make the real print file, and by `scripts/printLayout.check.ts` to
 * assert the two cannot drift apart.
 *
 * The element cases below are a port of `renderCardContent` in PrintPreview.tsx,
 * including its `panelWidth / 800` canvas scale and its translate(-50%,-50%)
 * centring. If you change one, change both — the check script asserts this file
 * handles every element type the React component handles.
 *
 * Output is HTML rather than a finished PDF because the layout is the hard part
 * and a PDF is one headless-Chromium print away from it. The function does that
 * conversion; keeping it out of here means this module stays testable in Node.
 *
 * SECURITY. Every value below becomes part of a print file, and these pages come
 * from customer-authored designs, so text, colours and URLs are escaped or
 * validated. A `</style>` or `"><script>` in a message field must not get in.
 */

import {
  BLEED_MM,
  CROP_MARK_MM,
  PRINT_SIZES,
  type PrintCardSize,
  type PrintSizeGeometry,
} from './printSizes.ts';

/**
 * The subset of a card page this renderer needs. Structural, and deliberately
 * not an import of `src/types/template.ts`: an Edge Function must not pull in
 * the app's type graph, which imports React-facing modules. `printLayout.check.ts`
 * asserts these stay assignable from the real `CardPageDefinition`.
 */
export interface PrintableElement {
  id: string;
  type: 'text' | 'photo' | 'sticker' | 'shape' | 'media';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity?: number;
  // text
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  lineHeight?: number;
  letterSpacing?: number;
  hasBackground?: boolean;
  backgroundColor?: string;
  backgroundOpacity?: number;
  backgroundPadding?: number;
  borderRadius?: number;
  textShadow?: string;
  // photo
  imageUrl?: string;
  filter?: string;
  brightness?: number;
  contrast?: number;
  blur?: number;
  overlayTint?: 'none' | 'dark-wash' | 'light-wash' | 'warm-wash' | 'rose-wash';
  overlayOpacity?: number;
  // sticker
  stickerId?: string;
  svg?: string;
  emoji?: string;
  stickerColor?: string;
  // shape
  shapeType?: 'rectangle' | 'circle' | 'heart' | 'star' | 'badge';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  // media
  mediaId?: string;
  mediaKind?: 'audio' | 'video';
  scanLabel?: string;
  /** Resolved by the function from `card_media`; absent means "no QR possible". */
  mediaUrl?: string;
}

export interface PrintablePage {
  pageType: 'front' | 'inside-left' | 'inside-right' | 'back';
  backgroundColor: string;
  backgroundGradient?: string;
  backgroundImage?: string;
  elements: PrintableElement[];
}

/** Sticker art the function resolved from `src/data/elements.ts`, by sticker id. */
export type StickerArt = Record<string, { svg?: string; emoji?: string; defaultColor?: string }>;

/** Escape for text nodes and double-quoted attribute values. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/**
 * A colour interpolated into a CSS string. Anything that is not a plain hex,
 * rgb(a) or hsl(a) value is dropped rather than passed through: this is the one
 * place a customer-authored string becomes a stylesheet.
 */
function safeColor(value: unknown, fallback: string): string {
  const raw = String(value ?? '').trim();
  if (/^#[0-9a-f]{3,8}$/i.test(raw)) return raw;
  if (/^rgba?\([\d.\s,%]+\)$/i.test(raw)) return raw;
  if (/^hsla?\([\d.\s,%deg]+\)$/i.test(raw)) return raw;
  return fallback;
}

/** http(s), root-relative or data: image sources only. `javascript:` must not reach an <img>. */
function safeImageUrl(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);/i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^\//.test(raw)) return raw;
  return null;
}

export function hexToRgba(hexOrRgb: string, opacity = 1): string {
  const raw = String(hexOrRgb ?? '');
  if (raw.startsWith('rgba') || raw.startsWith('hsla')) return raw;
  if (raw.startsWith('rgb(')) return `${raw.slice(0, -1)},${opacity})`;
  let hex = raw.replace('#', '').trim();
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const value = parseInt(hex, 16);
  if (Number.isNaN(value)) return `rgba(255,255,255,${opacity})`;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, opacity))})`;
}

/** `getTextShadowCss` from src/utils/textStyle.ts, as a CSS value. */
function textShadowCss(shadowType?: string): string {
  switch (shadowType) {
    case 'soft-dark':
      return '0 2px 6px rgba(0,0,0,0.75)';
    case 'strong-dark':
      return '0 3px 12px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.85)';
    case 'soft-light':
      return '0 0 10px rgba(255,255,255,0.95), 0 0 20px rgba(255,255,255,0.75)';
    case 'outline-dark':
      return '-1px -1px 0 rgba(0,0,0,0.85),1px -1px 0 rgba(0,0,0,0.85),-1px 1px 0 rgba(0,0,0,0.85),1px 1px 0 rgba(0,0,0,0.85),0 2px 5px rgba(0,0,0,0.6)';
    case 'outline-light':
      return '-1px -1px 0 rgba(255,255,255,0.95),1px -1px 0 rgba(255,255,255,0.95),-1px 1px 0 rgba(255,255,255,0.95),1px 1px 0 rgba(255,255,255,0.95),0 2px 5px rgba(255,255,255,0.25)';
    default:
      return '';
  }
}

/** `computeTextReadabilityStyle` from src/utils/textStyle.ts, as a CSS string. */
function textReadabilityCss(el: PrintableElement, scale: number): string {
  const out: string[] = [];
  if (el.hasBackground) {
    const bg = safeColor(el.backgroundColor, '#ffffff');
    const raw = typeof el.backgroundOpacity === 'number' ? el.backgroundOpacity : 0.82;
    const opacity = Math.min(1, Math.max(0, raw));
    out.push(`background-color:${hexToRgba(bg, opacity)}`);
    const pad = num(el.backgroundPadding, 8);
    out.push(`padding:${Math.round(pad * scale)}px ${Math.round((pad + 4) * scale)}px`);
    const radius = num(el.borderRadius, 8);
    out.push(`border-radius:${radius >= 999 ? '9999px' : `${Math.round(radius * scale)}px`}`);
    out.push('box-shadow:0 2px 8px rgba(0,0,0,0.12)');
    out.push('box-sizing:border-box');
  }
  const shadow = textShadowCss(el.textShadow);
  if (shadow) out.push(`text-shadow:${shadow}`);
  // Trailing separator: this string is concatenated with the positioning CSS
  // below, and without it the last declaration fuses with `position:absolute`
  // into one invalid property — which silently drops `position` entirely and
  // lets the element escape its panel.
  return out.length ? `${out.join(';')};` : '';
}

/** `getPhotoFilterCss` from src/utils/photoFilter.ts. */
function photoFilterCss(el: PrintableElement): string {
  const parts: string[] = [];
  switch (el.filter) {
    case 'grayscale':
      parts.push('grayscale(100%)', 'contrast(105%)');
      break;
    case 'sepia':
      parts.push('sepia(90%)', 'contrast(105%)', 'saturate(120%)');
      break;
    case 'warm':
      parts.push('sepia(30%)', 'saturate(130%)', 'brightness(105%)');
      break;
    case 'vintage':
      parts.push('sepia(55%)', 'contrast(110%)', 'brightness(95%)');
      break;
    case 'vivid':
      parts.push('saturate(150%)', 'contrast(115%)');
      break;
    case 'dim':
      parts.push('brightness(68%)', 'contrast(95%)');
      break;
    case 'lighten':
      parts.push('brightness(135%)', 'contrast(90%)');
      break;
    case 'soft':
      parts.push('contrast(88%)', 'blur(1.5px)');
      break;
    default:
      break;
  }
  if (typeof el.brightness === 'number' && el.brightness !== 100) {
    parts.push(`brightness(${el.brightness}%)`);
  }
  if (typeof el.contrast === 'number' && el.contrast !== 100) {
    parts.push(`contrast(${el.contrast}%)`);
  }
  if (typeof el.blur === 'number' && el.blur > 0) parts.push(`blur(${el.blur}px)`);
  return parts.length ? parts.join(' ') : 'none';
}

/** `getPhotoOverlayColor` from src/utils/photoFilter.ts. */
function photoOverlayCss(el: PrintableElement): string | null {
  if (!el.overlayTint || el.overlayTint === 'none') return null;
  const alpha = Math.max(0, Math.min(1, num(el.overlayOpacity, 35) / 100));
  switch (el.overlayTint) {
    case 'dark-wash':
      return `rgba(0,0,0,${alpha})`;
    case 'light-wash':
      return `rgba(255,255,255,${alpha})`;
    case 'warm-wash':
      return `rgba(245,158,11,${alpha * 0.8})`;
    case 'rose-wash':
      return `rgba(244,63,94,${alpha * 0.75})`;
    default:
      return null;
  }
}

/** Sticker art: the element's own SVG, else the catalog's by `stickerId`. */
function stickerSvgFor(el: PrintableElement, catalog: StickerArt): string | null {
  const own = el.svg ?? catalog[el.stickerId ?? '']?.svg;
  if (!own) return null;
  if (own.includes('width="100%"')) return own;
  return own.replace(
    /<svg\b/i,
    '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block;" '
  );
}

/** The QR block for a media element. A card cannot play audio; the phone can. */
function mediaQrHtml(el: PrintableElement, scale: number): string {
  const url = safeImageUrl(el.mediaUrl);
  const label = escapeHtml(
    el.scanLabel ?? (el.mediaKind === 'audio' ? 'Scan to listen' : 'Scan to watch')
  );
  if (!url) {
    // No media row (deleted, or the id never resolved). Print the label without a
    // dead-looking QR box that pretends to work: an operator has to be able to
    // tell "no memory attached" from "memory attached, QR failed".
    return `<div style="text-align:center;font-family:sans-serif;font-size:${Math.max(
      7,
      Math.round(9 * scale)
    )}px;color:#334155;line-height:1.25;">${label}</div>`;
  }
  const size = Math.round(64 * scale);
  const fontSize = Math.max(5, Math.round(7 * scale));
  const margin = Math.max(1, Math.round(2 * scale));
  return (
    `<div style="text-align:center;">` +
    `<img src="${escapeHtml(url)}" alt="" style="width:${size}px;height:${size}px;display:block;margin:0 auto;" />` +
    `<div style="font-family:sans-serif;font-size:${fontSize}px;color:#334155;margin-top:${margin}px;">${label}</div>` +
    `</div>`
  );
}

function shapeInnerSvg(el: PrintableElement): string {
  const fill = safeColor(el.fill, '#e11d48');
  const stroke = el.stroke ? safeColor(el.stroke, fill) : 'none';
  const border = stroke === 'none' ? 'none' : `${num(el.strokeWidth, 0)}px solid ${stroke}`;
  switch (el.shapeType) {
    case 'circle':
      return `<div style="width:100%;height:100%;border-radius:50%;background:${fill};border:${border};"></div>`;
    case 'heart':
      return `<svg viewBox="0 0 24 24" style="width:100%;height:100%;" fill="${fill}" stroke="${stroke}" stroke-width="${num(
        el.strokeWidth,
        0
      )}"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>`;
    case 'star':
      return `<svg viewBox="0 0 24 24" style="width:100%;height:100%;" fill="${fill}" stroke="${stroke}" stroke-width="${num(
        el.strokeWidth,
        0
      )}"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>`;
    case 'badge':
      return `<div style="width:100%;height:100%;border-radius:16px;background:${fill};border:${border};"></div>`;
    case 'rectangle':
    default:
      return `<div style="width:100%;height:100%;border-radius:4px;background:${fill};border:${border};"></div>`;
  }
}

/** Shared positioning, matching PrintPreview: percentage coords, centred, rotated. */
function positionCss(el: PrintableElement): string {
  const rotation = num(el.rotation);
  return (
    `position:absolute;left:${num(el.x)}%;top:${num(el.y)}%;` +
    `transform:translate(-50%,-50%) rotate(${rotation}deg);z-index:${num(el.zIndex)};`
  );
}

const opacityCss = (el: PrintableElement): string =>
  typeof el.opacity === 'number' ? `opacity:${Math.min(1, Math.max(0, el.opacity))};` : '';

/** One element, positioned exactly as PrintPreview positions it. */
function renderElement(el: PrintableElement, scale: number, catalog: StickerArt): string {
  if (el.type === 'text') {
    const align =
      el.textAlign === 'center' || el.textAlign === 'right' ? el.textAlign : 'left';
    const css = [
      textReadabilityCss(el, scale),
      positionCss(el),
      `width:${num(el.width)}%;`,
      `font-family:${escapeHtml(el.fontFamily ?? 'sans-serif')};`,
      `font-size:${num(el.fontSize, 16) * scale}px;`,
      `color:${safeColor(el.color, '#1f2937')};`,
      `text-align:${align};`,
      `font-weight:${escapeHtml(el.fontWeight ?? 'normal')};`,
      `font-style:${escapeHtml(el.fontStyle ?? 'normal')};`,
      `text-decoration:${escapeHtml(el.textDecoration ?? 'none')};`,
      `line-height:${num(el.lineHeight, 1.3)};`,
      el.letterSpacing ? `letter-spacing:${num(el.letterSpacing)}px;` : '',
      'white-space:pre-wrap;',
    ]
      .filter(Boolean)
      .join('');
    return `<div style="${css}">${escapeHtml(el.text ?? '')}</div>`;
  }

  if (el.type === 'photo') {
    const url = safeImageUrl(el.imageUrl);
    const inner = url
      ? `<img src="${escapeHtml(url)}" alt="" style="filter:${photoFilterCss(
          el
        )};width:100%;height:100%;object-fit:cover;display:block;" />`
      : '';
    const overlay = photoOverlayCss(el);
    return (
      `<div style="${positionCss(el)}width:${num(el.width)}%;height:${num(el.height)}%;` +
      `border-radius:${num(el.borderRadius, 4)}px;overflow:hidden;${opacityCss(el)}">` +
      inner +
      (overlay ? `<div style="position:absolute;inset:0;background:${overlay};"></div>` : '') +
      `</div>`
    );
  }

  if (el.type === 'sticker') {
    const svg = stickerSvgFor(el, catalog);
    const emoji = el.emoji ?? catalog[el.stickerId ?? '']?.emoji;
    const color = safeColor(
      el.stickerColor ?? catalog[el.stickerId ?? '']?.defaultColor,
      '#e11d48'
    );
    const fontSize = Math.max(16, Math.round(num(el.width) * 2.8));
    const inner = svg
      ? `<div style="width:100%;height:100%;color:${color};">${svg}</div>`
      : emoji
        ? `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;line-height:1;">${escapeHtml(
            emoji
          )}</div>`
        : `<div style="width:100%;height:100%;border-radius:50%;background:#ffe4e6;"></div>`;
    return (
      `<div style="${positionCss(el)}width:${num(el.width)}%;aspect-ratio:1/1;` +
      `display:flex;align-items:center;justify-content:center;${opacityCss(el)}">${inner}</div>`
    );
  }

  if (el.type === 'shape') {
    return (
      `<div style="${positionCss(el)}width:${num(el.width)}%;height:${num(el.height)}%;` +
      `${opacityCss(el)}">${shapeInnerSvg(el)}</div>`
    );
  }

  if (el.type === 'media') {
    return (
      `<div style="${positionCss(el)}width:${num(el.width)}%;${opacityCss(el)}">` +
      `${mediaQrHtml(el, scale)}</div>`
    );
  }

  // An unknown element type is dropped rather than guessed at: a visible blank
  // gap an operator can chase beats a broken element they cannot.
  return '';
}

/**
 * One printed panel. `scale` converts the editor's 800px-wide canvas into CSS
 * pixels at this panel's physical size — PrintPreview uses `380 / 800` for its
 * on-screen panel, and the same ratio keeps type the same relative size on paper.
 */
export function renderPanel(
  page: PrintablePage,
  panelWidthPx: number,
  catalog: StickerArt
): string {
  const scale = panelWidthPx / 800;
  const backgroundImage = safeImageUrl(page.backgroundImage);
  const background = backgroundImage
    ? `background-image:url("${backgroundImage}");background-size:cover;background-position:center;`
    : `background:${page.backgroundGradient || safeColor(page.backgroundColor, '#ffffff')};`;
  const elements = (page.elements ?? [])
    .slice()
    // Stable paint order, so the print matches the editor even when zIndex ties.
    .sort((a, b) => num(a.zIndex) - num(b.zIndex))
    .map((el) => renderElement(el, scale, catalog))
    .join('');
  return (
    `<div class="panel" style="position:relative;width:100%;height:100%;` +
    `overflow:hidden;${background}">${elements}</div>`
  );
}

/** Crop marks in the bleed, at the trim corners so trimming removes them. */
function cropMarks(widthMm: number, heightMm: number): string {
  const b = BLEED_MM;
  const m = CROP_MARK_MM;
  const hair = 'position:absolute;background:#000;';
  const parts = [
    `<div style="${hair}left:${b - m}mm;top:${b}mm;width:${m}mm;height:0.15mm;"></div>`,
    `<div style="${hair}left:${b - m}mm;top:${b + heightMm}mm;width:${m}mm;height:0.15mm;"></div>`,
    `<div style="${hair}left:${b}mm;top:${b - m}mm;height:${m}mm;width:0.15mm;"></div>`,
    `<div style="${hair}left:${b + widthMm}mm;top:${b - m}mm;height:${m}mm;width:0.15mm;"></div>`,
    `<div style="${hair}left:${b + widthMm}mm;top:${b}mm;width:${m}mm;height:0.15mm;"></div>`,
    `<div style="${hair}left:${b + widthMm}mm;top:${b + heightMm}mm;width:${m}mm;height:0.15mm;"></div>`,
    `<div style="${hair}left:${b}mm;top:${b + heightMm}mm;height:${m}mm;width:0.15mm;"></div>`,
    `<div style="${hair}left:${b}mm;top:${b}mm;height:${m}mm;width:0.15mm;"></div>`,
  ];
  return `<div class="crop" style="pointer-events:none;">${parts.join('')}</div>`;
}

export const EMPTY_PAGE = (pageType: PrintablePage['pageType']): PrintablePage => ({
  pageType,
  backgroundColor: '#ffffff',
  elements: [],
});

export interface PrintJobInput {
  /** Order number, printed on the job spec so an operator can match the sheet. */
  orderNumber: string;
  /** Cart item title, for the spec sheet only. */
  title: string;
  cardSize: PrintCardSize;
  /** A spec-sheet note; the artwork itself is ink-agnostic. */
  finish?: string;
  envelope?: string;
  quantity?: number;
  /** Link back to the customer's saved design, printed on the spec. */
  designUrl?: string;
  /** Resolved `/media/<id>/` scan URLs for this item's media elements, by mediaId. */
  mediaUrls?: Record<string, string>;
  stickerArt?: StickerArt;
  /** Set when the item had no usable `designSnapshot` — the operator must see it. */
  warning?: string;
}

export interface PrintJobPages {
  front: PrintablePage;
  /**
   * Genuinely optional, matching `UserDesign.pages`: a card may have no
   * left-hand page. The renderer substitutes a blank panel, which is what the
   * type is for — an absent page must NOT be copied from the right, or the
   * customer's message prints twice.
   */
  insideLeft?: PrintablePage;
  insideRight: PrintablePage;
  back: PrintablePage;
}

/**
 * The full print file: a job spec page, then the outside spread, then the inside
 * spread. Duplex flipping on the short edge gives the correct 4-page order on one
 * sheet — which is why the outside is `back | front` and not the other way round.
 */
export function renderPrintDocument(job: PrintJobInput, pages: PrintJobPages): string {
  const geometry: PrintSizeGeometry = PRINT_SIZES[job.cardSize] ?? PRINT_SIZES.standard;
  const catalog = job.stickerArt ?? {};
  const panelWidthMm = geometry.fold ? geometry.unfoldedMm.width / 2 : geometry.unfoldedMm.width;
  // 96dpi CSS reference: mm -> px, so type is sized in real units on paper.
  const panelWidthPx = (panelWidthMm / 25.4) * 96;
  const { foldedMm, sheetMm } = geometry;

  const withMedia = (page: PrintablePage): PrintablePage => {
    if (!job.mediaUrls) return page;
    return {
      ...page,
      elements: (page.elements ?? []).map((el) =>
        el.type === 'media' && el.mediaId && job.mediaUrls?.[el.mediaId]
          ? { ...el, mediaUrl: job.mediaUrls[el.mediaId] }
          : el
      ),
    };
  };

  const panel = (page: PrintablePage | undefined, fallback: PrintablePage['pageType']) =>
    renderPanel(withMedia(page ?? EMPTY_PAGE(fallback)), panelWidthPx, catalog);

  /** One trim-sized panel. `foldEdge` draws the spine on the panel's right edge. */
  const onePanel = (
    page: PrintablePage | undefined,
    fallback: PrintablePage['pageType'],
    foldEdge = false
  ): string => {
    const spine =
      foldEdge && geometry.fold
        ? `<div class="fold-line" style="position:absolute;left:50%;top:0;bottom:0;width:0.2mm;background:#94a3b8;z-index:40;"></div>`
        : '';
    return (
      `<div style="position:relative;width:${foldedMm.width}mm;height:${foldedMm.height}mm;overflow:hidden;">` +
      panel(page, fallback) +
      spine +
      cropMarks(foldedMm.width, foldedMm.height) +
      `</div>`
    );
  };

  const spread = (
    left: PrintablePage | undefined,
    right: PrintablePage,
    label: string
  ): string => {
    const panels = geometry.fold
      ? onePanel(left, 'inside-left', true) + onePanel(right, 'inside-right')
      : onePanel(left, 'front');
    return (
      `<section class="sheet spread" data-side="${escapeHtml(label)}">` +
      `<div class="sheet-label">${escapeHtml(label)}</div>` +
      `<div style="display:flex;align-items:flex-start;">${panels}</div>` +
      `</section>`
    );
  };

  const specRows: Array<[string, string]> = [
    ['Order', job.orderNumber],
    ['Card', job.title],
    ['Size', `${geometry.name} - ${foldedMm.width} x ${foldedMm.height} mm folded`],
    [
      'Sheet',
      `${sheetMm.width} x ${sheetMm.height} mm (${geometry.fold ? 'bi-fold' : 'flat, no fold'})`,
    ],
    ['Finish', job.finish ?? 'satin'],
    ['Envelope', job.envelope ?? geometry.envelope],
    ['Quantity', String(job.quantity ?? 1)],
  ];
  if (job.warning) specRows.push(['WARNING', job.warning]);

  const hint =
    'Duplex, flip on the short edge. Fold on the centre line for a bi-fold card. ' +
    'Do not scale to fit - the page box is the paper size.' +
    (job.designUrl ? ` Digital design: ${job.designUrl}` : '');

  const rows = specRows
    .map(
      ([label, value]) =>
        `<tr><td>${escapeHtml(label)}</td>` +
        `<td${label === 'WARNING' ? ' class="warn"' : ''}>${escapeHtml(value)}</td></tr>`
    )
    .join('\n      ');

  return (
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(job.orderNumber)} - ${escapeHtml(job.title)}</title>
<style>
  /* Physical units throughout: the page box IS the paper, so a printer left on
     100% / no-scaling cannot change the finished size. */
  @page { size: ${sheetMm.width}mm ${sheetMm.height}mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet {
    position: relative;
    width: ${sheetMm.width}mm;
    height: ${sheetMm.height}mm;
    padding: ${BLEED_MM}mm;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
    background: #ffffff;
  }
  .sheet:last-child { page-break-after: auto; break-after: auto; }
  .sheet-label { position: absolute; top: 0.4mm; left: ${BLEED_MM}mm; font: 600 6pt/1 sans-serif; color: #94a3b8; letter-spacing: 0.04em; }
  .spec { font: 400 9pt/1.5 sans-serif; color: #0f172a; }
  .spec h1 { font-size: 14pt; margin: 0 0 2mm; }
  .spec table { border-collapse: collapse; width: 100%; }
  .spec td { padding: 1.1mm 0; border-bottom: 0.15mm solid #e2e8f0; vertical-align: top; }
  .spec td:first-child { width: 30mm; font-weight: 700; color: #475569; }
  .spec .warn { color: #b91c1c; font-weight: 700; }
  .spec .hint { margin-top: 3mm; font-size: 8pt; color: #64748b; }
</style>
</head>
<body>
  <section class="sheet spec">
    <h1>${escapeHtml(job.orderNumber)}</h1>
    <table>
      ${rows}
    </table>
    <p class="hint">${escapeHtml(hint)}</p>
  </section>
  ${spread(pages.back, pages.front, 'OUTSIDE - back | front')}
  ${spread(pages.insideLeft, pages.insideRight, 'INSIDE - left | right')}
</body>
</html>`
  );
}
