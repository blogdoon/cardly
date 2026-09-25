import React, { useState, useRef, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  X,
  Sliders,
  Check,
  Download,
  Info,
  Layers,
  FileText,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Sparkles,
  Scissors,
  Palette,
  Contrast,
  Leaf,
  QrCode,
  ExternalLink,
  Copy,
  Smartphone,
  Link as LinkIcon
} from 'lucide-react';
import { CardPageDefinition, CardElement, StickerElement, ShapeElement } from '../types/template';

export interface PrintPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  pages: {
    front: CardPageDefinition;
    insideLeft?: CardPageDefinition;
    insideRight: CardPageDefinition;
    back: CardPageDefinition;
  };
  initialColorMode?: ColorMode;
  initialShowCropMarks?: boolean;
  templateId?: string;
  designId?: string;
  shareUrl?: string;
}

export type ColorMode = 'color' | 'grayscale';
export type QrPosition = 'bottom-center' | 'bottom-right' | 'bottom-left' | 'center';
export type QrSize = 'compact' | 'standard' | 'large';
export type PaperSizeKey = '5x7' | '4x6' | 'a5' | 'letter-half';
export type LayoutFormat = 'bifold' | 'single' | 'sheet-letter';
export type PaperStock = 'cardstock' | 'linen' | 'pearl' | 'kraft';

interface PaperSizeConfig {
  id: PaperSizeKey;
  label: string;
  foldedWidthInches: number;
  foldedHeightInches: number;
  unfoldedWidthInches: number;
  unfoldedHeightInches: number;
  description: string;
}

export const PAPER_SIZES: Record<PaperSizeKey, PaperSizeConfig> = {
  '5x7': {
    id: '5x7',
    label: '5" × 7" Standard Greeting Card',
    foldedWidthInches: 5,
    foldedHeightInches: 7,
    unfoldedWidthInches: 10,
    unfoldedHeightInches: 7,
    description: 'Most popular greeting card size. Folds into standard A7 envelope.',
  },
  '4x6': {
    id: '4x6',
    label: '4" × 6" Postcard / Small Card',
    foldedWidthInches: 4,
    foldedHeightInches: 6,
    unfoldedWidthInches: 8,
    unfoldedHeightInches: 6,
    description: 'Compact format. Folds into A6 envelope or works as standard photo print.',
  },
  'a5': {
    id: 'a5',
    label: 'A5 Card (Folded A4)',
    foldedWidthInches: 5.83,
    foldedHeightInches: 8.27,
    unfoldedWidthInches: 11.69,
    unfoldedHeightInches: 8.27,
    description: 'Standard UK & European greeting card format. Folds into C5 envelope.',
  },
  'letter-half': {
    id: 'letter-half',
    label: '5.5" × 8.5" (Folded US Letter)',
    foldedWidthInches: 5.5,
    foldedHeightInches: 8.5,
    unfoldedWidthInches: 11,
    unfoldedHeightInches: 8.5,
    description: 'Created by folding a standard 8.5" × 11" US Letter sheet in half.',
  },
};

const formatStickerSvg = (svg: string) => {
  if (!svg) return '';
  if (!svg.includes('width="100%"')) {
    return svg.replace(
      /<svg\b/i,
      '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block;" '
    );
  }
  return svg;
};

const getFilterCss = (filter?: string) => {
  switch (filter) {
    case 'warm':
      return 'sepia(0.25) saturate(1.3) brightness(1.05)';
    case 'vintage':
      return 'sepia(0.65) contrast(1.1)';
    case 'grayscale':
      return 'grayscale(1) contrast(1.05)';
    case 'vivid':
      return 'saturate(1.6) contrast(1.1)';
    default:
      return 'none';
  }
};

