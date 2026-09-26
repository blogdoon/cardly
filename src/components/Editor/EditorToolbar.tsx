import React from 'react';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Eye,
  ShoppingBag,
  Save,
  Check,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Smartphone,
  Monitor,
  Printer,
  Sparkles
} from 'lucide-react';
import { AutosaveStatus } from '../../types/design';
import { GridSettingsMenu } from './GridSettingsMenu';

interface EditorToolbarProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  autosaveStatus: AutosaveStatus;
  lastSavedAt?: Date | null;
  zoom: number;
  onZoomChange: (delta: number) => void;
  onPreview: () => void;
  onPrint?: () => void;
  onOpenStickers?: () => void;
  onSave: () => void;
  onAddToBasket: () => void;
  onBack: () => void;
  showGrid?: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
  showCenterGuides?: boolean;
  showSafeMargin?: boolean;
  onToggleGrid?: () => void;
  onToggleSnap?: () => void;
  onGridSizeChange?: (size: number) => void;
  onToggleCenterGuides?: () => void;
  onToggleSafeMargin?: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  title,
  onTitleChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  autosaveStatus,
  lastSavedAt,
  zoom,
  onZoomChange,
  onPreview,
  onPrint,
  onOpenStickers,
  onSave,
  onAddToBasket,
  onBack,
  showGrid = false,
  snapToGrid = true,
  gridSize = 5,
  showCenterGuides = true,
  showSafeMargin = true,
  onToggleGrid,
  onToggleSnap,
  onGridSizeChange,
  onToggleCenterGuides,
  onToggleSafeMargin,
}) => {
  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-200 px-2 sm:px-4 flex items-center justify-between shrink-0 shadow-xs z-30">
      {/* Left: Back & Title */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0">
        <button
          onClick={onBack}
          className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-700 active:scale-95 transition"
          title="Back to Product Page"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex flex-col justify-center">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="font-bold text-slate-800 text-xs sm:text-sm hover:border-b hover:border-slate-300 focus:outline-hidden focus:border-b-2 focus:border-rose-500 py-0.5 max-w-[110px] xs:max-w-[140px] sm:max-w-[200px] truncate bg-transparent"
            title="Click to rename design"
          />
          <div className="flex items-center space-x-1 sm:space-x-2 text-[10px] sm:text-[11px]">
            {autosaveStatus === 'saving' && (
              <span className="text-amber-600 flex items-center gap-1 font-medium truncate" title="Saving changes to cloud...">
                <RefreshCw className="w-2.5 h-2.5 animate-spin shrink-0" />
                <span className="hidden xs:inline">Saving to Cloud...</span>
              </span>
            )}
            {autosaveStatus === 'saved' && (
              <span className="text-emerald-600 flex items-center gap-1 font-medium truncate" title="Saved automatically to Firestore and local storage">
                <Check className="w-2.5 h-2.5 shrink-0" />
                <span className="hidden xs:inline">
                  {lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Saved to Cloud'}
                </span>
              </span>
            )}
            {autosaveStatus === 'unsaved' && (
              <span className="text-slate-400 truncate flex items-center gap-1" title="Unsaved changes pending auto-save...">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block shrink-0 animate-pulse" />
                <span className="hidden xs:inline">Unsaved edits</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Undo & Redo (plus Zoom on desktop) */}
      <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5 sm:p-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 sm:p-1.5 min-w-[34px] min-h-[34px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg hover:bg-white text-slate-700 disabled:opacity-25 disabled:hover:bg-transparent transition active:scale-95"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 sm:p-1.5 min-w-[34px] min-h-[34px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg hover:bg-white text-slate-700 disabled:opacity-25 disabled:hover:bg-transparent transition active:scale-95"
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        {/* Zoom controls: shown on desktop/tablet */}
        <div className="hidden md:flex items-center">
          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            onClick={() => onZoomChange(-0.1)}
            className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-medium px-1 text-slate-600 min-w-[42px] text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={() => onZoomChange(0.1)}
            className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right: Preview, Save, Add to Basket */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        {onToggleGrid && onToggleSnap && (
          <GridSettingsMenu
            showGrid={Boolean(showGrid)}
            snapToGrid={Boolean(snapToGrid)}
            gridSize={gridSize || 5}
            onToggleGrid={onToggleGrid}
            onToggleSnap={onToggleSnap}
            onGridSizeChange={onGridSizeChange || (() => {})}
            showCenterGuides={showCenterGuides}
            onToggleCenterGuides={onToggleCenterGuides}
            showSafeMargin={showSafeMargin}
            onToggleSafeMargin={onToggleSafeMargin}
          />
        )}

        {onOpenStickers && (
          <button
            onClick={onOpenStickers}
            className="p-2 sm:px-3 sm:py-2 min-w-[38px] min-h-[38px] bg-rose-50 hover:bg-rose-100/90 text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            title="Open Sticker & Decor Library"
            aria-label="Stickers"
          >
            <Sparkles className="w-4 h-4 text-rose-600" />
            <span className="hidden md:inline">Stickers</span>
          </button>
        )}

        <button
          onClick={onPreview}
          className="p-2 sm:px-3 sm:py-2 min-w-[38px] min-h-[38px] bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
          title="Preview 3D Card"
          aria-label="Preview"
        >
          <Eye className="w-4 h-4 text-slate-700" />
          <span className="hidden sm:inline">Preview</span>
        </button>

        {onPrint && (
          <button
            onClick={onPrint}
            className="p-2 sm:px-3 sm:py-2 min-w-[38px] min-h-[38px] bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
            title="Print Preview (5x7 & Standard Sizes)"
            aria-label="Print Preview"
          >
            <Printer className="w-4 h-4 text-slate-700" />
            <span className="hidden md:inline">Print</span>
          </button>
        )}

        <button
          onClick={onSave}
          className="p-2 sm:px-3 sm:py-2 min-w-[38px] min-h-[38px] border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
          title="Save Design"
          aria-label="Save"
        >
          <Save className="w-4 h-4 text-slate-600" />
          <span className="hidden lg:inline">Save</span>
        </button>

        <button
          onClick={onAddToBasket}
          className="px-2.5 py-2 sm:px-4 sm:py-2 min-h-[38px] bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-200 flex items-center justify-center gap-1.5 transition active:scale-95 shrink-0"
        >
          <ShoppingBag className="w-4 h-4" />
          <span className="hidden xs:inline">Basket</span>
        </button>
      </div>
    </header>
  );
};
