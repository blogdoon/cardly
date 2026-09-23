import React, { useRef, useState, useEffect } from 'react';
import { CardElement, CardPageDefinition, TextElement, PhotoElement, StickerElement } from '../../types/template';
import { RotateCw } from 'lucide-react';

interface CardCanvasProps {
  page: CardPageDefinition;
  zoom: number;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (updated: CardElement) => void;
  onDeleteSelected: () => void;
}

const formatStickerSvg = (svg: string) => {
  if (!svg) return '';
  if (!svg.includes('width="100%"')) {
    return svg.replace(/<svg\b/i, '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block;" ');
  }
  return svg;
};

export const CardCanvas: React.FC<CardCanvasProps> = ({
  page,
  zoom,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteSelected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<'se' | 'sw' | 'ne' | 'nw' | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState({ mouseX: 0, mouseY: 0, elX: 0, elY: 0 });
  const [resizeStart, setResizeStart] = useState({
    mouseX: 0,
    mouseY: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  });
  const [rotateStart, setRotateStart] = useState({ initialAngle: 0, currentAngle: 0 });

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

  // Global pointerup to ensure smooth drag/resize release anywhere
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setIsRotating(false);
      setResizeHandle(null);
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, []);

  // Handle global keyboard shortcuts: Delete, Backspace, Esc
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedElementId &&
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        onDeleteSelected();
      }
      if (e.key === 'Escape') {
        onSelectElement(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, onDeleteSelected, onSelectElement]);

  const handlePointerDownElement = (e: React.PointerEvent, element: CardElement) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelectElement(element.id);

    setIsDragging(true);
    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      elX: element.x,
      elY: element.y,
    });
  };

  const handlePointerDownResize = (
    e: React.PointerEvent,
    element: CardElement,
    handle: 'se' | 'sw' | 'ne' | 'nw' = 'se'
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: element.width,
      height: element.height,
      x: element.x,
      y: element.y,
    });
  };

  const handlePointerDownRotate = (e: React.PointerEvent, element: CardElement) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setIsRotating(true);
    setRotateStart({
      initialAngle: element.rotation || 0,
      currentAngle: 0,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!selectedElementId) return;
    const element = page.elements.find((el) => el.id === selectedElementId);
    if (!element) return;

    if (isDragging) {
      const deltaX = ((e.clientX - dragStart.mouseX) / (380 * zoom)) * 100;
      const deltaY = ((e.clientY - dragStart.mouseY) / (532 * zoom)) * 100;

      let newX = Math.round((dragStart.elX + deltaX) * 10) / 10;
      let newY = Math.round((dragStart.elY + deltaY) * 10) / 10;

      // Snap to horizontal and vertical center (50%)
      if (Math.abs(newX - 50) < 2) newX = 50;
      if (Math.abs(newY - 50) < 2) newY = 50;

      onUpdateElement({ ...element, x: Math.max(5, Math.min(95, newX)), y: Math.max(5, Math.min(95, newY)) });
    } else if (isResizing && resizeHandle) {
      const deltaX = ((e.clientX - resizeStart.mouseX) / (380 * zoom)) * 100;
      const deltaY = ((e.clientY - resizeStart.mouseY) / (532 * zoom)) * 100;

      const minW = 8;
      const maxW = 90;
      const minH = 8;
      const maxH = 95;

      if (element.type === 'sticker') {
        let sizeDelta = 0;
        if (resizeHandle === 'se') sizeDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
        else if (resizeHandle === 'sw') sizeDelta = Math.abs(-deltaX) > Math.abs(deltaY) ? -deltaX : deltaY;
        else if (resizeHandle === 'ne') sizeDelta = Math.abs(deltaX) > Math.abs(-deltaY) ? deltaX : -deltaY;
        else if (resizeHandle === 'nw') sizeDelta = Math.abs(-deltaX) > Math.abs(-deltaY) ? -deltaX : -deltaY;

        const newSize = Math.max(minW, Math.min(maxW, Math.round(resizeStart.width + sizeDelta)));
        onUpdateElement({
          ...element,
          width: newSize,
          height: newSize,
        });
        return;
      }

      let targetW = resizeStart.width;
      let targetH = resizeStart.height;
      let newX = resizeStart.x;
      let newY = resizeStart.y;

      if (resizeHandle === 'se') {
        targetW = Math.max(minW, Math.min(maxW, resizeStart.width + deltaX));
        targetH = Math.max(minH, Math.min(maxH, resizeStart.height + deltaY));
        const diffW = targetW - resizeStart.width;
        const diffH = targetH - resizeStart.height;
        newX = resizeStart.x + diffW / 2;
        newY = resizeStart.y + diffH / 2;
      } else if (resizeHandle === 'sw') {
        targetW = Math.max(minW, Math.min(maxW, resizeStart.width - deltaX));
        targetH = Math.max(minH, Math.min(maxH, resizeStart.height + deltaY));
        const diffW = targetW - resizeStart.width;
        const diffH = targetH - resizeStart.height;
        newX = resizeStart.x - diffW / 2;
        newY = resizeStart.y + diffH / 2;
      } else if (resizeHandle === 'ne') {
        targetW = Math.max(minW, Math.min(maxW, resizeStart.width + deltaX));
        targetH = Math.max(minH, Math.min(maxH, resizeStart.height - deltaY));
        const diffW = targetW - resizeStart.width;
        const diffH = targetH - resizeStart.height;
        newX = resizeStart.x + diffW / 2;
        newY = resizeStart.y - diffH / 2;
      } else if (resizeHandle === 'nw') {
        targetW = Math.max(minW, Math.min(maxW, resizeStart.width - deltaX));
        targetH = Math.max(minH, Math.min(maxH, resizeStart.height - deltaY));
        const diffW = targetW - resizeStart.width;
        const diffH = targetH - resizeStart.height;
        newX = resizeStart.x - diffW / 2;
        newY = resizeStart.y - diffH / 2;
      }

      onUpdateElement({
        ...element,
        width: Math.round(targetW),
        height: Math.round(targetH),
        x: Math.max(5, Math.min(95, Math.round(newX * 10) / 10)),
        y: Math.max(5, Math.min(95, Math.round(newY * 10) / 10)),
      });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setIsRotating(false);
    setResizeHandle(null);
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onSelectElement(null);
        }
      }}
      className="flex-1 overflow-auto bg-stone-100 flex items-center justify-center p-6 select-none relative"
      style={{ minHeight: '400px' }}
    >
      {/* Visual Workspace Canvas */}
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onSelectElement(null);
          }
        }}
        className="relative rounded-2xl shadow-2xl transition-transform border border-slate-300 overflow-hidden bg-white"
        style={{
          width: '380px',
          height: '532px',
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          background: page.backgroundGradient || page.backgroundColor || '#ffffff',
        }}
      >
        {/* Snap Guide lines (appear when element is near center) */}
        {isDragging && (
          <>
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-rose-400/40 pointer-events-none z-40 border-r border-dashed" />
            <div className="absolute left-0 right-0 top-1/2 h-px bg-rose-400/40 pointer-events-none z-40 border-b border-dashed" />
          </>
        )}

        {/* Render elements */}
        {page.elements.map((el) => {
          const isSelected = el.id === selectedElementId;

          if (el.type === 'text') {
            const textEl = el as TextElement;

            return (
              <div
                key={textEl.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement(textEl.id);
                }}
                onPointerDown={(e) => handlePointerDownElement(e, textEl)}
                style={{
                  position: 'absolute',
                  left: `${textEl.x}%`,
                  top: `${textEl.y}%`,
                  width: `${textEl.width}%`,
                  transform: `translate(-50%, -50%) rotate(${textEl.rotation}deg)`,
                  fontFamily: textEl.fontFamily,
                  fontSize: `${textEl.fontSize * (380 / 800)}px`,
                  color: textEl.color,
                  textAlign: textEl.textAlign,
                  fontWeight: textEl.fontWeight || 'normal',
                  fontStyle: textEl.fontStyle || 'normal',
                  textDecoration: textEl.textDecoration || 'none',
                  lineHeight: textEl.lineHeight || 1.3,
                  whiteSpace: 'pre-wrap',
                  zIndex: textEl.zIndex,
                }}
                className={`cursor-move transition-shadow ${
                  isSelected
                    ? 'ring-2 ring-rose-500 ring-offset-2 rounded-xs shadow-lg'
                    : 'hover:outline-dashed hover:outline-1 hover:outline-rose-300'
                }`}
              >
                {textEl.text}

                {/* Selection handles */}
                {isSelected && (
                  <>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => handlePointerDownResize(e, textEl)}
                      className="absolute -right-2 -bottom-2 w-3.5 h-3.5 bg-rose-500 border-2 border-white rounded-full cursor-nwse-resize shadow-md"
                    />
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => handlePointerDownRotate(e, textEl)}
                      className="absolute -top-6 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border border-rose-500 rounded-full flex items-center justify-center cursor-grab shadow-md"
                    >
                      <RotateCw className="w-2.5 h-2.5 text-rose-600" />
                    </div>
                  </>
                )}
              </div>
            );
          }

          if (el.type === 'photo') {
            const photoEl = el as PhotoElement;

            return (
              <div
                key={photoEl.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement(photoEl.id);
                }}
                onPointerDown={(e) => handlePointerDownElement(e, photoEl)}
                style={{
                  position: 'absolute',
                  left: `${photoEl.x}%`,
                  top: `${photoEl.y}%`,
                  width: `${photoEl.width}%`,
                  height: `${photoEl.height}%`,
                  transform: `translate(-50%, -50%) rotate(${photoEl.rotation}deg)`,
                  zIndex: photoEl.zIndex,
                }}
                className={`cursor-move select-none ${
                  isSelected
                    ? 'ring-2 ring-rose-500 ring-offset-2 rounded-lg shadow-xl'
                    : 'hover:outline-dashed hover:outline-1 hover:outline-rose-300'
                }`}
              >
                {/* Image display with rounded corners and filter */}
                <div
                  className="w-full h-full overflow-hidden border border-slate-200/80 shadow-sm"
                  style={{
                    borderRadius: photoEl.borderRadius ? `${photoEl.borderRadius}px` : '8px',
                  }}
                >
                  <img
                    src={photoEl.imageUrl}
                    alt="card photo"
                    style={{ filter: getFilterCss(photoEl.filter) }}
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                </div>

                {/* Visible 4-corner interactive resize handles */}
                {isSelected && (
                  <>
                    {/* Top-Left */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => handlePointerDownResize(e, photoEl, 'nw')}
                      className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-rose-500 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform z-40 flex items-center justify-center"
                      title="Resize Top-Left"
                    >
                      <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                    </div>

                    {/* Top-Right */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => handlePointerDownResize(e, photoEl, 'ne')}
                      className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-rose-500 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform z-40 flex items-center justify-center"
                      title="Resize Top-Right"
                    >
                      <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                    </div>

                    {/* Bottom-Left */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => handlePointerDownResize(e, photoEl, 'sw')}
                      className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-rose-500 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform z-40 flex items-center justify-center"
                      title="Resize Bottom-Left"
                    >
                      <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                    </div>

                    {/* Bottom-Right */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => handlePointerDownResize(e, photoEl, 'se')}
                      className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-rose-500 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform z-40 flex items-center justify-center"
                      title="Resize Bottom-Right"
                    >
                      <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                    </div>

                    {/* Rotate handle */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => handlePointerDownRotate(e, photoEl)}
                      className="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-5 bg-white border border-rose-500 rounded-full flex items-center justify-center cursor-grab shadow-md z-40 hover:scale-110"
                      title="Rotate photo"
                    >
                      <RotateCw className="w-3 h-3 text-rose-600" />
                    </div>

                    {/* Live dimension badge */}
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white rounded text-[10px] font-mono pointer-events-none whitespace-nowrap z-40 shadow-xs">
                      {Math.round(photoEl.width)}% × {Math.round(photoEl.height)}%
                    </div>
                  </>
                )}
              </div>
            );
          }

          if (el.type === 'sticker') {
            const stickerEl = el as StickerElement;

            return (
              <div
                key={stickerEl.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement(stickerEl.id);
                }}
                onPointerDown={(e) => handlePointerDownElement(e, stickerEl)}
                style={{
                  position: 'absolute',
                  left: `${stickerEl.x}%`,
                  top: `${stickerEl.y}%`,
                  width: `${stickerEl.width}%`,
                  aspectRatio: '1 / 1',
                  transform: `translate(-50%, -50%) rotate(${stickerEl.rotation}deg)`,
                  zIndex: stickerEl.zIndex,
                }}
                className={`cursor-move flex items-center justify-center select-none ${
                  isSelected
                    ? 'ring-2 ring-rose-500 ring-offset-2 rounded-lg'
                    : 'hover:outline-dashed hover:outline-1 hover:outline-rose-300'
                }`}
              >
                {stickerEl.svg ? (
                  <div
                    className="sticker-svg-wrapper w-full h-full flex items-center justify-center pointer-events-none drop-shadow-xs"
                    style={{ color: stickerEl.color || '#e11d48' }}
                    dangerouslySetInnerHTML={{ __html: formatStickerSvg(stickerEl.svg) }}
                  />
                ) : stickerEl.emoji ? (
                  <div
                    className="w-full h-full flex items-center justify-center select-none pointer-events-none drop-shadow-xs leading-none text-center"
                    style={{
                      fontSize: `${Math.max(16, Math.round(stickerEl.width * 2.85))}px`,
                      lineHeight: 1,
                    }}
                  >
                    {stickerEl.emoji}
                  </div>
                ) : (
                  <div
                    className="w-full h-full rounded-full bg-rose-100 flex items-center justify-center font-bold"
                    style={{ fontSize: `${Math.max(16, Math.round(stickerEl.width * 1.8))}px` }}
                  >
                    🎉
                  </div>
                )}

                {/* 4 corner resize handles for stickers */}
                {isSelected && (
                  <>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => handlePointerDownResize(e, stickerEl, 'nw')}
                      className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-rose-500 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform z-30"
                    />
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => handlePointerDownResize(e, stickerEl, 'ne')}
                      className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-rose-500 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform z-30"
                    />
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => handlePointerDownResize(e, stickerEl, 'sw')}
                      className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-rose-500 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform z-30"
                    />
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => handlePointerDownResize(e, stickerEl, 'se')}
                      className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-rose-500 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform z-30"
                    />

                    {/* Live dimension badge */}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white rounded text-[10px] font-mono pointer-events-none whitespace-nowrap z-40 shadow-xs">
                      {Math.round(stickerEl.width)}%
                    </div>
                  </>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};
