import React, { useState, useRef } from 'react';
import {
  Folder,
  FolderHeart,
  Image as ImageIcon,
  Upload,
  Plus,
  Trash2,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Palette,
  Eye,
  CheckCircle2,
  Info,
  ChevronRight,
  Layers
} from 'lucide-react';
import { CardTemplate, OccasionType, RecipientType, CardStyleType } from '../../types/template';
import {
  getOccasionImageEntries,
  getCustomUploadedTemplates,
  createTemplateFromOccasionImage,
  OCCASION_MESSAGES,
  FOLDER_OCCASION_MAP,
  OccasionImageEntry
} from '../../utils/occasionTemplateLoader';
import { registerCustomTemplate, unregisterCustomTemplate } from '../../data/templates';
import { upsertTemplate } from '../../services/catalogService';
import { useCatalog } from '../../context/CatalogContext';
import { formatPrice } from '../../utils/currency';
import { OCCASIONS_LIST, RECIPIENTS_LIST, STYLES_LIST } from '../../data/categories';
import type { BrowseFacets } from '../../utils/routes';

interface OccasionStudioProps {
  onNavigate: (route: string, param?: string, facets?: BrowseFacets) => void;
  onTemplateCreated?: (template: CardTemplate) => void;
}

const PRESET_SWATCHES = [
  { label: 'Deep Wine', color: '#881337' },
  { label: 'Royal Berry', color: '#9f1239' },
  { label: 'Imperial Navy', color: '#1e3a8a' },
  { label: 'Forest Pine', color: '#166534' },
  { label: 'Antique Gold', color: '#b45309' },
  { label: 'Warm Charcoal', color: '#1e293b' },
  { label: 'Soft Plum', color: '#581c87' },
  { label: 'Earthy Teal', color: '#0f766e' },
];

