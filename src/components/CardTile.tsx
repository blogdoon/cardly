import React from 'react';
import { Heart, Sparkles, Camera, Star } from 'lucide-react';
import { CardTemplate } from '../types/template';
import { useFavorites } from '../context/FavoritesContext';

interface CardTileProps {
  template: CardTemplate;
  onSelect: (templateId: string) => void;
  onPersonalize: (templateId: string) => void;
}

export const CardTile: React.FC<CardTileProps> = ({ template, onSelect, onPersonalize }) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(template.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(template.id);
  };

  const handlePersonalizeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPersonalize(template.id);
  };

  return (
    <div
      onClick={() => onSelect(template.id)}
      className="group relative bg-white rounded-2xl border border-slate-200/80 hover:border-rose-200 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden cursor-pointer transform hover:-translate-y-1"
    >
      {/* Visual Thumbnail Area */}
      <div className="relative aspect-[3/4.2] w-full bg-slate-50 flex items-center justify-center overflow-hidden p-3 sm:p-4">
        {/* Render Thumbnail Image */}
        <img
          src={template.thumbnail}
          alt={template.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain rounded-lg shadow-sm group-hover:scale-[1.02] transition-transform duration-300 select-none"
        />

        {/* Favorite heart button */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-xs shadow-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:scale-110 active:scale-95 transition-all duration-150"
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              favorited ? 'fill-rose-500 text-rose-500' : 'text-slate-600'
            }`}
          />
        </button>

        {/* Single subtle tag */}
        {template.isBestSeller ? (
          <div className="absolute top-3 left-3 z-10">
            <span className="px-2 py-0.5 bg-slate-900/85 backdrop-blur-xs text-white text-[10px] font-medium tracking-wider uppercase rounded-md shadow-xs">
              Bestseller
            </span>
          </div>
        ) : template.isPhotoCard ? (
          <div className="absolute top-3 left-3 z-10">
            <span className="px-2 py-0.5 bg-rose-600/90 backdrop-blur-xs text-white text-[10px] font-medium tracking-wide rounded-md shadow-xs flex items-center gap-1">
              <Camera className="w-2.5 h-2.5" />
              Photo Card
            </span>
          </div>
        ) : template.milestoneAge ? (
          <div className="absolute top-3 left-3 z-10">
            <span className="px-2 py-0.5 bg-amber-600/90 backdrop-blur-xs text-white text-[10px] font-medium tracking-wide rounded-md shadow-xs">
              {template.milestoneAge}th Milestone
            </span>
          </div>
        ) : null}

        {/* Quick Personalize overlay button on desktop hover */}
        <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:block">
          <button
            type="button"
            onClick={handlePersonalizeClick}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-transform active:scale-98"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-200" />
            <span>Personalize Now</span>
          </button>
        </div>
      </div>

      {/* Card Info Area */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between bg-white">
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span className="font-semibold text-rose-600 uppercase tracking-wider text-[10px]">
              {template.category}
            </span>
            <div className="flex items-center gap-1 text-amber-500 font-bold">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{template.rating}</span>
              <span className="text-slate-400 font-normal">({template.reviewCount})</span>
            </div>
          </div>

          <h3 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-rose-600 transition-colors">
            {template.title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
            For {template.recipient} • {template.style}
          </p>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block font-normal">from</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              £{template.price.toFixed(2)}
            </span>
          </div>

          {/* Mobile / Tablet Personalize Button */}
          <button
            type="button"
            onClick={handlePersonalizeClick}
            className="sm:hidden px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-xs"
          >
            Personalize
          </button>
        </div>
      </div>
    </div>
  );
};
