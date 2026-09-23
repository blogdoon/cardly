import React from 'react';
import {
  Sparkles,
  ArrowRight,
  Heart,
  Camera,
  Smile,
  Cake,
  Gift,
  Star,
  CheckCircle,
  Truck,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { CardTile } from '../components/CardTile';
import { ALL_TEMPLATES, getPopularTemplates, getPhotoTemplates, getTemplatesByCategory } from '../data/templates';
import { OCCASIONS_LIST, RECIPIENTS_LIST } from '../data/categories';
import { useFavorites } from '../context/FavoritesContext';
import { getRecentlyViewed } from '../services/cardStorage';
import { getPersonalizedFeed } from '../utils/recommendations';

interface HomeProps {
  onNavigate: (route: string, param?: string) => void;
  onPersonalize: (templateId: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate, onPersonalize }) => {
  const { favorites } = useFavorites();

  const popularCards = getPopularTemplates(8);
  const photoCards = getPhotoTemplates(8);
  const birthdayCards = getTemplatesByCategory('Birthday').slice(0, 8);
  const funnyCards = ALL_TEMPLATES.filter((t) => t.style === 'Funny').slice(0, 8);
  const personalizedFeed = getPersonalizedFeed(favorites, 8);

  const recentIds = getRecentlyViewed();
  const recentlyViewedCards = ALL_TEMPLATES.filter((t) => recentIds.includes(t.id)).slice(0, 6);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-rose-50/70 via-stone-50 to-white pt-8 pb-16 lg:pt-14 lg:pb-24 border-b border-rose-100/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold tracking-wide uppercase shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                <span>Original Personalized Cards</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                Make their moment <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 bg-clip-text text-transparent">
                  truly memorable.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Personalized greeting cards designed by you, printed on 350gsm luxury cardstock, and delivered with a little extra love.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <button
                  onClick={() => onNavigate('browse')}
                  className="w-full sm:w-auto px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-rose-200 flex items-center justify-center gap-2.5 transition transform hover:-translate-y-0.5"
                >
                  <span>Browse 300+ Cards</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onNavigate('browse', 'Photo Cards')}
                  className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-sm rounded-2xl border border-slate-300 shadow-sm flex items-center justify-center gap-2 transition"
                >
                  <Camera className="w-4 h-4 text-purple-600" />
                  <span>Create a Photo Card</span>
                </button>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-rose-500" /> Same-day dispatch by 6pm
                </span>
                <span className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> 4.9/5 from 12,000+ reviews
                </span>
              </div>
            </div>

            {/* Right Promotional Hero Mockup Stack */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className="relative w-full max-w-sm aspect-[3/4] flex items-center justify-center">
                {/* Background decorative colored blobs */}
                <div className="absolute w-72 h-72 bg-rose-200/50 rounded-full blur-3xl -top-10 -left-10" />
                <div className="absolute w-72 h-72 bg-amber-200/50 rounded-full blur-3xl -bottom-10 -right-10" />

                {/* Back card teaser */}
                <div className="absolute w-56 h-76 rounded-2xl bg-white shadow-xl rotate-[-12deg] -translate-x-12 translate-y-4 border border-slate-200 overflow-hidden opacity-85 transition-transform hover:rotate-[-8deg]">
                  <img
                    src={birthdayCards[1]?.thumbnail || popularCards[1]?.thumbnail}
                    alt="Card"
                    className="w-full h-full object-contain p-2"
                  />
                </div>

                {/* Front hero featured card */}
                <div
                  onClick={() => onPersonalize('card-001')}
                  className="relative w-64 h-84 rounded-2xl bg-white shadow-2xl rotate-[4deg] border border-rose-200 overflow-hidden cursor-pointer group hover:rotate-0 transition-all duration-300"
                >
                  <img
                    src={popularCards[0]?.thumbnail}
                    alt="Thirty, Flirty & Thriving"
                    className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-x-3 bottom-3 p-2 bg-slate-900/80 backdrop-blur-xs text-white rounded-xl text-center text-xs font-bold shadow-md flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Click to Personalize</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Shop by Occasion Carousel */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Shop by Occasion</h2>
            <p className="text-xs text-slate-500 mt-0.5">Find the perfect card for any milestone</p>
          </div>
          <button
            onClick={() => onNavigate('browse')}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {OCCASIONS_LIST.slice(0, 12).map((occ) => (
            <button
              key={occ.id}
              onClick={() => onNavigate('browse', occ.name)}
              className="p-4 rounded-2xl bg-white hover:bg-rose-50/60 border border-slate-200 hover:border-rose-300 shadow-2xs hover:shadow-md transition-all text-left group flex flex-col justify-between h-24"
            >
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-rose-100/60 text-rose-600 flex items-center justify-center text-xs font-bold group-hover:scale-110 transition-transform">
                  ✦
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Explore</span>
              </div>
              <span className="font-bold text-xs text-slate-800 group-hover:text-rose-600 transition-colors">
                {occ.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Popular Right Now */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Popular Right Now</h2>
            <p className="text-xs text-slate-500 mt-0.5">Customer favourites this week</p>
          </div>
          <button
            onClick={() => onNavigate('browse')}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
          >
            <span>See More</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {popularCards.map((card) => (
            <CardTile
              key={card.id}
              template={card}
              onSelect={(id) => onNavigate('card', id)}
              onPersonalize={onPersonalize}
            />
          ))}
        </div>
      </section>

      {/* Photo Cards Spotlight Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-rose-600 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-xl space-y-4">
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
              Photo Upload Cards
            </span>
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Turn your favourite photos into keepsake cards.
            </h3>
            <p className="text-xs sm:text-sm text-purple-100 leading-relaxed font-normal">
              Upload from your phone or computer, zoom, crop, and pair with heartfelt words in seconds.
            </p>
            <div className="pt-2">
              <button
                onClick={() => onNavigate('browse', 'Photo Cards')}
                className="px-6 py-3 bg-white text-purple-900 font-extrabold text-xs rounded-xl hover:bg-purple-50 shadow-md transition"
              >
                Browse Photo Cards
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Birthday Cards Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">Birthday Cards</h2>
              <p className="text-xs text-slate-500 mt-0.5">Milestone, funny, and sentimental birthdays</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('browse', 'Birthday')}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
          >
            <span>All Birthday</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {birthdayCards.map((card) => (
            <CardTile
              key={card.id}
              template={card}
              onSelect={(id) => onNavigate('card', id)}
              onPersonalize={onPersonalize}
            />
          ))}
        </div>
      </section>

      {/* Funny Cards Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
              <Smile className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">Funny & Cheeky Cards</h2>
              <p className="text-xs text-slate-500 mt-0.5">Guaranteed to produce big laughs</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('browse', 'Funny')}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
          >
            <span>All Funny</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {funnyCards.map((card) => (
            <CardTile
              key={card.id}
              template={card}
              onSelect={(id) => onNavigate('card', id)}
              onPersonalize={onPersonalize}
            />
          ))}
        </div>
      </section>

      {/* Recommended for You */}
      {personalizedFeed.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">Recommended For You</h2>
              <p className="text-xs text-slate-500 mt-0.5">Curated based on your browsing style and favorites</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {personalizedFeed.map((card) => (
              <CardTile
                key={card.id}
                template={card}
                onSelect={(id) => onNavigate('card', id)}
                onPersonalize={onPersonalize}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recently Viewed */}
      {recentlyViewedCards.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">Recently Viewed</h2>
              <p className="text-xs text-slate-500 mt-0.5">Pick up right where you left off</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {recentlyViewedCards.map((card) => (
              <div
                key={card.id}
                onClick={() => onNavigate('card', card.id)}
                className="bg-white p-2.5 rounded-xl border border-slate-200 hover:border-rose-300 shadow-2xs hover:shadow-md cursor-pointer transition flex flex-col justify-between"
              >
                <div className="aspect-[3/4] bg-slate-50 rounded-lg overflow-hidden p-1">
                  <img src={card.thumbnail} alt={card.title} className="w-full h-full object-contain" />
                </div>
                <div className="mt-2">
                  <h4 className="font-bold text-[11px] text-slate-800 truncate">{card.title}</h4>
                  <span className="text-[10px] font-extrabold text-rose-600">£{card.price.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Why Cardly? Feature Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Why choose Cardly?</span>
            <h3 className="text-2xl sm:text-3xl font-black">Crafted with care, sent with love.</h3>
            <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed">
              We believe a greeting card is more than paper. It's a hug you can hold in your hands.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-800/60 rounded-2xl border border-slate-700/60 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                1
              </div>
              <h4 className="font-bold text-sm text-white">Full Creative Freedom</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add multiple photos, change fonts, tweak layouts, or write your own heartfelt message inside.
              </p>
            </div>

            <div className="p-6 bg-slate-800/60 rounded-2xl border border-slate-700/60 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                2
              </div>
              <h4 className="font-bold text-sm text-white">Heavyweight 350gsm Silk</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Our cards stand proud on mantlepieces, printed with gallery-grade archival inks.
              </p>
            </div>

            <div className="p-6 bg-slate-800/60 rounded-2xl border border-slate-700/60 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                3
              </div>
              <h4 className="font-bold text-sm text-white">Direct-to-Recipient Delivery</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Send back to yourself with an extra envelope, or directly to your recipient with custom handwriting fonts.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