export const PrintPreview: React.FC<PrintPreviewProps> = ({
  isOpen,
  onClose,
  title,
  pages,
  initialColorMode = 'color',
  initialShowCropMarks = true,
  templateId,
  designId,
  shareUrl,
}) => {
  const [selectedSize, setSelectedSize] = useState<PaperSizeKey>('5x7');
  const [layoutFormat, setLayoutFormat] = useState<LayoutFormat>('bifold');
  const [colorMode, setColorMode] = useState<ColorMode>(initialColorMode);
  const [paperStock, setPaperStock] = useState<PaperStock>('cardstock');
  const [showCropMarks, setShowCropMarks] = useState<boolean>(initialShowCropMarks);
  const [showFoldLine, setShowFoldLine] = useState(true);
  const [showBleedZone, setShowBleedZone] = useState(false);
  const [showScaleRuler, setShowScaleRuler] = useState(true);
  const [printScope, setPrintScope] = useState<'both' | 'exterior' | 'interior'>('both');
  const [zoomLevel, setZoomLevel] = useState<number>(0.9);
  const [showTips, setShowTips] = useState<boolean>(false);

  // Digital Design QR Code States
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [qrCaption, setQrCaption] = useState<string>('Scan for digital card & memory');
  const [qrPosition, setQrPosition] = useState<QrPosition>('bottom-center');
  const [qrSize, setQrSize] = useState<QrSize>('standard');
  const [customQrUrl, setCustomQrUrl] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isQrSettingsOpen, setIsQrSettingsOpen] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Compute canonical URL linking back to the original digital design
  const targetDesignUrl = useMemo(() => {
    if (customQrUrl.trim()) return customQrUrl.trim();
    if (shareUrl) return shareUrl;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://cardly.app';
    if (designId) {
      return `${origin}/?design=${encodeURIComponent(designId)}`;
    }
    if (templateId) {
      return `${origin}/?card=${encodeURIComponent(templateId)}`;
    }
    return `${origin}/?card=personalized-card`;
  }, [customQrUrl, shareUrl, designId, templateId]);

  // Generate crisp high-DPI QR code whenever target URL changes
  useEffect(() => {
    let isMounted = true;
    if (!targetDesignUrl) return;

    QRCode.toDataURL(targetDesignUrl, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (isMounted) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch((err) => {
        console.error('Error generating design QR code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [targetDesignUrl]);

  const getQrPositionStyles = (pos: QrPosition): React.CSSProperties => {
    switch (pos) {
      case 'bottom-center':
        return {
          bottom: '14%',
          left: '50%',
          transform: 'translateX(-50%)',
        };
      case 'bottom-right':
        return {
          bottom: '10%',
          right: '8%',
        };
      case 'bottom-left':
        return {
          bottom: '10%',
          left: '8%',
        };
      case 'center':
        return {
          top: '48%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
      default:
        return {
          bottom: '14%',
          left: '50%',
          transform: 'translateX(-50%)',
        };
    }
  };

  const getQrPixelSize = (size: QrSize): number => {
    switch (size) {
      case 'compact':
        return 50;
      case 'standard':
        return 64;
      case 'large':
        return 80;
    }
  };

  if (!isOpen) return null;

  const config = PAPER_SIZES[selectedSize];

  // Standard safe inside-left fallback if missing
  const insideLeftDef: CardPageDefinition = pages.insideLeft || {
    pageType: 'inside-left',
    backgroundColor: '#ffffff',
    elements: [],
  };

  const handlePrint = () => {
    window.print();
  };

  // Render an individual card page content
  const renderCardContent = (page: CardPageDefinition, isPrintView = false) => {
    return (
      <div
        className="relative w-full h-full overflow-hidden select-none"
        style={{
          background: page.backgroundImage
            ? `url("${page.backgroundImage}") center/cover no-repeat`
            : page.backgroundGradient || page.backgroundColor || '#ffffff',
        }}
      >
        {/* Paper texture overlay subtle simulation */}
        {paperStock === 'linen' && (
          <div
            className="absolute inset-0 pointer-events-none opacity-25 mix-blend-multiply"
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)`,
            }}
          />
        )}
        {paperStock === 'kraft' && (
          <div className="absolute inset-0 pointer-events-none opacity-15 bg-[#d4a373] mix-blend-multiply" />
        )}
        {paperStock === 'pearl' && (
          <div className="absolute inset-0 pointer-events-none bg-radial from-white/30 via-transparent to-pink-500/10 mix-blend-screen" />
        )}

        {/* 0.125" / 3mm Safe Bleed Border */}
        {showBleedZone && (
          <div className="absolute inset-3 border border-dashed border-rose-400/60 pointer-events-none z-30">
            <span className="absolute top-1 left-1.5 text-[9px] font-mono text-rose-500 bg-white/80 px-1 rounded">
              0.125" Safe Zone
            </span>
          </div>
        )}

        {/* Card elements */}
        {page.elements.map((el: CardElement) => {
          if (el.type === 'text') {
            return (
              <div
                key={el.id}
                style={{
                  position: 'absolute',
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: `${el.width}%`,
                  transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
                  fontFamily: el.fontFamily,
                  fontSize: `${el.fontSize * (380 / 800)}px`,
                  color: el.color,
                  textAlign: el.textAlign,
                  fontWeight: el.fontWeight || 'normal',
                  fontStyle: el.fontStyle || 'normal',
                  textDecoration: el.textDecoration || 'none',
                  lineHeight: el.lineHeight || 1.3,
                  letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : 'normal',
                  whiteSpace: 'pre-wrap',
                  zIndex: el.zIndex,
                }}
              >
                {el.text}
              </div>
            );
          }

          if (el.type === 'photo') {
            return (
              <div
                key={el.id}
                style={{
                  position: 'absolute',
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: `${el.width}%`,
                  height: `${el.height}%`,
                  transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
                  borderRadius: el.borderRadius ? `${el.borderRadius}px` : '4px',
                  overflow: 'hidden',
                  zIndex: el.zIndex,
                }}
              >
                <img
                  src={el.imageUrl}
                  alt="Print element"
                  style={{ filter: getFilterCss(el.filter) }}
                  className="w-full h-full object-cover"
                />
              </div>
            );
          }

          if (el.type === 'sticker') {
            const stickerEl = el as StickerElement;
            return (
              <div
                key={stickerEl.id}
                style={{
                  position: 'absolute',
                  left: `${stickerEl.x}%`,
                  top: `${stickerEl.y}%`,
                  width: `${stickerEl.width}%`,
                  aspectRatio: '1 / 1',
                  transform: `translate(-50%, -50%) rotate(${stickerEl.rotation}deg)`,
                  zIndex: stickerEl.zIndex,
                }}
                className="flex items-center justify-center pointer-events-none"
              >
                {stickerEl.svg ? (
                  <div
                    className="sticker-svg-wrapper w-full h-full flex items-center justify-center pointer-events-none"
                    style={{ color: stickerEl.color || '#e11d48' }}
                    dangerouslySetInnerHTML={{ __html: formatStickerSvg(stickerEl.svg) }}
                  />
                ) : stickerEl.emoji ? (
                  <div
                    className="w-full h-full flex items-center justify-center leading-none text-center"
                    style={{
                      fontSize: `${Math.max(16, Math.round(stickerEl.width * 2.8))}px`,
                      lineHeight: 1,
                    }}
                  >
                    {stickerEl.emoji}
                  </div>
                ) : (
                  <div className="w-full h-full rounded-full bg-rose-100 flex items-center justify-center font-bold">
                    ✨
                  </div>
                )}
              </div>
            );
          }

          if (el.type === 'shape') {
            const shapeEl = el as ShapeElement;
            return (
              <div
                key={shapeEl.id}
                style={{
                  position: 'absolute',
                  left: `${shapeEl.x}%`,
                  top: `${shapeEl.y}%`,
                  width: `${shapeEl.width}%`,
                  height: `${shapeEl.height}%`,
                  transform: `translate(-50%, -50%) rotate(${shapeEl.rotation}deg)`,
                  zIndex: shapeEl.zIndex,
                }}
              >
                {shapeEl.shapeType === 'circle' && (
                  <div
                    className="w-full h-full rounded-full"
                    style={{
                      backgroundColor: shapeEl.fill,
                      border: shapeEl.stroke ? `${shapeEl.strokeWidth || 2}px solid ${shapeEl.stroke}` : 'none',
                    }}
                  />
                )}
                {shapeEl.shapeType === 'rectangle' && (
                  <div
                    className="w-full h-full rounded-md"
                    style={{
                      backgroundColor: shapeEl.fill,
                      border: shapeEl.stroke ? `${shapeEl.strokeWidth || 2}px solid ${shapeEl.stroke}` : 'none',
                    }}
                  />
                )}
                {shapeEl.shapeType === 'heart' && (
                  <svg viewBox="0 0 24 24" className="w-full h-full" fill={shapeEl.fill} stroke={shapeEl.stroke || 'none'} strokeWidth={shapeEl.strokeWidth || 0}>
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                )}
                {shapeEl.shapeType === 'star' && (
                  <svg viewBox="0 0 24 24" className="w-full h-full" fill={shapeEl.fill} stroke={shapeEl.stroke || 'none'} strokeWidth={shapeEl.strokeWidth || 0}>
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                  </svg>
                )}
                {shapeEl.shapeType === 'badge' && (
                  <div
                    className="w-full h-full rounded-2xl flex items-center justify-center font-bold text-xs"
                    style={{
                      backgroundColor: shapeEl.fill,
                      border: shapeEl.stroke ? `${shapeEl.strokeWidth || 2}px solid ${shapeEl.stroke}` : 'none',
                    }}
                  />
                )}
              </div>
            );
          }

          return null;
        })}

        {/* Embedded Digital Design QR Code on the Back Cover */}
        {page.pageType === 'back' && showQrCode && qrDataUrl && (
          <div
            className="absolute z-30 flex flex-col items-center pointer-events-auto"
            style={getQrPositionStyles(qrPosition)}
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsQrSettingsOpen(true);
              }}
              className="group/qr relative bg-white/95 backdrop-blur-xs text-slate-900 px-2 py-1.5 rounded-lg shadow-sm border border-slate-300/80 flex flex-col items-center cursor-pointer transition hover:scale-105 hover:shadow-md hover:border-rose-400 print:shadow-none print:border-slate-300 select-none"
              title="QR code linking to original digital design. Click to configure or test."
            >
              <div className="relative bg-white p-0.5 rounded-md">
                <img
                  src={qrDataUrl}
                  alt="QR code to digital design"
                  style={{
                    width: `${getQrPixelSize(qrSize)}px`,
                    height: `${getQrPixelSize(qrSize)}px`,
                  }}
                  className="block object-contain"
                />
                {/* Subtle center brandmark dot */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3 h-3 rounded-full bg-white flex items-center justify-center shadow-2xs border border-slate-200">
                    <span className="text-[6.5px] leading-none font-bold text-rose-600">c.</span>
                  </div>
                </div>
              </div>

              {qrCaption && (
                <span className="mt-1 text-[7px] sm:text-[7.5px] font-semibold text-slate-800 text-center tracking-tight max-w-[105px] leading-tight">
                  {qrCaption}
                </span>
              )}
              <span className="text-[6px] font-mono text-slate-500 mt-0.5 tracking-wider uppercase">
                cardly.app
              </span>

              {/* Interactive Hover prompt (hidden when printed) */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[9px] px-2 py-0.5 rounded-md shadow pointer-events-none opacity-0 group-hover/qr:opacity-100 transition no-print z-50">
                Click to test link or edit QR
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Corner Crop / Trim Mark component (L-bracket with precision scissors alignment guides)
  const CornerCropMark = ({
    position,
    showScissors = false,
  }: {
    position: 'tl' | 'tr' | 'bl' | 'br';
    showScissors?: boolean;
  }) => {
    if (!showCropMarks) return null;
    const styles: Record<string, string> = {
      tl: 'top-0 left-0 -translate-x-3.5 -translate-y-3.5',
      tr: 'top-0 right-0 translate-x-3.5 -translate-y-3.5',
      bl: 'bottom-0 left-0 -translate-x-3.5 translate-y-3.5',
      br: 'bottom-0 right-0 translate-x-3.5 translate-y-3.5',
    };

    return (
      <div className={`absolute ${styles[position]} pointer-events-none z-40 w-7 h-7 print:visible`}>
        {/* Horizontal cut line */}
        <div
          className={`absolute h-[1.5px] w-5 bg-slate-900 ${
            position.includes('l') ? 'right-0' : 'left-0'
          } ${position.includes('t') ? 'bottom-0' : 'top-0'}`}
        />
        {/* Vertical cut line */}
        <div
          className={`absolute w-[1.5px] h-5 bg-slate-900 ${
            position.includes('t') ? 'bottom-0' : 'top-0'
          } ${position.includes('l') ? 'right-0' : 'left-0'}`}
        />
        {/* Optional mini scissors alignment icon */}
        {showScissors && (
          <div
            className={`absolute text-slate-400 no-print ${
              position === 'tl'
                ? '-top-3.5 -left-3.5'
                : position === 'tr'
                ? '-top-3.5 -right-3.5'
                : position === 'bl'
                ? '-bottom-3.5 -left-3.5'
                : '-bottom-3.5 -right-3.5'
            }`}
          >
            <Scissors className="w-2.5 h-2.5 opacity-70" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md text-slate-100 overflow-hidden select-none">
      {/* Hidden print stylesheet injection to guarantee high-DPI full-page physical card prints */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #cardly-print-area, #cardly-print-area * {
            visibility: visible !important;
          }
          #cardly-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            color: black !important;
          }
          #cardly-print-area.is-grayscale,
          #cardly-print-area.is-grayscale * {
            filter: grayscale(100%) contrast(108%) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-sheet {
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: auto;
            margin: 0.35in;
          }
        }
      `}</style>

      <div className="relative w-full h-full flex flex-col bg-slate-900 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 px-4 sm:px-6 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0 no-print z-30">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-white truncate max-w-[200px] sm:max-w-md">
                  Print Studio & Preview
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {config.label.split(' ')[0]}
                </span>
                <span
                  className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    colorMode === 'grayscale'
                      ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {colorMode === 'grayscale' ? (
                    <>
                      <Contrast className="w-3 h-3 text-emerald-400" />
                      Grayscale (Ink Saver)
                    </>
                  ) : (
                    <>
                      <Palette className="w-3 h-3 text-rose-400" />
                      Full Color
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Formatted to standard paper sizes with trim marks and fold score guides
              </p>
            </div>
          </div>

          {/* Quick Actions in Navbar */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick Toggle Button between Full Color and Grayscale/Printer-Friendly */}
            <button
              type="button"
              onClick={() => setColorMode((prev) => (prev === 'color' ? 'grayscale' : 'color'))}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                colorMode === 'grayscale'
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/80'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              title="Click to toggle between 'Full Color' and 'Grayscale/Printer-Friendly' to save ink"
            >
              {colorMode === 'grayscale' ? (
                <>
                  <Contrast className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Grayscale/Printer-Friendly</span>
                  <span className="sm:hidden">Grayscale</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-mono">
                    Ink Saver
                  </span>
                </>
              ) : (
                <>
                  <Palette className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Full Color</span>
                  <span className="sm:hidden">Color</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowTips(!showTips)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition"
              title="Print tips & printer settings"
            >
              <Info className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden md:inline">Printing Tips</span>
            </button>

            {/* Print Now primary button */}
            <button
              onClick={handlePrint}
              className="px-4 sm:px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-900/40 transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print {colorMode === 'grayscale' ? 'Grayscale' : 'Card'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Close Print Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Secondary Studio Controls Bar */}
        <div className="bg-slate-850/90 border-b border-slate-800/80 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 no-print z-20 text-xs text-slate-300">
          {/* Left Controls: Paper Size & Layout */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Paper Size selector */}
            <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <span className="text-[11px] font-medium text-slate-400 pl-1.5">Size:</span>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value as PaperSizeKey)}
                className="bg-slate-900 text-white text-xs font-semibold rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-hidden focus:border-rose-500 cursor-pointer"
              >
                <option value="5x7">5" × 7" (Standard Greeting Card)</option>
                <option value="4x6">4" × 6" (Postcard / Photo Print)</option>
                <option value="a5">A5 Card (Folded A4 Sheet)</option>
                <option value="letter-half">5.5" × 8.5" (Folded US Letter)</option>
              </select>
            </div>

            {/* Layout Mode selector */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setLayoutFormat('bifold')}
                className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition ${
                  layoutFormat === 'bifold'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Bi-Fold Spread
              </button>
              <button
                onClick={() => setLayoutFormat('single')}
                className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition ${
                  layoutFormat === 'single'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Single Pages
              </button>
              <button
                onClick={() => setLayoutFormat('sheet-letter')}
                className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition ${
                  layoutFormat === 'sheet-letter'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Fit on Letter/A4 Sheet
              </button>
            </div>

            {/* Sheet Scope (Both, Exterior Only, Interior Only) */}
            {layoutFormat === 'bifold' && (
              <div className="hidden lg:flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                <span className="text-[11px] font-medium text-slate-400 pl-1.5">Print:</span>
                <button
                  onClick={() => setPrintScope('both')}
                  className={`px-2 py-0.5 rounded-lg text-xs font-medium transition ${
                    printScope === 'both' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Both Sheets
                </button>
                <button
                  onClick={() => setPrintScope('exterior')}
                  className={`px-2 py-0.5 rounded-lg text-xs font-medium transition ${
                    printScope === 'exterior' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Outside Only
                </button>
                <button
                  onClick={() => setPrintScope('interior')}
                  className={`px-2 py-0.5 rounded-lg text-xs font-medium transition ${
                    printScope === 'interior' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Inside Only
                </button>
              </div>
            )}

            {/* Color Mode Toggle: Switch between 'Full Color' and 'Grayscale/Printer-Friendly' to save ink */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 shadow-inner">
              <button
                type="button"
                onClick={() => setColorMode('color')}
                aria-pressed={colorMode === 'color'}
                className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                  colorMode === 'color'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Print in vibrant Full Color"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Full Color</span>
              </button>
              <button
                type="button"
                onClick={() => setColorMode('grayscale')}
                aria-pressed={colorMode === 'grayscale'}
                className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                  colorMode === 'grayscale'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Switch to Grayscale/Printer-Friendly to save ink"
              >
                <Contrast className="w-3.5 h-3.5" />
                <span>Grayscale/Printer-Friendly</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-medium flex items-center gap-0.5 ${
                    colorMode === 'grayscale'
                      ? 'bg-emerald-800 text-emerald-100 border border-emerald-300/40'
                      : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  <Leaf className="w-2.5 h-2.5" />
                  Save Ink
                </span>
              </button>
            </div>
          </div>

          {/* Right Controls: Toggles & Zoom */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Guide Toggles */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700">
              {/* Optional 'Show Crop Marks' Toggle */}
              <button
                type="button"
                onClick={() => setShowCropMarks((prev) => !prev)}
                aria-pressed={showCropMarks}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  showCropMarks
                    ? 'bg-rose-600/25 text-rose-300 border border-rose-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/60 border border-transparent'
                }`}
                title="Help align scissors or paper trimmer when cutting card from standard sheet"
              >
                <Scissors className={`w-3.5 h-3.5 ${showCropMarks ? 'text-rose-400' : 'text-slate-400'}`} />
                <span>Show Crop Marks</span>
                <span
                  className={`w-2 h-2 rounded-full transition ${
                    showCropMarks ? 'bg-rose-500 shadow-xs shadow-rose-500/50' : 'bg-slate-600'
                  }`}
                />
              </button>

              <div className="w-px h-3.5 bg-slate-700 mx-1" />

              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] hover:text-white">
                <input
                  type="checkbox"
                  checked={showFoldLine}
                  onChange={(e) => setShowFoldLine(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-0 w-3.5 h-3.5 bg-slate-900 border-slate-700 cursor-pointer"
                />
                <span>Fold Guide</span>
              </label>

              <div className="w-px h-3.5 bg-slate-700 mx-1" />

              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] hover:text-white">
                <input
                  type="checkbox"
                  checked={showBleedZone}
                  onChange={(e) => setShowBleedZone(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-0 w-3.5 h-3.5 bg-slate-900 border-slate-700 cursor-pointer"
                />
                <span>Bleed Margins</span>
              </label>

              <div className="w-px h-3.5 bg-slate-700 mx-1" />

              {/* QR Code Back Cover Toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] hover:text-white" title="Embed a QR code on the back of the card linking to the original digital design">
                <input
                  type="checkbox"
                  checked={showQrCode}
                  onChange={(e) => setShowQrCode(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-0 w-3.5 h-3.5 bg-slate-900 border-slate-700"
                />
                <QrCode className="w-3.5 h-3.5 text-rose-400" />
                <span>Back QR Code</span>
              </label>

              {showQrCode && (
                <button
                  type="button"
                  onClick={() => setIsQrSettingsOpen(true)}
                  className="px-1.5 py-0.5 rounded-md bg-slate-700/80 hover:bg-slate-700 text-rose-300 hover:text-white text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer"
                  title="Configure QR Code destination URL, position, size, and test scanning"
                >
                  <Sliders className="w-2.5 h-2.5" />
                  <span>Config</span>
                </button>
              )}
            </div>

            {/* Paper Texture selector */}
            <select
              value={paperStock}
              onChange={(e) => setPaperStock(e.target.value as PaperStock)}
              className="bg-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 border border-slate-700 focus:outline-hidden cursor-pointer"
              title="Simulate paper finish"
            >
              <option value="cardstock">Heavy Cardstock (300gsm)</option>
              <option value="linen">Textured Linen</option>
              <option value="pearl">Pearlized Shimmer</option>
              <option value="kraft">Rustic Kraft</option>
            </select>

            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.1))}
                className="p-1 hover:bg-slate-700 rounded-lg text-slate-300"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-1.5 text-slate-400">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                className="p-1 hover:bg-slate-700 rounded-lg text-slate-300"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Print Tips Drawer */}
        {showTips && (
          <div className="bg-slate-800/95 border-b border-slate-700 p-4 px-6 text-xs text-slate-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in slide-in-from-top duration-200 no-print">
            <div className="space-y-1">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>How to Get Studio-Quality Prints at Home</span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-[11px] text-slate-300">
                <li className="flex items-start gap-1.5 bg-slate-900/60 p-2 rounded-lg border border-slate-700/50">
                  <span className="text-rose-400 font-bold">1.</span>
                  <span><strong>Scale 100% / Actual Size:</strong> In your browser's print dialog, disable "Fit to Page" and choose 100% scale.</span>
                </li>
                <li className="flex items-start gap-1.5 bg-slate-900/60 p-2 rounded-lg border border-slate-700/50">
                  <span className="text-rose-400 font-bold">2.</span>
                  <span><strong>Heavy Cardstock (250–350 gsm):</strong> Use heavy matte photo paper or cardstock for premium feel and no bleed-through.</span>
                </li>
                <li className="flex items-start gap-1.5 bg-slate-900/60 p-2 rounded-lg border border-slate-700/50">
                  <span className="text-rose-400 font-bold">3.</span>
                  <span><strong>Duplex (2-Sided):</strong> Set printer to "Flip on short edge" for horizontal bi-fold cards.</span>
                </li>
                <li className="flex items-start gap-1.5 bg-slate-900/60 p-2 rounded-lg border border-slate-700/50">
                  <span className="text-emerald-400 font-bold">4.</span>
                  <span><strong>Save Ink:</strong> Use "Grayscale/Printer-Friendly" to convert artwork to high-contrast monochrome, sparing color ink cartridges.</span>
                </li>
                <li className="flex items-start gap-1.5 bg-slate-900/60 p-2 rounded-lg border border-slate-700/50">
                  <span className="text-amber-400 font-bold">5.</span>
                  <span><strong>Digital Keepsake QR:</strong> The QR code on the back links back to the original digital design for an interactive online keepsake.</span>
                </li>
                <li className="flex items-start gap-1.5 bg-slate-900/60 p-2 rounded-lg border border-slate-700/50">
                  <span className="text-cyan-400 font-bold">6.</span>
                  <span><strong>Show Crop Marks:</strong> Turn on "Show Crop Marks" to align scissors or paper cutters for straight, clean edges when trimming cards from standard sheets.</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setShowTips(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Center Print Canvas Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex flex-col items-center justify-start bg-slate-950/90 relative">
          {/* Grayscale Ink Saver Notification Banner */}
          {colorMode === 'grayscale' ? (
            <div className="no-print mb-4 px-4 py-2.5 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-lg max-w-2xl w-full animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400 shrink-0">
                  <Leaf className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-white">Grayscale / Printer-Friendly Version Active</span>
                  <p className="text-[11px] text-emerald-300/80">
                    Colored ink is conserved. All elements and photos are rendered in high-contrast monochrome for ink-efficient printing.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setColorMode('color')}
                className="text-xs text-emerald-300 hover:text-white underline font-semibold shrink-0 cursor-pointer"
              >
                Switch to Full Color
              </button>
            </div>
          ) : (
            <div className="no-print mb-2 text-center">
              <p className="text-[11px] text-slate-400">
                Printing on a black & white printer or want to save colored ink?{' '}
                <button
                  type="button"
                  onClick={() => setColorMode('grayscale')}
                  className="text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
                >
                  Switch to Grayscale/Printer-Friendly version
                </button>
              </p>
            </div>
          )}

          {/* Print container with exact physical inch dimensions */}
          <div
            id="cardly-print-area"
            ref={printAreaRef}
            className={`flex flex-col items-center gap-10 my-auto py-6 ${
              colorMode === 'grayscale' ? 'is-grayscale' : ''
            }`}
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
              filter: colorMode === 'grayscale' ? 'grayscale(100%) contrast(108%)' : 'none',
            }}
          >
            {/* 1) BIFOLD FORMAT (Standard Folded Card) */}
            {layoutFormat === 'bifold' && (
              <>
                {/* SHEET 1: EXTERIOR (Back Cover on Left | Front Cover on Right) */}
                {(printScope === 'both' || printScope === 'exterior') && (
                  <div className="print-sheet flex flex-col items-center">
                    <div className="text-[11px] font-bold text-slate-400 mb-2 flex items-center justify-between w-full max-w-[680px] no-print">
                      <span className="flex items-center gap-1.5 text-rose-400">
                        <FileText className="w-3.5 h-3.5" />
                        <strong>SHEET 1: EXTERIOR SPREAD</strong> (Back + Front Cover)
                      </span>
                      <span className="text-slate-400 font-mono">
                        {config.unfoldedWidthInches}" × {config.unfoldedHeightInches}" Flat Unfolded
                      </span>
                    </div>

                    {/* Paper Spread Card Container */}
                    <div className="relative bg-white text-slate-900 shadow-2xl rounded-sm p-4 sm:p-6 border border-slate-300">
                      {/* 4 Corner Crop Marks */}
                      <CornerCropMark position="tl" showScissors={true} />
                      <CornerCropMark position="tr" showScissors={true} />
                      <CornerCropMark position="bl" showScissors={true} />
                      <CornerCropMark position="br" showScissors={true} />

                      {/* 1-inch Scale Calibration Box */}
                      {showScaleRuler && (
                        <div className="absolute top-1 left-2 text-[8px] font-mono text-slate-400 border border-slate-300 px-1 py-0.5 rounded pointer-events-none no-print">
                          1 inch reference scale
                        </div>
                      )}

                      {/* The Bi-Fold Unfolded Spread */}
                      <div
                        className="relative flex items-center border border-slate-200 overflow-hidden bg-white"
                        style={{
                          width: `${config.unfoldedWidthInches * 64}px`,
                          height: `${config.unfoldedHeightInches * 64}px`,
                          aspectRatio: `${config.unfoldedWidthInches} / ${config.unfoldedHeightInches}`,
                        }}
                      >
                        {/* LEFT: BACK COVER */}
                        <div
                          className="relative h-full overflow-hidden"
                          style={{
                            width: `${(config.unfoldedWidthInches / 2) * 64}px`,
                            aspectRatio: `${config.foldedWidthInches} / ${config.foldedHeightInches}`,
                          }}
                        >
                          {renderCardContent(pages.back)}
                          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/60 text-white text-[9px] font-mono rounded pointer-events-none no-print">
                            Back Cover
                          </div>
                        </div>

                        {/* CENTER FOLD / SCORE GUIDE */}
                        {showFoldLine && (
                          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0 border-l border-dashed border-slate-400/80 z-40 flex flex-col justify-between items-center py-2 pointer-events-none">
                            <span className="text-[8px] font-mono bg-white/90 text-slate-500 px-1 py-0.5 rounded border border-slate-200 shadow-2xs rotate-90 my-auto">
                              FOLD HERE
                            </span>
                          </div>
                        )}

                        {/* RIGHT: FRONT COVER */}
                        <div
                          className="relative h-full overflow-hidden"
                          style={{
                            width: `${(config.unfoldedWidthInches / 2) * 64}px`,
                            aspectRatio: `${config.foldedWidthInches} / ${config.foldedHeightInches}`,
                          }}
                        >
                          {renderCardContent(pages.front)}
                          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 text-white text-[9px] font-mono rounded pointer-events-none no-print">
                            Front Cover
                          </div>
                        </div>
                      </div>

                      {/* Printable Trim Instructions under the sheet */}
                      <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between no-print">
                        <span className="flex items-center gap-1">
                          <Scissors className="w-3 h-3 text-slate-400" /> Trim along corner marks, score down the center
                        </span>
                        <span>Folds to: {config.foldedWidthInches}" × {config.foldedHeightInches}"</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SHEET 2: INTERIOR (Inside Left on Left | Inside Right on Right) */}
                {(printScope === 'both' || printScope === 'interior') && (
                  <div className="print-sheet flex flex-col items-center">
                    <div className="text-[11px] font-bold text-slate-400 mb-2 flex items-center justify-between w-full max-w-[680px] no-print">
                      <span className="flex items-center gap-1.5 text-rose-400">
                        <FileText className="w-3.5 h-3.5" />
                        <strong>SHEET 2: INTERIOR SPREAD</strong> (Inside Message & Photo)
                      </span>
                      <span className="text-slate-400 font-mono">
                        {config.unfoldedWidthInches}" × {config.unfoldedHeightInches}" Flat Unfolded
                      </span>
                    </div>

                    {/* Paper Spread Card Container */}
                    <div className="relative bg-white text-slate-900 shadow-2xl rounded-sm p-4 sm:p-6 border border-slate-300">
                      {/* 4 Corner Crop Marks */}
                      <CornerCropMark position="tl" showScissors={true} />
                      <CornerCropMark position="tr" showScissors={true} />
                      <CornerCropMark position="bl" showScissors={true} />
                      <CornerCropMark position="br" showScissors={true} />

                      {/* The Bi-Fold Inside Spread */}
                      <div
                        className="relative flex items-center border border-slate-200 overflow-hidden bg-white"
                        style={{
                          width: `${config.unfoldedWidthInches * 64}px`,
                          height: `${config.unfoldedHeightInches * 64}px`,
                          aspectRatio: `${config.unfoldedWidthInches} / ${config.unfoldedHeightInches}`,
                        }}
                      >
                        {/* LEFT: INSIDE LEFT */}
                        <div
                          className="relative h-full overflow-hidden"
                          style={{
                            width: `${(config.unfoldedWidthInches / 2) * 64}px`,
                            aspectRatio: `${config.foldedWidthInches} / ${config.foldedHeightInches}`,
                          }}
                        >
                          {renderCardContent(insideLeftDef)}
                          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/60 text-white text-[9px] font-mono rounded pointer-events-none no-print">
                            Inside Left
                          </div>
                        </div>

                        {/* CENTER FOLD / SCORE GUIDE */}
                        {showFoldLine && (
                          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0 border-l border-dashed border-slate-400/80 z-40 flex flex-col justify-between items-center py-2 pointer-events-none">
                            <span className="text-[8px] font-mono bg-white/90 text-slate-500 px-1 py-0.5 rounded border border-slate-200 shadow-2xs rotate-90 my-auto">
                              FOLD HERE
                            </span>
                          </div>
                        )}

                        {/* RIGHT: INSIDE RIGHT */}
                        <div
                          className="relative h-full overflow-hidden"
                          style={{
                            width: `${(config.unfoldedWidthInches / 2) * 64}px`,
                            aspectRatio: `${config.foldedWidthInches} / ${config.foldedHeightInches}`,
                          }}
                        >
                          {renderCardContent(pages.insideRight)}
                          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 text-white text-[9px] font-mono rounded pointer-events-none no-print">
                            Inside Right
                          </div>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between no-print">
                        <span>Print on back of Sheet 1 or on separate sheet to glue together</span>
                        <span>Interior Layout</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 2) SINGLE PAGES FORMAT (4 Separate Cards) */}
            {layoutFormat === 'single' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  { title: 'Page 1: Front Cover', page: pages.front },
                  { title: 'Page 2: Inside Left', page: insideLeftDef },
                  { title: 'Page 3: Inside Right', page: pages.insideRight },
                  { title: 'Page 4: Back Cover', page: pages.back },
                ].map((item, idx) => (
                  <div key={idx} className="print-sheet flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-400 mb-1.5 no-print">
                      {item.title} ({config.foldedWidthInches}" × {config.foldedHeightInches}")
                    </span>
                    <div className="relative bg-white shadow-xl rounded-sm p-4 border border-slate-300">
                      <CornerCropMark position="tl" />
                      <CornerCropMark position="tr" />
                      <CornerCropMark position="bl" />
                      <CornerCropMark position="br" />

                      <div
                        className="relative overflow-hidden border border-slate-200"
                        style={{
                          width: `${config.foldedWidthInches * 64}px`,
                          height: `${config.foldedHeightInches * 64}px`,
                          aspectRatio: `${config.foldedWidthInches} / ${config.foldedHeightInches}`,
                        }}
                      >
                        {renderCardContent(item.page)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3) HOME PRINTER SHEET (Letter 8.5x11 / A4 with Center Placement & Guides) */}
            {layoutFormat === 'sheet-letter' && (
              <div className="print-sheet flex flex-col items-center">
                <div className="text-[11px] font-bold text-slate-400 mb-2 flex items-center justify-between w-full max-w-[620px] no-print">
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <FileText className="w-3.5 h-3.5" />
                    <strong>HOME PRINTER SHEET (US Letter / A4)</strong>
                  </span>
                  <span className="text-slate-400 font-mono">
                    8.5" × 11" Standard Home Paper
                  </span>
                </div>

                {/* Simulated 8.5x11 white paper sheet */}
                <div
                  className="relative bg-white shadow-2xl border border-slate-400 p-8 flex flex-col items-center justify-center text-slate-900"
                  style={{
                    width: '680px',
                    height: '880px',
                  }}
                >
                  {/* Outer margin explanation banner */}
                  <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-[9px] font-mono text-slate-400 border-b border-slate-200 pb-1 pointer-events-none no-print">
                    <span>Cardly Print Studio • Home Desktop Layout</span>
                    <span>Centered {config.label} with Trim Marks</span>
                  </div>

                  {/* Centered Folded Card Area */}
                  <div className="relative">
                    <CornerCropMark position="tl" showScissors={true} />
                    <CornerCropMark position="tr" showScissors={true} />
                    <CornerCropMark position="bl" showScissors={true} />
                    <CornerCropMark position="br" showScissors={true} />

                    {/* Scissors alignment pill indicator */}
                    {showCropMarks && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono border border-slate-300 shadow-2xs no-print whitespace-nowrap">
                        <Scissors className="w-3 h-3 text-rose-500" />
                        <span>Align scissors with corner ticks to cut card</span>
                      </div>
                    )}

                    <div
                      className="relative flex items-center border border-slate-300 overflow-hidden bg-white shadow-sm"
                      style={{
                        width: `${config.unfoldedWidthInches * 54}px`,
                        height: `${config.unfoldedHeightInches * 54}px`,
                      }}
                    >
                      {/* Back */}
                      <div
                        className="relative h-full overflow-hidden"
                        style={{
                          width: `${(config.unfoldedWidthInches / 2) * 54}px`,
                        }}
                      >
                        {renderCardContent(pages.back)}
                      </div>

                      {/* Fold line */}
                      {showFoldLine && (
                        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0 border-l border-dashed border-slate-400 z-40" />
                      )}

                      {/* Front */}
                      <div
                        className="relative h-full overflow-hidden"
                        style={{
                          width: `${(config.unfoldedWidthInches / 2) * 54}px`,
                        }}
                      >
                        {renderCardContent(pages.front)}
                      </div>
                    </div>
                  </div>

                  {/* Instructions on bottom margin of paper */}
                  <div className="absolute bottom-4 left-6 right-6 text-center text-[10px] text-slate-500 font-sans pointer-events-none border-t border-slate-200 pt-2 flex items-center justify-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>
                      {showCropMarks
                        ? `Align scissors along the 4 corner crop marks to cut from standard sheet (${config.unfoldedWidthInches}" × ${config.unfoldedHeightInches}" flat), then score and fold along center line.`
                        : `Print this sheet at 100% scale (no scaling) on heavy cardstock. Toggle "Show Crop Marks" above to display scissors alignment guides.`}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Status / Footer Bar */}
        <footer className="h-14 px-4 sm:px-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0 no-print z-20 text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-white">{title}</span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="hidden sm:inline text-slate-400">
              {config.unfoldedWidthInches}" × {config.unfoldedHeightInches}" Flat • Folds to {config.foldedWidthInches}" × {config.foldedHeightInches}"
            </span>
            <span className="hidden md:inline text-slate-600">•</span>
            <span
              className={`hidden md:inline-flex items-center gap-1 font-semibold ${
                colorMode === 'grayscale' ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {colorMode === 'grayscale' ? (
                <>
                  <Contrast className="w-3 h-3" />
                  Grayscale/Printer-Friendly (Ink Saver)
                </>
              ) : (
                <>
                  <Palette className="w-3 h-3" />
                  Full Color
                </>
              )}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
            >
              Back to Editor
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-2 shadow-md shadow-rose-900/30 transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print {colorMode === 'grayscale' ? 'Grayscale Card' : config.label.split(' ')[0]}</span>
            </button>
          </div>
        </footer>

        {/* QR Code Settings & Live Scanner Modal */}
        {isQrSettingsOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-100 flex flex-col">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-850">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Back Cover QR Code</h3>
                    <p className="text-xs text-slate-400">Links physical greeting card to your live digital design</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQrSettingsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
                {/* Live QR Code Card */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="bg-white p-2 rounded-xl shadow-md border border-slate-200 shrink-0 flex flex-col items-center">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Generated QR Code"
                        className="w-28 h-28 object-contain block"
                      />
                    ) : (
                      <div className="w-28 h-28 flex items-center justify-center bg-slate-100 text-slate-400 text-xs">
                        Generating...
                      </div>
                    )}
                    <span className="text-[9px] font-semibold text-slate-700 mt-1 max-w-[110px] text-center leading-tight">
                      {qrCaption}
                    </span>
                    <span className="text-[8px] font-mono text-slate-400 uppercase mt-0.5">
                      cardly.app
                    </span>
                  </div>

                  <div className="space-y-2 text-xs flex-1">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Scannable with any Smartphone</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Point your phone camera right at this screen to test. It immediately opens the original digital design with interactive animations!
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof navigator !== 'undefined' && navigator.clipboard) {
                            navigator.clipboard.writeText(targetDesignUrl);
                            setCopiedToast(true);
                            setTimeout(() => setCopiedToast(false), 2000);
                          }
                        }}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedToast ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">Link Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                      <a
                        href={targetDesignUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-lg text-xs font-medium border border-rose-500/30 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Test Link in Tab</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Destination URL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-rose-400" />
                      Destination Digital Design URL:
                    </span>
                    {customQrUrl && (
                      <button
                        type="button"
                        onClick={() => setCustomQrUrl('')}
                        className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                      >
                        Reset to Default Link
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={customQrUrl || targetDesignUrl}
                    onChange={(e) => setCustomQrUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 font-mono focus:outline-hidden focus:border-rose-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Automatically encodes the digital card URL for direct online access when scanned.
                  </p>
                </div>

                {/* Caption Text */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Caption under QR Code:
                  </label>
                  <input
                    type="text"
                    value={qrCaption}
                    onChange={(e) => setQrCaption(e.target.value)}
                    maxLength={40}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-hidden focus:border-rose-500"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      'Scan for digital card & memory',
                      'Scan to view original digital design',
                      'Scan for interactive 3D card',
                      'Scan for digital keepsake',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQrCaption(preset)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                          qrCaption === preset
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Position & Size Grids */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Placement on Back Cover:
                    </label>
                    <select
                      value={qrPosition}
                      onChange={(e) => setQrPosition(e.target.value as QrPosition)}
                      className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-hidden focus:border-rose-500 cursor-pointer"
                    >
                      <option value="bottom-center">Bottom Center (Above Brand)</option>
                      <option value="bottom-right">Bottom Right Corner</option>
                      <option value="bottom-left">Bottom Left Corner</option>
                      <option value="center">Center of Back Cover</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      QR Code Size:
                    </label>
                    <select
                      value={qrSize}
                      onChange={(e) => setQrSize(e.target.value as QrSize)}
                      className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-hidden focus:border-rose-500 cursor-pointer"
                    >
                      <option value="compact">Compact (Subtle)</option>
                      <option value="standard">Standard (Recommended)</option>
                      <option value="large">Large (High Prominence)</option>
                    </select>
                  </div>
                </div>

                {/* Embed Toggle */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Embed on Back of Card:</span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={showQrCode}
                      onChange={(e) => setShowQrCode(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-0 w-4 h-4 bg-slate-800 border-slate-700"
                    />
                    <span className={showQrCode ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                      {showQrCode ? 'Active (Included on Back)' : 'Disabled'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-850 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQrSettingsOpen(false)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow cursor-pointer"
                >
                  Apply & Return to Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
