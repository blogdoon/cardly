import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Eye, BookOpen, Layers, Check, Printer } from 'lucide-react';
import { CardPageDefinition, CardPageType, StickerElement } from '../types/template';
import { getStickerById } from '../data/elements';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  pages: {
    front: CardPageDefinition;
    insideLeft?: CardPageDefinition;
    insideRight: CardPageDefinition;
    back: CardPageDefinition;
  };
  onProceedToCart?: () => void;
  onOpenPrintPreview?: () => void;
}

const formatStickerSvg = (svg: string) => {
  if (!svg) return '';
  if (!svg.includes('width="100%"')) {
    return svg.replace(/<svg\b/i, '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block;" ');
  }
  return svg;
};

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  pages,
  onProceedToCart,
  onOpenPrintPreview,
}) => {
  const [activeView, setActiveView] = useState<'front' | 'inside' | 'back'>('front');
  const [is3DMode, setIs3DMode] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Switching Front/Inside/Back always starts at the top of the page
  useEffect(() => {
    if (workspaceRef.current) {
      workspaceRef.current.scrollTop = 0;
      workspaceRef.current.scrollLeft = 0;
    }
  }, [activeView]);

  if (!isOpen) return null;

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(1.4, Math.max(0.7, prev + delta)));
  };

  // Render a single card page
  const renderCardPage = (page: CardPageDefinition, isLeftInside = false) => {
    return (
      <div
        className="relative w-[300px] h-[420px] sm:w-[340px] sm:h-[476px] rounded-lg overflow-hidden shadow-2xl transition-all select-none border border-slate-200/60"
        style={{
          background: page.backgroundImage
            ? `url("${page.backgroundImage}") center/cover no-repeat`
            : (page.backgroundGradient || page.backgroundColor || '#ffffff'),
          transform: `scale(${zoomLevel})`,
          transformOrigin: isLeftInside ? 'right center' : 'left center'
        }}
      >
        {/* Paper texture overlay subtle styling */}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/[0.03] via-transparent to-white/[0.08] pointer-events-none" />

        {/* Page elements */}
        {page.elements.map((el) => {
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
                  fontSize: `${el.fontSize * (340 / 800)}px`,
                  color: el.color,
                  textAlign: el.textAlign,
                  fontWeight: el.fontWeight || 'normal',
                  fontStyle: el.fontStyle || 'normal',
                  textDecoration: el.textDecoration || 'none',
                  lineHeight: el.lineHeight || 1.3,
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
                  borderRadius: el.borderRadius ? `${el.borderRadius}px` : '8px',
                  overflow: 'hidden',
                  zIndex: el.zIndex,
                }}
                className="shadow-sm border border-slate-200"
              >
                <img
                  src={el.imageUrl}
                  alt="Personalized Photo"
                  style={{
                    filter:
                      el.filter === 'warm'
                        ? 'sepia(0.25) saturate(1.3) brightness(1.05)'
                        : el.filter === 'vintage'
                        ? 'sepia(0.65) contrast(1.1)'
                        : el.filter === 'grayscale'
                        ? 'grayscale(1) contrast(1.05)'
                        : el.filter === 'vivid'
                        ? 'saturate(1.6) contrast(1.1)'
                        : 'none',
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
            );
          }

          if (el.type === 'sticker') {
            const stickerEl = el as StickerElement;
            // Default template stickers only store `stickerId` — resolve the art
            // from the catalog so the preview shows the template's image.
            const catalogSticker = getStickerById(stickerEl.stickerId);
            const stickerSvg = stickerEl.svg || catalogSticker?.svg;
            const stickerEmoji = stickerEl.emoji || catalogSticker?.emoji;
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
                {stickerSvg ? (
                  <div
                    className="sticker-svg-wrapper w-full h-full flex items-center justify-center pointer-events-none drop-shadow-xs"
                    style={{ color: stickerEl.color || catalogSticker?.defaultColor || '#e11d48' }}
                    dangerouslySetInnerHTML={{ __html: formatStickerSvg(stickerSvg) }}
                  />
                ) : stickerEmoji ? (
                  <div
                    className="w-full h-full flex items-center justify-center select-none pointer-events-none drop-shadow-xs leading-none text-center"
                    style={{
                      fontSize: `${Math.max(14, Math.round(stickerEl.width * 2.5))}px`,
                      lineHeight: 1,
                    }}
                  >
                    {stickerEmoji}
                  </div>
                ) : (
                  <div
                    className="w-full h-full rounded-full bg-rose-100/60 flex items-center justify-center font-bold"
                    style={{ fontSize: `${Math.max(14, Math.round(stickerEl.width * 1.5))}px` }}
                  >
                    ✨
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 rounded-3xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-800 overflow-hidden text-white">
        {/* Top bar */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{title} - Preview</h3>
              <p className="text-xs text-slate-400">Realistic finished card view</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Toggle: 3D Mockup vs Flat */}
            <button
              onClick={() => setIs3DMode(!is3DMode)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-300 transition"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{is3DMode ? '3D Folded View' : 'Flat Print View'}</span>
            </button>

            {onOpenPrintPreview && (
              <button
                onClick={onOpenPrintPreview}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 text-xs font-semibold rounded-lg border border-rose-500/40 transition"
                title="Format to standard 5x7 & paper sizes for printing"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>5"×7" Print Preview</span>
              </button>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => handleZoom(-0.1)}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono px-2 text-slate-400">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => handleZoom(0.1)}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Canvas Workspace — centering via m-auto, not items-center:
            centered content taller than the workspace puts its top out of scroll reach */}
        <div
          ref={workspaceRef}
          className="flex-1 overflow-auto flex p-6 bg-radial from-slate-800 to-slate-950 relative"
        >
          {activeView === 'front' && (
            <div className={`m-auto transition-all duration-500 ${is3DMode ? 'rotate-[-1deg] shadow-2xl' : ''}`}>
              {renderCardPage(pages.front)}
            </div>
          )}

          {activeView === 'inside' && (
            <div className="m-auto flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-0 bg-slate-800/40 p-3 sm:p-6 rounded-2xl shadow-2xl border border-slate-700/50">
              {/* Inside Left Page */}
              <div className="border-r border-slate-300/40">
                {renderCardPage(pages.insideLeft || {
                  pageType: 'inside-left',
                  backgroundColor: '#ffffff',
                  elements: []
                }, true)}
              </div>
              {/* Inside Right Page */}
              <div>
                {renderCardPage(pages.insideRight, false)}
              </div>
            </div>
          )}

          {activeView === 'back' && (
            <div className="m-auto transition-all duration-300">
              {renderCardPage(pages.back)}
            </div>
          )}
        </div>

        {/* Bottom Navigation Tabs */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('front')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeView === 'front'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Front Cover
            </button>

            <button
              onClick={() => setActiveView('inside')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeView === 'inside'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Inside Spread
            </button>

            <button
              onClick={() => setActiveView('back')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeView === 'back'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Back
            </button>
          </div>

          <div className="flex items-center space-x-3">
            {onOpenPrintPreview && (
              <button
                onClick={onOpenPrintPreview}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                title="Format into 5x7 or standard paper size"
              >
                <Printer className="w-3.5 h-3.5 text-rose-400" />
                <span>Print Card (5"×7")</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Back to Editing
            </button>

            {onProceedToCart && (
              <button
                onClick={() => {
                  onClose();
                  onProceedToCart();
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-900/30 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Looks Great, Add to Basket</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
