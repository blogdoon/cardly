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
  Monitor
} from 'lucide-react';
import { AutosaveStatus } from '../../types/design';

interface EditorToolbarProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  autosaveStatus: AutosaveStatus;
  zoom: number;
  onZoomChange: (delta: number) => void;
  onPreview: () => void;
  onSave: () => void;
  onAddToBasket: () => void;
  onBack: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  title,
  onTitleChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  autosaveStatus,
  zoom,
  onZoomChange,
  onPreview,
  onSave,
  onAddToBasket,
  onBack,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 shadow-xs z-30">
      {/* Left: Back & Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition"
          title="Back to Product Page"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="font-bold text-slate-800 text-sm hover:border-b hover:border-slate-300 focus:outline-hidden focus:border-b-2 focus:border-rose-500 py-0.5 max-w-[200px] truncate"
            title="Click to rename design"
          />
          <div className="flex items-center space-x-2 text-[11px]">
            {autosaveStatus === 'saving' && (
              <span className="text-amber-600 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Saving changes...
              </span>
            )}
            {autosaveStatus === 'saved' && (
              <span className="text-emerald-600 flex items-center gap-1 font-medium">
                <Check className="w-3 h-3" />
                All changes saved
              </span>
            )}
            {autosaveStatus === 'unsaved' && (
              <span className="text-slate-400">Unsaved edits</span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Undo, Redo, Zoom controls */}
      <div className="flex items-center space-x-1 sm:space-x-2 bg-slate-50 border border-slate-200 rounded-xl p-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded-lg hover:bg-white text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded-lg hover:bg-white text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

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

      {/* Right: Preview, Save, Add to Basket */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onPreview}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
        >
          <Eye className="w-4 h-4 text-slate-600" />
          <span className="hidden sm:inline">Preview</span>
        </button>

        <button
          onClick={onSave}
          className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <Save className="w-4 h-4 text-slate-500" />
          <span className="hidden md:inline">Save</span>
        </button>

        <button
          onClick={onAddToBasket}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-200 flex items-center gap-1.5 transition active:scale-95"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Add to Basket</span>
        </button>
      </div>
    </header>
  );
};
