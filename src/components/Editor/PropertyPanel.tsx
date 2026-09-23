import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  RotateCw,
  Palette,
  Sliders,
  Type
} from 'lucide-react';
import { CardElement, TextElement, PhotoElement, StickerElement } from '../../types/template';
import { AVAILABLE_FONTS, PRESET_COLORS } from '../../data/fonts';

interface PropertyPanelProps {
  selectedElement: CardElement | null;
  onUpdateElement: (updated: CardElement) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (element: CardElement) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
}) => {
  if (!selectedElement) {
    return (
      <div className="w-64 sm:w-72 border-l border-slate-200 bg-white p-5 flex flex-col justify-between text-slate-500 text-xs">
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
            <Sliders className="w-4 h-4 text-rose-500" />
            <span>Inspector</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-center space-y-2">
            <p className="font-semibold text-slate-700">No Element Selected</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Click on any text, photo, or sticker on the card to edit its style, font, size, and position.
            </p>
          </div>
        </div>

        <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 text-[11px] text-rose-800">
          💡 Keyboard shortcuts: <br />
          • <strong>Backspace / Delete:</strong> Remove element<br />
          • <strong>Ctrl + Z:</strong> Undo<br />
          • <strong>Ctrl + Y:</strong> Redo
        </div>
      </div>
    );
  }

  // Handle Text Element Properties
  if (selectedElement.type === 'text') {
    const textEl = selectedElement as TextElement;

    return (
      <div className="w-64 sm:w-72 border-l border-slate-200 bg-white p-4 space-y-5 overflow-y-auto text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-sm">
            <Type className="w-4 h-4 text-rose-500" />
            <span>Text Settings</span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onDuplicateElement(textEl)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800"
              title="Duplicate"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDeleteElement(textEl.id)}
              className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-rose-600"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Text content textarea */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Text Content</label>
          <textarea
            rows={3}
            value={textEl.text}
            onChange={(e) => onUpdateElement({ ...textEl, text: e.target.value })}
            className="w-full p-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-rose-500 resize-none"
          />
        </div>

        {/* Font Family Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Font Family</label>
          <select
            value={textEl.fontFamily}
            onChange={(e) => onUpdateElement({ ...textEl, fontFamily: e.target.value })}
            className="w-full p-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-rose-500 bg-white"
          >
            {AVAILABLE_FONTS.map((f) => (
              <option key={f.id} value={f.family}>
                {f.name} ({f.category})
              </option>
            ))}
          </select>
        </div>

        {/* Font Size & Weight */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[11px] font-semibold text-slate-700">Font Size</label>
            <span className="font-mono text-slate-500">{textEl.fontSize}px</span>
          </div>
          <input
            type="range"
            min={12}
            max={72}
            value={textEl.fontSize}
            onChange={(e) => onUpdateElement({ ...textEl, fontSize: Number(e.target.value) })}
            className="w-full accent-rose-500"
          />
        </div>

        {/* Styling buttons: Bold, Italic, Underline, Alignments */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Style & Alignment</label>
          <div className="flex items-center gap-1 bg-slate-50 p-1 border border-slate-200 rounded-xl">
            <button
              onClick={() =>
                onUpdateElement({
                  ...textEl,
                  fontWeight: textEl.fontWeight === 'bold' ? 'normal' : 'bold',
                })
              }
              className={`p-1.5 rounded-lg flex-1 flex justify-center ${
                textEl.fontWeight === 'bold' ? 'bg-white shadow-xs font-bold text-rose-600' : 'text-slate-600'
              }`}
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() =>
                onUpdateElement({
                  ...textEl,
                  fontStyle: textEl.fontStyle === 'italic' ? 'normal' : 'italic',
                })
              }
              className={`p-1.5 rounded-lg flex-1 flex justify-center ${
                textEl.fontStyle === 'italic' ? 'bg-white shadow-xs italic text-rose-600' : 'text-slate-600'
              }`}
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-slate-300 mx-0.5" />

            <button
              onClick={() => onUpdateElement({ ...textEl, textAlign: 'left' })}
              className={`p-1.5 rounded-lg flex-1 flex justify-center ${
                textEl.textAlign === 'left' ? 'bg-white shadow-xs text-rose-600' : 'text-slate-600'
              }`}
              title="Align Left"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onUpdateElement({ ...textEl, textAlign: 'center' })}
              className={`p-1.5 rounded-lg flex-1 flex justify-center ${
                textEl.textAlign === 'center' ? 'bg-white shadow-xs text-rose-600' : 'text-slate-600'
              }`}
              title="Align Center"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onUpdateElement({ ...textEl, textAlign: 'right' })}
              className={`p-1.5 rounded-lg flex-1 flex justify-center ${
                textEl.textAlign === 'right' ? 'bg-white shadow-xs text-rose-600' : 'text-slate-600'
              }`}
              title="Align Right"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Text Color */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Color</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onUpdateElement({ ...textEl, color: c })}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full border shadow-xs transition-transform ${
                  textEl.color.toLowerCase() === c.toLowerCase()
                    ? 'scale-125 border-rose-500 ring-2 ring-rose-200'
                    : 'border-slate-300 hover:scale-110'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={textEl.color}
              onChange={(e) => onUpdateElement({ ...textEl, color: e.target.value })}
              className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
            />
            <span className="font-mono text-slate-600">{textEl.color}</span>
          </div>
        </div>

        {/* Layer Ordering */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Layer Ordering</label>
          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => onBringForward(textEl.id)}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex justify-center text-slate-700"
              title="Bring Forward"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSendBackward(textEl.id)}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex justify-center text-slate-700"
              title="Send Backward"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onBringToFront(textEl.id)}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex justify-center text-slate-700"
              title="Bring to Front"
            >
              <ChevronsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSendToBack(textEl.id)}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex justify-center text-slate-700"
              title="Send to Back"
            >
              <ChevronsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle Photo Element Properties
  if (selectedElement.type === 'photo') {
    const photoEl = selectedElement as PhotoElement;

    // Calculate current proportional scale percentage
    const currentScale = Math.round(Math.max(photoEl.width, photoEl.height));

    const applySizePreset = (percent: number) => {
      const currentAspect = (photoEl.height || 1) / (photoEl.width || 1);
      const newWidth = Math.round(percent);
      const newHeight = Math.max(10, Math.min(95, Math.round(percent * currentAspect)));
      onUpdateElement({ ...photoEl, width: newWidth, height: newHeight });
    };

    const applyAspectRatio = (ratio: '1:1' | '4:3' | '3:4' | '16:9') => {
      let multiplier = 1;
      if (ratio === '1:1') multiplier = 1;
      if (ratio === '4:3') multiplier = 3 / 4;
      if (ratio === '3:4') multiplier = 4 / 3;
      if (ratio === '16:9') multiplier = 9 / 16;

      const newHeight = Math.max(10, Math.min(95, Math.round(photoEl.width * multiplier)));
      onUpdateElement({ ...photoEl, height: newHeight });
    };

    return (
      <div className="w-64 sm:w-72 border-l border-slate-200 bg-white p-4 space-y-4 overflow-y-auto text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <span className="font-bold text-slate-900 text-sm block">Photo Settings</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {Math.round(photoEl.width)}% × {Math.round(photoEl.height)}%
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onDuplicateElement(photoEl)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
              title="Duplicate"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDeleteElement(photoEl.id)}
              className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-rose-600"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Thumbnail Preview */}
        <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative group">
          <img
            src={photoEl.imageUrl}
            alt="element"
            className="w-full h-full object-cover"
            style={{
              filter:
                photoEl.filter === 'warm'
                  ? 'sepia(0.25) saturate(1.3)'
                  : photoEl.filter === 'vintage'
                  ? 'sepia(0.65)'
                  : photoEl.filter === 'grayscale'
                  ? 'grayscale(1)'
                  : photoEl.filter === 'vivid'
                  ? 'saturate(1.6)'
                  : 'none',
            }}
          />
        </div>

        {/* Proportional Size / Scale */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-semibold text-slate-700">Photo Size (Scale)</label>
            <span className="font-mono text-slate-500 font-semibold">{currentScale}%</span>
          </div>

          <input
            type="range"
            min={15}
            max={95}
            value={currentScale}
            onChange={(e) => {
              const newScale = Number(e.target.value);
              const currentAspect = (photoEl.height || 1) / (photoEl.width || 1);
              const newWidth = Math.round(newScale);
              const newHeight = Math.max(10, Math.min(95, Math.round(newScale * currentAspect)));
              onUpdateElement({ ...photoEl, width: newWidth, height: newHeight });
            }}
            className="w-full accent-rose-500"
          />

          {/* Quick Size Presets */}
          <div className="grid grid-cols-4 gap-1">
            {[
              { label: 'Small', val: 30 },
              { label: 'Medium', val: 50 },
              { label: 'Large', val: 75 },
              { label: 'Full', val: 92 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => applySizePreset(p.val)}
                className="py-1 px-1.5 text-[10px] font-medium bg-slate-50 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 rounded-md text-slate-600 text-center transition"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Width & Height */}
        <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Custom Dimensions
          </span>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-600">Width</span>
              <span className="font-mono text-[11px] text-slate-500">{Math.round(photoEl.width)}%</span>
            </div>
            <input
              type="range"
              min={12}
              max={95}
              value={photoEl.width}
              onChange={(e) => onUpdateElement({ ...photoEl, width: Number(e.target.value) })}
              className="w-full accent-rose-500"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-600">Height</span>
              <span className="font-mono text-[11px] text-slate-500">{Math.round(photoEl.height)}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={95}
              value={photoEl.height}
              onChange={(e) => onUpdateElement({ ...photoEl, height: Number(e.target.value) })}
              className="w-full accent-rose-500"
            />
          </div>

          {/* Aspect Ratio Buttons */}
          <div className="pt-1">
            <span className="text-[10px] text-slate-500 block mb-1">Aspect Ratio:</span>
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: '1:1', type: '1:1' as const },
                { label: '3:4', type: '3:4' as const },
                { label: '4:3', type: '4:3' as const },
                { label: '16:9', type: '16:9' as const },
              ].map((r) => (
                <button
                  key={r.label}
                  onClick={() => applyAspectRatio(r.type)}
                  className="py-1 text-[10px] font-medium bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 text-center"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Photo Filters */}
        <div>
          <label className="text-[11px] font-semibold text-slate-700 block mb-1.5">Photo Filter</label>
          <div className="grid grid-cols-5 gap-1">
            {[
              { id: 'none', label: 'Normal' },
              { id: 'warm', label: 'Warm' },
              { id: 'vintage', label: 'Vintage' },
              { id: 'grayscale', label: 'B&W' },
              { id: 'vivid', label: 'Vivid' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => onUpdateElement({ ...photoEl, filter: f.id })}
                className={`py-1 text-[10px] font-medium rounded-lg border transition ${
                  (photoEl.filter || 'none') === f.id
                    ? 'bg-rose-500 text-white border-rose-500 font-semibold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rounded Corners */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[11px] font-semibold text-slate-700">Rounded Corners</label>
            <span className="font-mono text-slate-500">{photoEl.borderRadius || 0}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={48}
            value={photoEl.borderRadius || 0}
            onChange={(e) => onUpdateElement({ ...photoEl, borderRadius: Number(e.target.value) })}
            className="w-full accent-rose-500"
          />
        </div>

        {/* Rotation */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[11px] font-semibold text-slate-700">Rotation</label>
            <span className="font-mono text-slate-500">{photoEl.rotation}°</span>
          </div>
          <input
            type="range"
            min={-180}
            max={180}
            value={photoEl.rotation}
            onChange={(e) => onUpdateElement({ ...photoEl, rotation: Number(e.target.value) })}
            className="w-full accent-rose-500"
          />
        </div>

        {/* Layer Ordering */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Layer Ordering</label>
          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => onBringForward(photoEl.id)}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex justify-center text-slate-700"
              title="Bring Forward"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSendBackward(photoEl.id)}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex justify-center text-slate-700"
              title="Send Backward"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onBringToFront(photoEl.id)}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex justify-center text-slate-700"
              title="Bring to Front"
            >
              <ChevronsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSendToBack(photoEl.id)}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex justify-center text-slate-700"
              title="Send to Back"
            >
              <ChevronsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle Sticker Element Properties
  const stickerEl = selectedElement as StickerElement;

  return (
    <div className="w-64 sm:w-72 border-l border-slate-200 bg-white p-4 space-y-5 overflow-y-auto text-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center overflow-hidden">
            {stickerEl.svg ? (
              <div
                className="w-5 h-5 [&>svg]:w-full [&>svg]:h-full"
                style={{ color: stickerEl.color || '#e11d48' }}
                dangerouslySetInnerHTML={{ __html: stickerEl.svg }}
              />
            ) : stickerEl.emoji ? (
              <span className="text-base select-none">{stickerEl.emoji}</span>
            ) : (
              <span className="text-sm">✨</span>
            )}
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm block leading-tight">
              {stickerEl.name || 'Sticker'}
            </span>
            <span className="text-[10px] text-slate-400">Decoration</span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => onDuplicateElement(stickerEl)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteElement(stickerEl.id)}
            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-rose-600"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Color tinting if it's an SVG vector sticker */}
      {stickerEl.svg && (
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">Sticker Color</label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((col) => (
              <button
                key={col}
                onClick={() => onUpdateElement({ ...stickerEl, color: col })}
                style={{ backgroundColor: col }}
                className={`w-6 h-6 rounded-full border transition hover:scale-110 shadow-xs ${
                  stickerEl.color === col ? 'ring-2 ring-rose-500 ring-offset-1 border-white' : 'border-slate-300'
                }`}
                title={col}
              />
            ))}
          </div>
        </div>
      )}

      {/* Size / Scale Slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center mb-1">
          <label className="text-[11px] font-semibold text-slate-700">Sticker Size</label>
          <span className="font-mono text-slate-500 font-semibold">{stickerEl.width}%</span>
        </div>
        <input
          type="range"
          min={8}
          max={75}
          value={stickerEl.width}
          onChange={(e) => {
            const val = Number(e.target.value);
            onUpdateElement({ ...stickerEl, width: val, height: val });
          }}
          className="w-full accent-rose-500"
        />
        {/* Quick Size Presets */}
        <div className="grid grid-cols-4 gap-1 pt-0.5">
          {[
            { label: 'Small', val: 15 },
            { label: 'Medium', val: 25 },
            { label: 'Large', val: 40 },
            { label: 'X-Large', val: 55 },
          ].map((p) => (
            <button
              key={p.label}
              onClick={() => onUpdateElement({ ...stickerEl, width: p.val, height: p.val })}
              className="py-1 px-1 text-[10px] font-medium bg-slate-50 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 rounded-md text-slate-600 text-center transition"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rotation Slider */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-[11px] font-semibold text-slate-700">Rotation</label>
          <span className="font-mono text-slate-500">{stickerEl.rotation}°</span>
        </div>
        <input
          type="range"
          min={-180}
          max={180}
          value={stickerEl.rotation}
          onChange={(e) => onUpdateElement({ ...stickerEl, rotation: Number(e.target.value) })}
          className="w-full accent-rose-500"
        />
      </div>

      {/* Layer Ordering */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Layer Ordering</label>
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => onBringForward(stickerEl.id)}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex justify-center text-slate-700"
            title="Bring Forward"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSendBackward(stickerEl.id)}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex justify-center text-slate-700"
            title="Send Backward"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onBringToFront(stickerEl.id)}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex justify-center text-slate-700"
            title="Bring to Front"
          >
            <ChevronsUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSendToBack(stickerEl.id)}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex justify-center text-slate-700"
            title="Send to Back"
          >
            <ChevronsDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
