import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Search,
  X,
  Heart,
  Star,
  PartyPopper,
  Cake,
  Palette,
  Check,
  Maximize2,
  Sliders,
  Flame,
  Award
} from 'lucide-react';
import { STICKER_CATALOG, STICKER_CATEGORIES, StickerItem } from '../../data/elements';
import { PRESET_COLORS } from '../../data/fonts';

interface StickerLibraryPanelProps {
  onAddSticker: (
    stickerId: string,
    svg?: string,
    emoji?: string,
    color?: string,
    name?: string,
    sizePercent?: number
  ) => void;
  className?: string;
  isModal?: boolean;
  onCloseModal?: () => void;
}

export const StickerLibraryPanel: React.FC<StickerLibraryPanelProps> = ({
  onAddSticker,
  className = '',
  isModal = false,
  onCloseModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'svg' | 'emoji'>('all');
  const [selectedColor, setSelectedColor] = useState<string>('default'); // 'default' or hex string
  const [selectedSize, setSelectedSize] = useState<number>(22); // percent of canvas
  const [placedToast, setPlacedToast] = useState<string | null>(null);
  const [isFullGalleryOpen, setIsFullGalleryOpen] = useState(false);

  // Curated color options for SVG decorative elements
  const tintOptions = [
    { label: 'Original', value: 'default', color: '#f43f5e' },
    { label: 'Berry Rose', value: '#e11d48', color: '#e11d48' },
    { label: 'Hot Pink', value: '#ec4899', color: '#ec4899' },
    { label: 'Warm Gold', value: '#eab308', color: '#eab308' },
    { label: 'Amber Orange', value: '#f97316', color: '#f97316' },
    { label: 'Royal Blue', value: '#2563eb', color: '#2563eb' },
    { label: 'Sky Blue', value: '#0284c7', color: '#0284c7' },
    { label: 'Emerald Teal', value: '#0d9488', color: '#0d9488' },
    { label: 'Mint Green', value: '#10b981', color: '#10b981' },
    { label: 'Purple Violet', value: '#8b5cf6', color: '#8b5cf6' },
    { label: 'Deep Slate', value: '#1e293b', color: '#1e293b' },
    { label: 'Pure White', value: '#ffffff', color: '#ffffff' },
  ];

  // Quick picks: popular SVG decorative elements (hearts, stars, party hats, cakes, balloons)
  const quickPickIds = [
    'heart-full',
    'star-classic',
    'party-hat-polka',
    'party-hat',
    'balloon-party',
    'birthday-cake',
    'magic-wand',
    'crown-gold',
  ];

  const quickPicks = useMemo(() => {
    return STICKER_CATALOG.filter((s) => quickPickIds.includes(s.id));
  }, []);

  // Filtered sticker list
  const filteredStickers = useMemo(() => {
    return STICKER_CATALOG.filter((stk) => {
      // Type filter (SVG vs Emoji)
      if (typeFilter === 'svg' && !stk.svg) return false;
      if (typeFilter === 'emoji' && !stk.emoji) return false;

      // Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'Love' && stk.category !== 'Love') return false;
        if (selectedCategory === 'Birthday' && stk.category !== 'Birthday') return false;
        if (selectedCategory === 'Celebration' && stk.category !== 'Celebration') return false;
        if (selectedCategory === 'Stars & Magic' && stk.category !== 'Stars & Magic') return false;
        if (selectedCategory === 'Flowers & Nature' && stk.category !== 'Flowers & Nature') return false;
        if (selectedCategory === 'Badges & Ribbons' && stk.category !== 'Badges & Ribbons') return false;
        if (selectedCategory === 'Animals & Pets' && stk.category !== 'Animals & Pets') return false;
        if (selectedCategory === 'Fun & Smileys' && stk.category !== 'Fun & Smileys') return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = stk.name.toLowerCase().includes(q);
        const matchesCat = stk.category.toLowerCase().includes(q);
        const matchesTags = stk.tags && stk.tags.some((t) => t.toLowerCase().includes(q));
        return matchesName || matchesCat || Boolean(matchesTags);
      }

      return true;
    });
  }, [selectedCategory, typeFilter, searchQuery]);

  const handlePlace = (stk: StickerItem) => {
    const finalColor =
      selectedColor === 'default'
        ? stk.defaultColor || '#e11d48'
        : selectedColor;

    onAddSticker(stk.id, stk.svg, stk.emoji, finalColor, stk.name, selectedSize);

    // Toast feedback
    setPlacedToast(stk.name);
    setTimeout(() => {
      setPlacedToast(null);
    }, 2000);
  };

  const svgCount = useMemo(() => STICKER_CATALOG.filter((s) => s.svg).length, []);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Toast notification when sticker placed */}
      {placedToast && (
        <div className="p-2 mb-2 bg-emerald-900/90 text-emerald-100 rounded-xl text-xs font-semibold flex items-center justify-between shadow-md border border-emerald-700/60 animate-in fade-in slide-in-from-top-2 duration-150">
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Placed &ldquo;{placedToast}&rdquo; on card!</span>
          </span>
          <span className="text-[10px] text-emerald-300 font-mono">Ready to move/resize</span>
        </div>
      )}

      {/* Header with Title & Stats */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-rose-500" />
            <h3 className="font-bold text-slate-900 text-sm">Sticker Library</h3>
          </div>
          <p className="text-[11px] text-slate-500">
            SVG decorative elements & stickers for your card
          </p>
        </div>

        {!isModal && (
          <button
            type="button"
            onClick={() => setIsFullGalleryOpen(true)}
            className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 px-2 py-1 rounded-lg transition cursor-pointer"
            title="Open Full Sticker Gallery Modal"
          >
            <Maximize2 className="w-3 h-3" />
            <span className="hidden sm:inline">Expand</span>
          </button>
        )}

        {isModal && onCloseModal && (
          <button
            type="button"
            onClick={onCloseModal}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Quick Picks: Popular SVGs (Hearts, Stars, Party Hats, Cake) */}
      {!searchQuery && selectedCategory === 'all' && (
        <div className="mb-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-500" />
              <span>Popular Decorative Elements</span>
            </span>
            <span className="text-[9px] font-mono text-slate-400">1-Click Add</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {quickPicks.map((stk) => {
              const activeColor =
                selectedColor === 'default'
                  ? stk.defaultColor || '#e11d48'
                  : selectedColor;

              return (
                <button
                  key={stk.id}
                  type="button"
                  onClick={() => handlePlace(stk)}
                  className="p-1.5 bg-white border border-slate-200 hover:border-rose-400 rounded-xl flex flex-col items-center justify-center transition hover:shadow-sm group cursor-pointer"
                  title={`Place ${stk.name}`}
                >
                  <div className="w-7 h-7 flex items-center justify-center">
                    {stk.svg && (
                      <div
                        className="w-6 h-6 group-hover:scale-115 transition-transform [&>svg]:w-full [&>svg]:h-full"
                        style={{ color: activeColor }}
                        dangerouslySetInnerHTML={{ __html: stk.svg }}
                      />
                    )}
                  </div>
                  <span className="text-[9px] font-medium text-slate-600 truncate max-w-full group-hover:text-rose-600 mt-0.5">
                    {stk.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative mb-2.5 shrink-0">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search hearts, stars, party hats, cakes..."
          className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-rose-500 focus:bg-white transition"
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

      {/* Type Filter: All vs SVG Vectors vs Emojis */}
      <div className="flex items-center gap-1 mb-2.5 shrink-0 text-[11px] bg-slate-100 p-0.5 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setTypeFilter('all')}
          className={`flex-1 py-1 rounded-lg font-medium transition cursor-pointer text-center ${
            typeFilter === 'all'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All ({STICKER_CATALOG.length})
        </button>
        <button
          type="button"
          onClick={() => setTypeFilter('svg')}
          className={`flex-1 py-1 rounded-lg font-medium transition cursor-pointer text-center flex items-center justify-center gap-1 ${
            typeFilter === 'svg'
              ? 'bg-white text-rose-600 shadow-2xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3 h-3 text-rose-500" />
          <span>SVG Decors ({svgCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setTypeFilter('emoji')}
          className={`flex-1 py-1 rounded-lg font-medium transition cursor-pointer text-center ${
            typeFilter === 'emoji'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Emojis ({STICKER_CATALOG.length - svgCount})
        </button>
      </div>

      {/* SVG Color Tint Customizer */}
      <div className="mb-2.5 p-2 bg-slate-50 border border-slate-200/80 rounded-xl shrink-0">
        <div className="flex items-center justify-between mb-1.5 text-[10px]">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <Palette className="w-3 h-3 text-rose-500" />
            <span>SVG Tint Color:</span>
          </span>
          <span className="font-mono text-slate-400">
            {selectedColor === 'default' ? 'Designer Defaults' : selectedColor}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {tintOptions.map((opt) => {
            const isSelected = selectedColor === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedColor(opt.value)}
                style={{ backgroundColor: opt.color }}
                className={`w-5 h-5 rounded-full shrink-0 border transition-transform cursor-pointer relative ${
                  isSelected
                    ? 'ring-2 ring-rose-500 ring-offset-1 scale-110 shadow-xs'
                    : 'border-slate-300 hover:scale-110'
                }`}
                title={opt.label}
              >
                {isSelected && (
                  <Check
                    className={`w-3 h-3 absolute inset-0 m-auto ${
                      opt.value === '#ffffff' || opt.value === '#eab308'
                        ? 'text-slate-900'
                        : 'text-white'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Placement Size Selector */}
      <div className="flex items-center justify-between mb-2.5 px-1 shrink-0 text-[10px] text-slate-500">
        <span>Placement Size:</span>
        <div className="flex items-center gap-1">
          {[
            { label: 'Small', val: 15 },
            { label: 'Medium', val: 22 },
            { label: 'Large', val: 32 },
          ].map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setSelectedSize(s.val)}
              className={`px-2 py-0.5 rounded-md border text-[10px] transition cursor-pointer ${
                selectedSize === s.val
                  ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 shrink-0 scrollbar-thin">
        {STICKER_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2.5 py-1 text-[11px] rounded-full whitespace-nowrap font-medium transition cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-rose-500 text-white shadow-xs font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Stickers Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredStickers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1">
            <p className="font-semibold text-slate-600">No stickers found</p>
            <p className="text-[11px]">
              No stickers match &ldquo;{searchQuery}&rdquo;. Try another term.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setTypeFilter('all');
              }}
              className="mt-2 text-rose-600 font-bold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div
            className={`grid gap-2 ${
              isModal
                ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8'
                : 'grid-cols-3'
            }`}
          >
            {filteredStickers.map((stk) => {
              const activeColor =
                selectedColor === 'default'
                  ? stk.defaultColor || '#e11d48'
                  : selectedColor;

              return (
                <button
                  key={stk.id}
                  type="button"
                  onClick={() => handlePlace(stk)}
                  className="p-2.5 bg-slate-50 hover:bg-rose-50/80 border border-slate-200 hover:border-rose-400 rounded-xl flex flex-col items-center justify-between transition group hover:shadow-xs cursor-pointer min-h-[78px]"
                  title={`Click to place ${stk.name} on card`}
                >
                  <div className="w-8 h-8 flex items-center justify-center my-auto">
                    {stk.svg ? (
                      <div
                        className="w-7 h-7 text-slate-700 group-hover:scale-120 transition-transform [&>svg]:w-full [&>svg]:h-full drop-shadow-2xs"
                        style={{ color: activeColor }}
                        dangerouslySetInnerHTML={{ __html: stk.svg }}
                      />
                    ) : (
                      <span className="text-2xl group-hover:scale-125 transition-transform select-none">
                        {stk.emoji}
                      </span>
                    )}
                  </div>

                  <span className="text-[9.5px] font-medium text-slate-600 mt-1 truncate max-w-full text-center group-hover:text-rose-700 leading-tight">
                    {stk.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Expanded Modal Dialog when user clicks "Expand" */}
      {isFullGalleryOpen && (
        <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Sticker & Decorative Element Library
                  </h2>
                  <p className="text-xs text-slate-500">
                    Choose from {STICKER_CATALOG.length} high-resolution SVG vector elements & decals
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFullGalleryOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto">
              <StickerLibraryPanel
                onAddSticker={(id, svg, emoji, col, name, size) => {
                  onAddSticker(id, svg, emoji, col, name, size);
                }}
                isModal={true}
                onCloseModal={() => setIsFullGalleryOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
