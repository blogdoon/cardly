import React, { useState, useRef, useEffect } from 'react';
import {
  Type,
  ChevronDown,
  Search,
  Check,
  Sparkles,
  X,
  RotateCcw
} from 'lucide-react';
import { AVAILABLE_FONTS, FontDefinition } from '../../data/fonts';

interface FontPickerMenuProps {
  currentFontFamily: string;
  onSelectFont: (fontFamily: string) => void;
  previewSampleText?: string;
  fontWeight?: string;
  fontStyle?: string;
  color?: string;
  className?: string;
}

export function findFontByFamily(fontFamily: string): FontDefinition {
  if (!fontFamily) return AVAILABLE_FONTS[0];
  const cleanFamily = fontFamily.replace(/['",]/g, '').trim().toLowerCase();

  const found = AVAILABLE_FONTS.find((f) => {
    const fClean = f.family.replace(/['",]/g, '').trim().toLowerCase();
    const fNameClean = f.name.toLowerCase();
    return (
      f.family === fontFamily ||
      f.name.toLowerCase() === cleanFamily ||
      fClean === cleanFamily ||
      cleanFamily.startsWith(fNameClean) ||
      cleanFamily.includes(fNameClean)
    );
  });

  return found || AVAILABLE_FONTS[0];
}

const CATEGORIES = [
  'All',
  'Handwritten',
  'Elegant Serif',
  'Modern Sans',
  'Playful',
  'Bold Display',
] as const;

export const FontPickerMenu: React.FC<FontPickerMenuProps> = ({
  currentFontFamily,
  onSelectFont,
  previewSampleText = '',
  fontWeight = 'normal',
  fontStyle = 'normal',
  color = '#1e293b',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Custom live preview phrase that users can test
  const initialPreview = previewSampleText.trim()
    ? previewSampleText.trim().slice(0, 45)
    : 'Happy Birthday to You!';
  const [customPreview, setCustomPreview] = useState(initialPreview);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeFont = findFontByFamily(currentFontFamily);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      // Focus search input when menu opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Keep custom preview in sync if selected text changes and wasn't manually typed
  useEffect(() => {
    if (previewSampleText && previewSampleText.trim()) {
      setCustomPreview(previewSampleText.trim().slice(0, 45));
    }
  }, [previewSampleText]);

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

  // Filter fonts based on category and search query
  const filteredFonts = AVAILABLE_FONTS.filter((font) => {
    const matchesCategory =
      selectedCategory === 'All' || font.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      font.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      font.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const samplePresets = [
    'Card Text',
    'Happy Birthday!',
    'With Love & Joy ❤️',
    'Thank You Kindly',
    'Celebrate 2026',
    'Aa Bb Gg 123',
  ];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* 1. Trigger Button showing Live Preview of currently selected font */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full p-2.5 bg-white border border-slate-300 hover:border-rose-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 rounded-xl text-left transition shadow-2xs group cursor-pointer flex flex-col gap-1"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800 group-hover:text-rose-600 transition">
              {activeFont.name}
            </span>
            <span className="text-[9px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
              {activeFont.category}
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 group-hover:text-rose-500 transition">
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">Change</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-rose-500' : ''
              }`}
            />
          </div>
        </div>

        {/* Live Font Style Preview on the button */}
        <div
          style={{
            fontFamily: activeFont.family,
            fontWeight,
            fontStyle,
            color,
          }}
          className="text-base sm:text-lg leading-tight truncate text-slate-900 border-t border-slate-100 pt-1 mt-0.5"
        >
          {previewSampleText.trim() ? previewSampleText : activeFont.name}
        </div>
      </button>

      {/* 2. Dropdown Menu with Live Previews */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute z-60 left-0 right-0 md:left-auto md:right-0 md:w-84 lg:w-92 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
          style={{ maxHeight: '480px' }}
        >
          {/* Header & Live Preview Input */}
          <div className="p-3 bg-slate-50/90 border-b border-slate-200 shrink-0 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-rose-500" />
                <span>Typography & Font Styles</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {filteredFonts.length} of {AVAILABLE_FONTS.length} fonts
              </span>
            </div>

            {/* Custom Live Preview Text Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600">
                <span>Preview Your Text Live:</span>
                {customPreview !== (previewSampleText || 'Happy Birthday!') && (
                  <button
                    type="button"
                    onClick={() => setCustomPreview(previewSampleText.trim() || 'Happy Birthday!')}
                    className="text-[9px] text-rose-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={customPreview}
                onChange={(e) => setCustomPreview(e.target.value)}
                placeholder="Type your phrase to preview fonts..."
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-rose-500 shadow-2xs"
              />

              {/* Sample preset buttons */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {samplePresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      if (preset === 'Card Text') {
                        setCustomPreview(previewSampleText.trim() || 'Happy Birthday!');
                      } else {
                        setCustomPreview(preset);
                      }
                    }}
                    className={`text-[9px] px-1.5 py-0.5 rounded-md border transition cursor-pointer ${
                      customPreview === preset || (preset === 'Card Text' && customPreview === previewSampleText.trim())
                        ? 'bg-rose-50 text-rose-600 border-rose-300 font-semibold'
                        : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search font by name..."
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs placeholder:text-slate-400 focus:outline-hidden focus:border-rose-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[10px]">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-full whitespace-nowrap transition cursor-pointer font-medium ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Font List with Live Previews */}
          <div className="overflow-y-auto divide-y divide-slate-100 p-1 flex-1">
            {filteredFonts.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-1">
                <p className="text-xs font-semibold text-slate-600">No matching fonts found</p>
                <p className="text-[11px]">Try clearing your search query or choosing another category.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="mt-2 text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              filteredFonts.map((font) => {
                const isSelected = activeFont.id === font.id;
                const displayText = customPreview.trim() || font.name;

                return (
                  <div
                    key={font.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectFont(font.family);
                      setIsOpen(false);
                    }}
                    className={`p-2.5 rounded-xl cursor-pointer transition flex flex-col gap-1 group/item select-none ${
                      isSelected
                        ? 'bg-rose-50/80 border border-rose-300/80'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    {/* Header: Name, Category, Check */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold ${
                            isSelected
                              ? 'text-rose-700'
                              : 'text-slate-800 group-hover/item:text-rose-600'
                          }`}
                        >
                          {font.name}
                        </span>
                        <span className="text-[9px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded">
                          {font.category}
                        </span>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-1 text-rose-600 text-[10px] font-bold">
                          <Check className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </div>
                      )}
                    </div>

                    {/* LIVE FONT PREVIEW LINE */}
                    <div
                      style={{
                        fontFamily: font.family,
                        fontWeight,
                        fontStyle,
                      }}
                      className={`text-lg sm:text-xl leading-normal truncate py-0.5 transition-transform duration-100 ${
                        isSelected
                          ? 'text-rose-950 font-medium'
                          : 'text-slate-900 group-hover/item:text-slate-950 group-hover/item:translate-x-0.5'
                      }`}
                    >
                      {displayText}
                    </div>

                    {/* Quick alphabet teaser */}
                    <div
                      style={{ fontFamily: font.family }}
                      className="text-[10px] text-slate-400 truncate opacity-75 group-hover/item:opacity-100"
                    >
                      Aa Bb Cc Dd Ee • 0 1 2 3 4 5 6 7 8 9
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with quick tip */}
          <div className="p-2 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1 text-slate-600">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Real-time Google WebFonts preview</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-600 hover:text-slate-900 font-semibold px-2 py-0.5 rounded hover:bg-slate-200/60 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
