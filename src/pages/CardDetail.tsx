import React, { useState, useEffect } from 'react';
import {
  Heart,
  Sparkles,
  ShoppingBag,
  Truck,
  ShieldCheck,
  Star,
  Check,
  ArrowLeft,
  Eye,
  Camera,
  Layers,
  ChevronRight
} from 'lucide-react';
import { CardTemplate, CardSize } from '../types/template';
import { getTemplateById } from '../data/templates';
import { CARD_SIZES, ENVELOPE_COLORS } from '../data/fonts';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import { recordRecentlyViewed } from '../services/cardStorage';
import { getRecommendationsForTemplate } from '../utils/recommendations';
import { CardTile } from '../components/CardTile';
import { PreviewModal } from '../components/PreviewModal';
import { PrintPreview } from '../components/PrintPreview';

interface CardDetailProps {
  templateId: string;
  onBack: () => void;
  onPersonalize: (templateId: string) => void;
  onSelectCard: (templateId: string) => void;
}

export const CardDetail: React.FC<CardDetailProps> = ({
  templateId,
  onBack,
  onPersonalize,
  onSelectCard,
}) => {
  const template = getTemplateById(templateId);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addItem } = useCart();

  const [selectedSize, setSelectedSize] = useState<CardSize>('standard');
  const [selectedEnvelope, setSelectedEnvelope] = useState(ENVELOPE_COLORS[0].id);
  const [activeTab, setActiveTab] = useState<'front' | 'inside' | 'back'>('front');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  useEffect(() => {
    if (templateId) {
      recordRecentlyViewed(templateId);
      window.scrollTo(0, 0);
    }
  }, [templateId]);

  if (!template) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Card template not found</h2>
        <button onClick={onBack} className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold">
          Back to Browse
        </button>
      </div>
    );
  }

  const favorited = isFavorite(template.id);
  const sizeConfig = CARD_SIZES.find((s) => s.id === selectedSize) || CARD_SIZES[0];
  const envelopeConfig = ENVELOPE_COLORS.find((e) => e.id === selectedEnvelope) || ENVELOPE_COLORS[0];
  const totalPrice = template.price * sizeConfig.priceMultiplier + envelopeConfig.price;

  const recommendations = getRecommendationsForTemplate(template, 4);

  const handleQuickAddToCart = () => {
    const validEnvelopeColor = (['white', 'kraft', 'gold', 'blush', 'navy'].includes(envelopeConfig.id)
      ? envelopeConfig.id
      : 'white') as any;

    addItem({
      templateId: template.id,
      title: template.title,
      thumbnail: template.thumbnail,
      cardSize: selectedSize,
      envelopeColor: validEnvelopeColor,
      quantity: 1,
      unitPrice: totalPrice,
      addons: envelopeConfig.price > 0 ? [{ id: envelopeConfig.id, name: envelopeConfig.name, price: envelopeConfig.price, description: 'Luxury Envelope' }] : [],
      customSummary: { recipientName: template.recipient, customMessageSnippet: 'Sent with love' },
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Breadcrumb navigation */}
      <div className="flex items-center space-x-2 text-xs text-slate-500">
        <button onClick={onBack} className="hover:text-rose-600 transition flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cards</span>
        </button>
        <span>/</span>
        <span>{template.category}</span>
        <span>/</span>
        <span className="text-slate-900 font-semibold truncate max-w-xs">{template.title}</span>
      </div>

      {/* Main Product Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left: Gallery & Mockup Viewer */}
        <div className="lg:col-span-6 space-y-4">
          {/* Main Visual Display */}
          <div className="relative aspect-[3/4.2] w-full bg-slate-50 rounded-3xl border border-slate-200/80 shadow-lg overflow-hidden p-6 sm:p-8 flex items-center justify-center">
            {activeTab === 'front' && (
              <img
                src={template.thumbnail}
                alt={template.title}
                className="w-full h-full object-contain rounded-xl shadow-md transition-all duration-300"
              />
            )}

            {activeTab === 'inside' && (
              <div className="w-full h-full bg-white rounded-xl shadow-md border border-slate-200 p-6 flex flex-col justify-between">
                <div className="text-center text-slate-400 text-xs italic font-serif">
                  — Inside Left —
                </div>
                <div className="text-center space-y-2 py-8">
                  <p className="font-serif text-slate-800 text-sm leading-relaxed">
                    "Wishing you a day filled with laughter, love, and all your favourite things."
                  </p>
                  <p className="font-serif text-slate-600 text-xs italic">
                    With lots of love x
                  </p>
                </div>
                <div className="text-center text-[10px] text-slate-400">
                  Custom message printed on inside right
                </div>
              </div>
            )}

            {activeTab === 'back' && (
              <div className="w-full h-full bg-slate-50 rounded-xl shadow-md border border-slate-200 p-6 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center font-black text-sm">
                  C
                </div>
                <span className="font-bold text-xs text-slate-700">cardly.</span>
                <span className="text-[10px] text-slate-400">Printed in Great Britain • 350gsm Silk</span>
              </div>
            )}

            {/* Favorite button */}
            <button
              onClick={() => toggleFavorite(template.id)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-xs shadow-md flex items-center justify-center text-slate-600 hover:text-rose-500 transition"
              aria-label="Add to favorites"
            >
              <Heart className={`w-5 h-5 ${favorited ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>

            {/* 3D Realistic Preview Trigger Button */}
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="absolute bottom-4 left-4 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl backdrop-blur-xs shadow-md flex items-center gap-1.5 transition"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Interactive 3D Preview</span>
            </button>
          </div>

          {/* Perspective View switcher tabs */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setActiveTab('front')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'front'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Front Cover
            </button>
            <button
              onClick={() => setActiveTab('inside')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'inside'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Inside Spread
            </button>
            <button
              onClick={() => setActiveTab('back')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'back'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Back
            </button>
          </div>
        </div>

        {/* Right: Customization Options & Add to Basket */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[11px] font-bold uppercase tracking-wider rounded-md">
                {template.category}
              </span>
              {template.isPhotoCard && (
                <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-[11px] font-bold rounded-md flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  Photo Upload
                </span>
              )}
              {template.isBestSeller && (
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold uppercase rounded-md">
                  Best Seller
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {template.title}
            </h1>

            {/* Ratings and Reviews */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <span className="text-xs font-bold text-slate-800">{template.rating}</span>
              <span className="text-xs text-slate-400">({template.reviewCount} customer reviews)</span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
              {template.description}
            </p>
          </div>

          {/* Pricing */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block font-normal">Total Price</span>
              <span className="text-2xl font-black text-slate-900">£{totalPrice.toFixed(2)}</span>
            </div>
            <div className="text-right text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>In stock • 350gsm Luxury Silk</span>
            </div>
          </div>

          {/* Card Size Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Choose Card Size
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {CARD_SIZES.map((size) => (
                <button
                  key={size.id}
                  onClick={() => setSelectedSize(size.id)}
                  className={`p-3 rounded-2xl border text-left transition ${
                    selectedSize === size.id
                      ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-200'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900">{size.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{size.dimensions}</div>
                  <div className="text-[11px] font-bold text-rose-600 mt-1">
                    £{(template.price * size.priceMultiplier).toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Envelope Color Selector */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-slate-900 uppercase tracking-wider">
                2. Select Envelope
              </label>
              <span className="text-slate-500 font-medium">
                {envelopeConfig.name} {envelopeConfig.price > 0 && `(+£${envelopeConfig.price.toFixed(2)})`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ENVELOPE_COLORS.map((env) => (
                <button
                  key={env.id}
                  onClick={() => setSelectedEnvelope(env.id)}
                  className={`group relative p-1.5 rounded-xl border flex items-center gap-2 transition ${
                    selectedEnvelope === env.id
                      ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/10 shrink-0 shadow-2xs"
                    style={{ backgroundColor: env.hex }}
                  />
                  <span className="text-xs font-semibold text-slate-800">{env.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2.5 pt-2">
            {/* Primary: Launch Editor */}
            <button
              onClick={() => onPersonalize(template.id)}
              className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-rose-200 flex items-center justify-center gap-2 transition transform active:scale-98"
            >
              <Sparkles className="w-4 h-4 text-rose-200" />
              <span>Personalize this Card</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Quick Add to Basket without deep editor */}
            <button
              onClick={handleQuickAddToCart}
              className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition"
            >
              <ShoppingBag className="w-4 h-4 text-slate-600" />
              <span>Quick Add to Basket with Default Text</span>
            </button>
          </div>

          {/* Delivery & Assurance Details */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-rose-500" />
              <span>
                Order within <strong className="text-slate-900 font-bold">2 hrs 45 mins</strong> for same-day dispatch.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% Happiness guarantee. Free reprint or refund if not thrilled.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations: Similar Cards */}
      {recommendations.length > 0 && (
        <section className="pt-8 border-t border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Similar Cards You Might Like</h2>
              <p className="text-xs text-slate-500 mt-0.5">Matching {template.category} designs and styles</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {recommendations.map((card) => (
              <CardTile
                key={card.id}
                template={card}
                onSelect={onSelectCard}
                onPersonalize={onPersonalize}
              />
            ))}
          </div>
        </section>
      )}

      {/* Interactive 3D Preview Modal */}
      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={template.title}
        pages={{
          front: template.defaultPages.front,
          insideLeft: template.defaultPages.insideLeft,
          insideRight: template.defaultPages.insideRight,
          back: template.defaultPages.back,
        }}
        onProceedToCart={() => {
          setIsPreviewOpen(false);
          handleQuickAddToCart();
        }}
        onOpenPrintPreview={() => {
          setIsPreviewOpen(false);
          setIsPrintPreviewOpen(true);
        }}
      />

      {/* Standard Paper Size Print Studio & Preview */}
      <PrintPreview
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        title={template.title}
        templateId={template.id}
        pages={{
          front: template.defaultPages.front,
          insideLeft: template.defaultPages.insideLeft,
          insideRight: template.defaultPages.insideRight,
          back: template.defaultPages.back,
        }}
      />
    </div>
  );
};