export const OccasionStudio: React.FC<OccasionStudioProps> = ({ onNavigate, onTemplateCreated }) => {
  const { deleteTemplate } = useCatalog();
  const [occasionEntries, setOccasionEntries] = useState<OccasionImageEntry[]>(() => getOccasionImageEntries());
  const [customTemplates, setCustomTemplates] = useState<CardTemplate[]>(() => getCustomUploadedTemplates());

  // Form State
  const [selectedOccasion, setSelectedOccasion] = useState<OccasionType>('Birthday');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [imageFileName, setImageFileName] = useState<string>('');
  const [cardTitle, setCardTitle] = useState<string>('');
  const [textColor, setTextColor] = useState<string>(OCCASION_MESSAGES['Birthday'].defaultColor);
  const [price, setPrice] = useState<number>(4.29);
  const [recipient, setRecipient] = useState<RecipientType>('Anyone');
  const [style, setStyle] = useState<CardStyleType>('Floral');

  // Preview / UI states
  const [showSafeOverlay, setShowSafeOverlay] = useState<boolean>(true);
  const [previewTab, setPreviewTab] = useState<'front' | 'inside'>('front');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [latestCreatedTemplate, setLatestCreatedTemplate] = useState<CardTemplate | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [activePresetFilter, setActivePresetFilter] = useState<string>('All');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived folder slug for selected occasion
  const selectedSlug = Object.entries(FOLDER_OCCASION_MAP).find(
    ([, occ]) => occ === selectedOccasion
  )?.[0] || selectedOccasion.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // When occasion changes, update defaults if user hasn't heavily customized
  const handleOccasionChange = (occ: OccasionType) => {
    setSelectedOccasion(occ);
    const meta = OCCASION_MESSAGES[occ] || OCCASION_MESSAGES['Birthday'];
    setTextColor(meta.defaultColor);
    if (!cardTitle || cardTitle.includes('Artisan Stationery Card')) {
      setCardTitle(`${occ} Artisan Stationery Card`);
    }
  };

  // Handle local file upload (drag & drop or picker)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    // Auto-generate clean title from file name if blank
    const clean = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    setCardTitle(`${clean} ${selectedOccasion} Card`);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setUploadedImageUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Select a pre-existing bundled image from occasion folder
  const handleSelectPreset = (entry: OccasionImageEntry) => {
    setSelectedOccasion(entry.occasion);
    setUploadedImageUrl(entry.imageUrl);
    setImageFileName(entry.fileName);
    setCardTitle(`${entry.cleanName} ${entry.occasion} Card`);
    const meta = OCCASION_MESSAGES[entry.occasion] || OCCASION_MESSAGES['Birthday'];
    setTextColor(meta.defaultColor);
  };

  // Generate & Publish Template
  //
  // The catalog now lives in Firestore and nothing is bundled, so "publish" must
  // actually write to the database — otherwise a card created here would only
  // ever exist in this browser. We register locally first so the UI updates
  // instantly, then persist; a failed write is reported rather than swallowed.
  const handleGenerateTemplate = async () => {
    if (!uploadedImageUrl) {
      alert('Please upload an image or select a bundled artwork first.');
      return;
    }
    if (isPublishing) return;

    const newTemplate = createTemplateFromOccasionImage({
      occasion: selectedOccasion,
      imageUrl: uploadedImageUrl,
      title: cardTitle || `${selectedOccasion} Artisan Stationery Card`,
      textColor,
      price,
      recipient,
      style,
      tags: [selectedSlug, 'occasion-folder-generator'],
    });

    setIsPublishing(true);
    registerCustomTemplate(newTemplate);
    setCustomTemplates(getCustomUploadedTemplates());
    setLatestCreatedTemplate(newTemplate);

    try {
      await upsertTemplate(newTemplate);
      setPublishError(null);
    } catch (e) {
      console.error('Could not publish template to Firestore:', e);
      setPublishError(
        e instanceof Error
          ? `Saved in this browser only — publishing to the database failed: ${e.message}`
          : 'Saved in this browser only — publishing to the database failed.'
      );
    } finally {
      setIsPublishing(false);
      if (onTemplateCreated) {
        onTemplateCreated(newTemplate);
      }
    }
  };

  const handleDeleteCustomTemplate = async (id: string) => {
    // Drop the local copy first so the list updates, then retire it in the
    // database (if it was ever published) so it leaves the storefront for
    // everyone. A card that never reached Firestore has nothing to retire.
    unregisterCustomTemplate(id);
    setCustomTemplates(getCustomUploadedTemplates());
    if (latestCreatedTemplate?.id === id) {
      setLatestCreatedTemplate(null);
    }

    try {
      await deleteTemplate(id);
    } catch (e) {
      console.warn(`Could not retire ${id} in Firestore:`, e);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedPath(id);
    setTimeout(() => setCopiedPath(null), 2500);
  };

  // Group detected entries by occasion
  const entriesByOccasion = occasionEntries.reduce<Record<string, OccasionImageEntry[]>>((acc, entry) => {
    if (!acc[entry.occasion]) acc[entry.occasion] = [];
    acc[entry.occasion].push(entry);
    return acc;
  }, {});

  return (
    <div className="space-y-10">
      {/* Top Banner & Quick Guide */}
      <div className="p-6 sm:p-8 bg-gradient-to-br from-rose-50 via-amber-50/50 to-orange-50 rounded-3xl border border-rose-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Occasion Studio & Template Generator
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Add new artwork to occasion folders and immediately generate production-ready greeting cards with asymmetric right-edge bleed, text-safe area typography, and instant storefront publishing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setOccasionEntries(getOccasionImageEntries());
                setCustomTemplates(getCustomUploadedTemplates());
              }}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Scan
            </button>
          </div>
        </div>

        {/* Two Workflows Guide */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-white/90 rounded-2xl border border-rose-100 space-y-1.5 text-xs text-slate-700">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Folder className="w-4 h-4 text-rose-500" />
              <span>Method 1: Codebase Occasion Folder</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Drop any <code className="font-mono text-rose-700 bg-rose-50 px-1 rounded">.jpg</code>, <code className="font-mono text-rose-700 bg-rose-50 px-1 rounded">.png</code>, or <code className="font-mono text-rose-700 bg-rose-50 px-1 rounded">.webp</code> into <code className="font-mono text-slate-800 bg-slate-100 px-1 rounded">src/assets/images/occasions/&lt;occasion&gt;/</code>. Vite automatically scans and registers them!
            </p>
          </div>

          <div className="p-4 bg-white/90 rounded-2xl border border-amber-100 space-y-1.5 text-xs text-slate-700">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Upload className="w-4 h-4 text-amber-500" />
              <span>Method 2: Instant Web Generator</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Use the studio below to upload an image or choose existing artwork, preview the card face in real-time, customize typography and palette, and publish to the live catalog with 1 click.
            </p>
          </div>
        </div>
      </div>

      {/* Main Generator Tool */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-8">
        <div>
          <h3 className="text-lg font-black text-slate-900">Create New Occasion Card Template</h3>
          <p className="text-xs text-slate-500">Configure artwork, typography, and text-safe parameters for the front cover</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Occasion */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Select Occasion Folder
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {OCCASIONS_LIST.map((cat) => {
                  const isSelected = selectedOccasion === cat.name;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleOccasionChange(cat.name)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border text-left transition truncate ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-200'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                Folder path: <span className="text-rose-600 font-bold">src/assets/images/occasions/{selectedSlug}/</span>
              </div>
            </div>

            {/* Step 2: Artwork Image */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Choose Artwork Image
                </label>
                {imageFileName && (
                  <span className="text-[11px] text-slate-500 truncate max-w-xs font-mono">
                    {imageFileName}
                  </span>
                )}
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-rose-400 bg-slate-50/50 hover:bg-rose-50/30 rounded-2xl p-6 text-center transition group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="p-3 bg-white group-hover:bg-rose-100/60 rounded-xl text-slate-500 group-hover:text-rose-600 shadow-2xs transition">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 group-hover:text-rose-600">
                      Click to browse or drop image here
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Portrait orientation (3:4 ratio) with artwork concentrated on the right edge is recommended.
                    </p>
                  </div>
                </div>
              </div>

              {/* Or Quick-Pick From Bundled Images */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Or select from bundled folder artwork:</span>
                  <span className="text-[11px] text-slate-400">{occasionEntries.length} images available</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                  {occasionEntries.map((entry) => {
                    const isPicked = uploadedImageUrl === entry.imageUrl;
                    return (
                      <button
                        key={entry.filePath}
                        type="button"
                        onClick={() => handleSelectPreset(entry)}
                        className={`group relative rounded-lg overflow-hidden aspect-3/4 border-2 transition ${
                          isPicked ? 'border-rose-500 ring-2 ring-rose-300' : 'border-slate-200 hover:border-rose-300'
                        }`}
                        title={`${entry.cleanName} (${entry.occasion})`}
                      >
                        <img
                          src={entry.imageUrl}
                          alt={entry.cleanName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <span className="text-[9px] text-white font-bold text-center px-1 leading-tight">
                            {entry.cleanName}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 3: Typography & Copy */}
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                3. Card Title & Typography
              </label>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Card Title (Catalog Display)
                  </label>
                  <input
                    type="text"
                    value={cardTitle}
                    onChange={(e) => setCardTitle(e.target.value)}
                    placeholder="e.g. Lavender & Sweet Pea Botanical Card"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden"
                  />
                </div>

                <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 leading-relaxed">
                  The front cover is <strong>artwork only</strong> — customers add their own wording
                  when they personalise the card, so there is nothing to typeset here. The title above
                  is the catalog name shown in the shop.
                </p>

                {/* Typography Color Swatches */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                    Headline Color Palette
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {PRESET_SWATCHES.map((swatch) => (
                      <button
                        key={swatch.color}
                        type="button"
                        onClick={() => setTextColor(swatch.color)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition ${
                          textColor === swatch.color
                            ? 'ring-2 ring-slate-900 border-transparent shadow-xs'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-black/10"
                          style={{ backgroundColor: swatch.color }}
                        />
                        <span className="text-slate-700">{swatch.label}</span>
                      </button>
                    ))}
                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600">
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border border-slate-200"
                      />
                      <span>{textColor}</span>
                    </div>
                  </div>
                </div>

                {/* Price, Recipient, Style */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Price (EUR)</label>
                    <input
                      type="number"
                      step="0.10"
                      min="1.99"
                      max="9.99"
                      value={price}
                      onChange={(e) => setPrice(parseFloat(e.target.value) || 4.29)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Recipient</label>
                    <select
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value as RecipientType)}
                      className="w-full px-2 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-hidden font-medium"
                    >
                      <option value="Anyone">Anyone</option>
                      {RECIPIENTS_LIST.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Style</label>
                    <select
                      value={style}
                      onChange={(e) => setStyle(e.target.value as CardStyleType)}
                      className="w-full px-2 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-hidden font-medium"
                    >
                      {STYLES_LIST.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {publishError && (
              <p className="mb-3 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-semibold">
                {publishError}
              </p>
            )}

            {/* Action buttons */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={handleGenerateTemplate}
                disabled={isPublishing}
                className="flex-1 py-3 px-6 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Publishing to database…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate & Publish Card Template
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `# 1. Place your image:\ncp your_image.jpg src/assets/images/occasions/${selectedSlug}/\n\n# 2. Vite will auto-discover it on next build!`,
                    'cli-instructions'
                  )
                }
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedPath === 'cli-instructions' ? 'Copied CLI Command!' : 'Copy Codebase Instructions'}
              </button>
            </div>

            {/* Success Feedback Toast */}
            {latestCreatedTemplate && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-900 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <strong className="font-bold">{latestCreatedTemplate.title}</strong> is now live in the store!
                    <div className="text-[11px] text-emerald-700">Template ID: {latestCreatedTemplate.id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigate('editor', latestCreatedTemplate.id)}
                    className="px-3 py-1.5 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-800 transition flex items-center gap-1 text-[11px]"
                  >
                    Personalize in Editor
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onNavigate('card', latestCreatedTemplate.id)}
                    className="px-2.5 py-1.5 bg-white border border-emerald-300 text-emerald-800 font-bold rounded-lg hover:bg-emerald-100/50 transition text-[11px]"
                  >
                    View Card
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Live Card Front Preview
              </span>
              <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewTab('front')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    previewTab === 'front' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Front
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('inside')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    previewTab === 'inside' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Inside
                </button>
              </div>
            </div>

            {/* Realistic Physical Card Canvas Mockup */}
            <div className="relative mx-auto w-full max-w-[320px] aspect-3/4 rounded-2xl overflow-hidden shadow-xl border border-slate-200/80 bg-[#faf8f5]">
              {previewTab === 'front' ? (
                <>
                  {/* Artwork layer (bleeding off right edge) */}
                  {uploadedImageUrl ? (
                    <img
                      src={uploadedImageUrl}
                      alt="Front Artwork Preview"
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[#faf8f5] flex flex-col items-center justify-center p-6 text-center text-slate-400">
                      <ImageIcon className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
                      <p className="text-xs font-medium">Artwork preview will appear here</p>
                    </div>
                  )}

                  {/* Asymmetric Text-Safe Area Box (Center-Left 46% width x 42% height, 8% from left, 30% from top) */}
                  {/*
                    The safe-zone guide is still useful — it shows customers where
                    their own text will sit well on this artwork — but the cover
                    ships blank, so nothing is rendered into it.
                  */}
                  <div
                    className={`absolute left-[8%] top-[30%] w-[46%] h-[42%] transition ${
                      showSafeOverlay ? 'outline-1 outline-dashed outline-rose-400/80 bg-rose-500/5' : ''
                    }`}
                  >
                    {showSafeOverlay && (
                      <span className="absolute -top-4 left-0 text-[8px] font-mono font-bold text-rose-600 bg-white/90 px-1 py-0.2 rounded shadow-2xs">
                        Safe Text Zone (46% × 42%)
                      </span>
                    )}
                  </div>

                  {/* Badge: Ivory Grain Cardstock */}
                  <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 bg-black/40 backdrop-blur-xs text-white text-[9px] font-mono rounded">
                    Warm Ivory Stationery
                  </div>
                </>
              ) : (
                /* Inside Preview */
                <div className="w-full h-full grid grid-cols-2 bg-white divide-x divide-slate-100 p-3">
                  {/* Inside Left (Photo or illustration) */}
                  <div className="p-2 flex flex-col items-center justify-center">
                    {uploadedImageUrl ? (
                      <img
                        src={uploadedImageUrl}
                        alt="Inside Left Keepsake"
                        referrerPolicy="no-referrer"
                        className="w-full aspect-square object-cover rounded-lg shadow-2xs"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-slate-100 rounded-lg flex items-center justify-center text-[10px] text-slate-400">
                        Keepsake photo
                      </div>
                    )}
                  </div>

                  {/* Inside Right (Handwritten font) */}
                  <div className="p-2 flex flex-col justify-center text-center">
                    <p
                      style={{ fontFamily: "'Caveat', cursive" }}
                      className="text-xs text-slate-800 leading-snug whitespace-pre-line"
                    >
                      {OCCASION_MESSAGES[selectedOccasion]?.inside || OCCASION_MESSAGES['Birthday'].inside}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Overlay toggle */}
            {previewTab === 'front' && (
              <div className="flex items-center justify-between text-xs text-slate-600 px-2">
                <span>Display text-safe alignment guide</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSafeOverlay}
                    onChange={(e) => setShowSafeOverlay(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Occasion Folders Explorer */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">Occasion Folders Directory</h3>
            <p className="text-xs text-slate-500">
              Scanned from <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">src/assets/images/occasions/</code>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter:</span>
            <select
              value={activePresetFilter}
              onChange={(e) => setActivePresetFilter(e.target.value)}
              className="p-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-white"
            >
              <option value="All">All Occasions ({OCCASIONS_LIST.length})</option>
              {OCCASIONS_LIST.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {OCCASIONS_LIST.filter((cat) => activePresetFilter === 'All' || cat.name === activePresetFilter).map((cat) => {
            const slug = Object.entries(FOLDER_OCCASION_MAP).find(([, o]) => o === cat.name)?.[0] || cat.slug;
            const images = entriesByOccasion[cat.name] || [];
            const folderPath = `src/assets/images/occasions/${slug}/`;

            return (
              <div
                key={cat.id}
                className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 space-y-3 transition flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-rose-500" />
                      <strong className="text-sm font-bold text-slate-900">{cat.name}</strong>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-mono text-[10px] font-bold rounded-full">
                      {images.length} {images.length === 1 ? 'image' : 'images'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 bg-white p-2 rounded-xl border border-slate-200/80">
                    <span className="truncate">{folderPath}</span>
                    <button
                      onClick={() => copyToClipboard(folderPath, folderPath)}
                      className="ml-2 text-rose-600 hover:text-rose-700 font-bold shrink-0 text-[10px]"
                      title="Copy folder path"
                    >
                      {copiedPath === folderPath ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  {/* Thumbnail Row */}
                  {images.length > 0 ? (
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {images.slice(0, 4).map((img) => (
                        <div
                          key={img.filePath}
                          className="aspect-3/4 rounded-lg overflow-hidden border border-slate-200 bg-white"
                          title={img.cleanName}
                        >
                          <img
                            src={img.imageUrl}
                            alt={img.cleanName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic py-1">No custom images found yet in this folder.</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/80">
                  <button
                    onClick={() => {
                      handleOccasionChange(cat.name);
                      window.scrollTo({ top: 300, behavior: 'smooth' });
                    }}
                    className="w-full py-1.5 px-3 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Generate Template For {cat.name}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Generated Custom Templates Management */}
      {customTemplates.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">Custom Generated Templates ({customTemplates.length})</h3>
              <p className="text-xs text-slate-500">Live templates created via the Occasion Studio</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white flex gap-4 items-center justify-between"
              >
                <div className="flex items-center space-x-3 truncate">
                  <img
                    src={tpl.thumbnail}
                    alt={tpl.title}
                    referrerPolicy="no-referrer"
                    className="w-14 h-18 object-cover rounded-lg border border-slate-200 shrink-0"
                  />
                  <div className="truncate">
                    <h4 className="font-bold text-slate-900 text-xs truncate">{tpl.title}</h4>
                    <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                      {tpl.category}
                    </span>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{formatPrice(tpl.price)}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => onNavigate('editor', tpl.id)}
                    className="px-2.5 py-1 bg-rose-600 text-white text-[10px] font-bold rounded-lg hover:bg-rose-700 transition"
                  >
                    Editor
                  </button>
                  <button
                    onClick={() => onNavigate('card', tpl.id)}
                    className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg hover:bg-slate-200 transition"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDeleteCustomTemplate(tpl.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition self-center"
                    title="Delete template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
