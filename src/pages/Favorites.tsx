import React from 'react';
import { Heart, Sparkles, ArrowLeft } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { ALL_TEMPLATES } from '../data/templates';
import { CardTile } from '../components/CardTile';

interface FavoritesProps {
  onNavigate: (route: string, param?: string) => void;
  onPersonalize: (templateId: string) => void;
}

export const Favorites: React.FC<FavoritesProps> = ({ onNavigate, onPersonalize }) => {
  const { favorites } = useFavorites();
  const favoritedCards = ALL_TEMPLATES.filter((t) => favorites.includes(t.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-6 border-b border-slate-200">
        <button
          onClick={() => onNavigate('home')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
            <span>Your Favorited Cards</span>
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {favoritedCards.length} saved {favoritedCards.length === 1 ? 'card' : 'cards'} ready for personalization
          </p>
        </div>
      </div>

      {favoritedCards.length === 0 ? (
        <div className="max-w-md mx-auto py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No favorited cards yet</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Click the heart icon on any greeting card while browsing to save it to your wishlist for later celebrations!
          </p>
          <button
            onClick={() => onNavigate('browse')}
            className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            Explore Cards
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {favoritedCards.map((card) => (
            <CardTile
              key={card.id}
              template={card}
              onSelect={(id) => onNavigate('card', id)}
              onPersonalize={onPersonalize}
            />
          ))}
        </div>
      )}
    </div>
  );
};
