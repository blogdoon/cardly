import React, { useState, useRef, useEffect } from 'react';
import {
  Grid3X3,
  Magnet,
  Check,
  ChevronDown,
  Maximize2,
  Crosshair,
  ShieldAlert,
  Sliders
} from 'lucide-react';

interface GridSettingsMenuProps {
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onGridSizeChange: (size: number) => void;
  showCenterGuides?: boolean;
  onToggleCenterGuides?: () => void;
  showSafeMargin?: boolean;
  onToggleSafeMargin?: () => void;
}

export const GridSettingsMenu: React.FC<GridSettingsMenuProps> = ({
  showGrid,
  snapToGrid,
  gridSize,
  onToggleGrid,
  onToggleSnap,
  onGridSizeChange,
  showCenterGuides = true,
  onToggleCenterGuides,
  showSafeMargin = true,
  onToggleSafeMargin,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const isAnyActive = showGrid || snapToGrid;

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button in Toolbar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 sm:px-2.5 sm:py-2 min-h-[38px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
          isAnyActive
            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100/80 border border-rose-200 shadow-2xs font-bold'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
        }`}
        title="Canvas Grid Lines & Snap-to-Grid (Hotkeys: G for Grid, S for Snap)"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="relative">
          <Grid3X3 className="w-4 h-4 text-rose-500" />
          {snapToGrid && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-500 ring-1 ring-white" />
          )}
        </div>
        <span className="hidden lg:inline">
          {showGrid ? 'Grid On' : snapToGrid ? 'Snap On' : 'Grid & Snap'}
        </span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Settings Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 z-60 animate-in fade-in zoom-in-95 duration-150 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5">
              <Grid3X3 className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-bold text-slate-900">Grid & Precision Alignment</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Canvas</span>
          </div>

          {/* Toggle: Show Grid Lines */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <label
                htmlFor="toggle-grid-lines"
                className="text-xs font-semibold text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Show Grid Lines</span>
                <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1 py-0.2 rounded">
                  G
                </span>
              </label>
              <p className="text-[10px] text-slate-500">
                Display visible alignment grid lines across canvas
              </p>
            </div>

            <button
              id="toggle-grid-lines"
              type="button"
              role="switch"
              aria-checked={showGrid}
              onClick={onToggleGrid}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                showGrid ? 'bg-rose-500' : 'bg-slate-200'
              }`}
            >
              <span
                className={`block w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-150 absolute top-1 ${
                  showGrid ? 'left-5' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Toggle: Snap to Grid */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
            <div className="space-y-0.5 pr-2">
              <label
                htmlFor="toggle-snap-grid"
                className="text-xs font-semibold text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <Magnet className="w-3.5 h-3.5 text-indigo-500" />
                <span>Snap to Grid</span>
                <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1 py-0.2 rounded">
                  S
                </span>
              </label>
              <p className="text-[10px] text-slate-500">
                Magnetically align elements to grid increments & center
              </p>
            </div>

            <button
              id="toggle-snap-grid"
              type="button"
              role="switch"
              aria-checked={snapToGrid}
              onClick={onToggleSnap}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                snapToGrid ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`block w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-150 absolute top-1 ${
                  snapToGrid ? 'left-5' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Grid Size / Density Selector */}
          <div className="border-t border-slate-100 pt-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700">Grid Cell Size</span>
              <span className="font-mono text-[10px] text-slate-500">{gridSize}% of canvas</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Fine (5%)', val: 5, desc: '20×20 grid' },
                { label: 'Medium (10%)', val: 10, desc: '10×10 grid' },
                { label: 'Coarse (15%)', val: 15, desc: '7×7 grid' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => onGridSizeChange(opt.val)}
                  className={`py-1.5 px-2 rounded-xl text-center border transition cursor-pointer flex flex-col items-center ${
                    gridSize === opt.val
                      ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[11px] font-semibold">{opt.label.split(' ')[0]}</span>
                  <span className="text-[9px] text-slate-400 font-mono">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Guide Overlay Toggles */}
          {(onToggleCenterGuides || onToggleSafeMargin) && (
            <div className="border-t border-slate-100 pt-2.5 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Guide Aids
              </span>

              {onToggleCenterGuides && (
                <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer select-none">
                  <span className="flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-rose-500" />
                    <span>Center Crosshairs (50%)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showCenterGuides}
                    onChange={onToggleCenterGuides}
                    className="accent-rose-500 rounded"
                  />
                </label>
              )}

              {onToggleSafeMargin && (
                <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer select-none">
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                    <span>Print Safe Margin (6%)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showSafeMargin}
                    onChange={onToggleSafeMargin}
                    className="accent-amber-500 rounded"
                  />
                </label>
              )}
            </div>
          )}

          {/* Pro-Tip Footer */}
          <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Tip: Drag near center or grid lines to snap</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-600 hover:text-slate-900 font-bold hover:underline cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
