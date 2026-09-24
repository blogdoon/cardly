import React, { useState } from 'react';
import {
  Type,
  Image as ImageIcon,
  Sparkles,
  PaintBucket,
  Layers,
  Wand2,
  Plus,
  Upload,
  BookOpen,
  Search,
  X
} from 'lucide-react';
import { CardPageType } from '../../types/template';
import { STICKER_CATALOG, STICKER_CATEGORIES } from '../../data/elements';
import { PRESET_COLORS } from '../../data/fonts';

interface EditorSidebarProps {
  currentPage: CardPageType;
  onPageChange: (page: CardPageType) => void;
  onAddText: (type: 'heading' | 'subheading' | 'body') => void;
  onAddPhoto: (imageUrl: string) => void;
  onAddSticker: (
    stickerId: string,
    svg?: string,
    emoji?: string,
    color?: string,
    name?: string
  ) => void;
  onBackgroundChange: (bg: string, gradient?: string) => void;
  quickFields: {
    name: string;
    message: string;
  };
  onQuickFieldChange: (field: 'name' | 'message', val: string) => void;
}

type TabType = 'quick' | 'text' | 'photos' | 'elements' | 'background' | 'pages';

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
  currentPage,
  onPageChange,
  onAddText,
  onAddPhoto,
  onAddSticker,
  onBackgroundChange,
  quickFields,
  onQuickFieldChange,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('quick');
  const [isUploading, setIsUploading] = useState(false);
  const [stickerCategory, setStickerCategory] = useState<string>('all');
  const [stickerSearch, setStickerSearch] = useState<string>('');
  // Mobile: tab content stays collapsed until a tab is tapped (desktop always shows it)
  const [mobileOpen, setMobileOpen] = useState(false);
  const selectTab = (tab: TabType) => {
    setActiveTab(tab);
    setMobileOpen(activeTab === tab ? !mobileOpen : true);
  };

  const filteredStickers = STICKER_CATALOG.filter((stk) => {
    const matchesCategory = stickerCategory === 'all' || stk.category === stickerCategory;
    const matchesSearch =
      !stickerSearch.trim() ||
      stk.name.toLowerCase().includes(stickerSearch.toLowerCase()) ||
      Boolean(stk.tags && stk.tags.some((t) => t.toLowerCase().includes(stickerSearch.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  const samplePhotos = [
    'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80',
  ];

  const backgroundGradients = [
    { name: 'Soft Blush', val: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)', color: '#fdf2f8' },
    { name: 'Sky Breeze', val: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', color: '#eff6ff' },
    { name: 'Mint Meadow', val: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', color: '#f0fdf4' },
    { name: 'Golden Glow', val: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', color: '#fef3c7' },
    { name: 'Lavender Mist', val: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', color: '#faf5ff' },
    { name: 'Midnight Glam', val: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#0f172a' },
    { name: 'Warm Crimson', val: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)', color: '#fff1f2' },
    { name: 'Pure White', val: '#ffffff', color: '#ffffff' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Photo must be less than 10MB.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      onAddPhoto(reader.result as string);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col-reverse h-full border-t border-slate-200 bg-white md:flex-row md:border-t-0 md:border-r">
      {/* Primary vertical icon bar */}
      <div className="w-full bg-slate-50 border-t border-slate-200 flex flex-row items-center justify-around py-2 shrink-0 md:w-18 md:border-t-0 md:border-r md:flex-col md:justify-start md:py-4 md:space-y-4">
        <button
          onClick={() => selectTab('quick')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold transition w-14 ${
            activeTab === 'quick'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Wand2 className="w-5 h-5" />
          <span>Quick Fill</span>
        </button>

        <button
          onClick={() => selectTab('text')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold transition w-14 ${
            activeTab === 'text'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Type className="w-5 h-5" />
          <span>Text</span>
        </button>

        <button
          onClick={() => selectTab('photos')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold transition w-14 ${
            activeTab === 'photos'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <ImageIcon className="w-5 h-5" />
          <span>Photos</span>
        </button>

        <button
          onClick={() => selectTab('elements')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold transition w-14 ${
            activeTab === 'elements'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span>Stickers</span>
        </button>

        <button
          onClick={() => selectTab('background')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold transition w-14 ${
            activeTab === 'background'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <PaintBucket className="w-5 h-5" />
          <span>Color</span>
        </button>

        <button
          onClick={() => selectTab('pages')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold transition w-14 ${
            activeTab === 'pages'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span>Pages</span>
        </button>
      </div>

      {/* Secondary flyout tab content panel */}
      <div className={`p-4 overflow-y-auto bg-white w-full max-h-[45vh] md:max-h-none md:w-64 lg:w-72 ${mobileOpen ? '' : 'hidden'} md:block`}>
        {/* Quick Fill Panel */}
        {activeTab === 'quick' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Quick Personalization</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Type details here to instantly update your card text.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={quickFields.name}
                  onChange={(e) => onQuickFieldChange('name', e.target.value)}
                  placeholder="e.g. Sarah, Mum, Bestie"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-rose-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Card Headline / Message
                </label>
                <textarea
                  rows={3}
                  value={quickFields.message}
                  onChange={(e) => onQuickFieldChange('message', e.target.value)}
                  placeholder="e.g. Happy 30th Birthday!"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-rose-500 font-medium resize-none"
                />
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-xs text-rose-800">
                💡 <strong>Tip:</strong> You can also click directly on any text or photo on the card to edit, move, or resize it!
              </div>
            </div>
          </div>
        )}

        {/* Text Tab */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Add Text Elements</h3>
              <p className="text-xs text-slate-500 mt-0.5">Click to place text onto the card canvas.</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => onAddText('heading')}
                className="w-full p-3 border border-slate-200 hover:border-rose-400 hover:bg-rose-50 rounded-xl text-left transition group"
              >
                <div className="font-extrabold text-base text-slate-900 group-hover:text-rose-600">
                  Add Big Headline
                </div>
                <div className="text-[11px] text-slate-500">Bold statement for card covers</div>
              </button>

              <button
                onClick={() => onAddText('subheading')}
                className="w-full p-3 border border-slate-200 hover:border-rose-400 hover:bg-rose-50 rounded-xl text-left transition group"
              >
                <div className="font-semibold text-sm text-slate-800 group-hover:text-rose-600">
                  Add Subtitle / Name
                </div>
                <div className="text-[11px] text-slate-500">Great for names and dates</div>
              </button>

              <button
                onClick={() => onAddText('body')}
                className="w-full p-3 border border-slate-200 hover:border-rose-400 hover:bg-rose-50 rounded-xl text-left transition group"
              >
                <div className="font-normal text-xs text-slate-700 font-serif italic group-hover:text-rose-600">
                  Add Handwritten Message
                </div>
                <div className="text-[11px] text-slate-500">Perfect for the inside greeting</div>
              </button>
            </div>
          </div>
        )}

        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Customer Photos</h3>
              <p className="text-xs text-slate-500 mt-0.5">Upload personal memories to make it special.</p>
            </div>

            {/* Upload Button */}
            <label className="border-2 border-dashed border-rose-300 hover:border-rose-500 bg-rose-50/50 hover:bg-rose-50 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-6 h-6 text-rose-500 mb-1.5" />
              <span className="text-xs font-bold text-rose-700">
                {isUploading ? 'Loading photo...' : 'Upload Your Photo'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">JPG, PNG, WEBP up to 10MB</span>
            </label>

            {/* Sample Gallery */}
            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-2">Preset Photos</span>
              <div className="grid grid-cols-2 gap-2">
                {samplePhotos.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => onAddPhoto(url)}
                    className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 hover:scale-105 transition"
                  >
                    <img src={url} alt="sample" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stickers & Elements Tab */}
        {activeTab === 'elements' && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">Stickers & Decors</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full">
                  {filteredStickers.length} stickers
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Click any sticker to place onto the card.</p>
            </div>

            {/* Sticker search bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={stickerSearch}
                onChange={(e) => setStickerSearch(e.target.value)}
                placeholder="Search stickers (e.g. cake, heart)..."
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-rose-500 focus:bg-white"
              />
              {stickerSearch && (
                <button
                  onClick={() => setStickerSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1.5 scrollbar-thin">
              {STICKER_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setStickerCategory(cat.id)}
                  className={`px-2.5 py-1 text-[11px] rounded-full whitespace-nowrap font-medium transition ${
                    stickerCategory === cat.id
                      ? 'bg-rose-500 text-white shadow-xs font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Stickers grid */}
            {filteredStickers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                No stickers found matching &ldquo;{stickerSearch}&rdquo;
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-[460px] overflow-y-auto pr-1">
                {filteredStickers.map((stk) => (
                  <button
                    key={stk.id}
                    onClick={() =>
                      onAddSticker(stk.id, stk.svg, stk.emoji, stk.defaultColor, stk.name)
                    }
                    className="p-2.5 bg-slate-50 hover:bg-rose-50/80 border border-slate-200 hover:border-rose-300 rounded-xl flex flex-col items-center justify-center transition group hover:shadow-xs"
                    title={stk.name}
                  >
                    <div className="w-8 h-8 flex items-center justify-center">
                      {stk.svg ? (
                        <div
                          className="w-7 h-7 text-slate-700 group-hover:scale-110 transition-transform [&>svg]:w-full [&>svg]:h-full"
                          style={{ color: stk.defaultColor || '#e11d48' }}
                          dangerouslySetInnerHTML={{ __html: stk.svg }}
                        />
                      ) : (
                        <span className="text-2xl group-hover:scale-125 transition-transform select-none">
                          {stk.emoji}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-slate-600 mt-1 truncate max-w-full text-center group-hover:text-rose-700">
                      {stk.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Background Tab */}
        {activeTab === 'background' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Card Background</h3>
              <p className="text-xs text-slate-500 mt-0.5">Select a gradient or solid background.</p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-2">Preset Gradients</span>
              <div className="grid grid-cols-2 gap-2">
                {backgroundGradients.map((bg, idx) => (
                  <button
                    key={idx}
                    onClick={() => onBackgroundChange(bg.color, bg.val)}
                    style={{ background: bg.val }}
                    className="h-12 rounded-xl border border-slate-300 shadow-xs flex items-center justify-center text-[10px] font-bold text-slate-700 hover:scale-105 transition"
                  >
                    {bg.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-2">Solid Colors</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((col) => (
                  <button
                    key={col}
                    onClick={() => onBackgroundChange(col, undefined)}
                    style={{ backgroundColor: col }}
                    className="w-7 h-7 rounded-full border border-slate-300 hover:scale-110 transition shadow-xs"
                    title={col}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pages Tab */}
        {activeTab === 'pages' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Card Pages</h3>
              <p className="text-xs text-slate-500 mt-0.5">Switch between front cover and inside greeting.</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => onPageChange('front')}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                  currentPage === 'front'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>Front Cover</span>
                <span className="text-xs font-normal">Main artwork</span>
              </button>

              <button
                onClick={() => onPageChange('inside-left')}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                  currentPage === 'inside-left'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>Inside Left</span>
                <span className="text-xs font-normal">Photo / blank</span>
              </button>

              <button
                onClick={() => onPageChange('inside-right')}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                  currentPage === 'inside-right'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>Inside Right</span>
                <span className="text-xs font-normal">Personal message</span>
              </button>

              <button
                onClick={() => onPageChange('back')}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                  currentPage === 'back'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>Back Cover</span>
                <span className="text-xs font-normal">Brand hallmark</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
