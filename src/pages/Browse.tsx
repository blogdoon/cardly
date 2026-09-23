import React, { useState, useMemo, useEffect } from 'react';
import { Filter, X, SlidersHorizontal, Search, ChevronDown, RotateCcw, Camera } from 'lucide-react';
import { CardTile } from '../components/CardTile';
import { ALL_TEMPLATES } from '../data/templates';
import { OCCASIONS_LIST, RECIPIENTS_LIST, STYLES_LIST, MILESTONE_AGES } from '../data/categories';
import { OccasionType, RecipientType, CardStyleType } from '../types/template';

interface BrowseProps {
  initialCategory?: string;
  initialSearch?: string;
  onSelectCard: (templateId: string) => void;
  onPersonalize: (templateId: string) => void;
}

export const Browse: React.FC<BrowseProps> = ({
  initialCategory,
  initialSearch,
  onSelectCard,
  onPersonalize,
}) => {
  const [search, setSearch] = useState(initialSearch || '');
  const [selectedOccasion, setSelectedOccasion] = useState<string>(initialCategory || 'All');
  const [selectedRecipient, setSelectedRecipient] = useState<string>('All');
  const [selectedStyle, setSelectedStyle] = useState<string>('All');
  const [photoOnly, setPhotoOnly] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<number | 'All'>('All');
  const [maxPrice, setMaxPrice] = useState<number>(5.0);
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'price-asc' | 'price-desc' | 'newest'>('popular');

  const [visibleCount, setVisibleCount] = useState(24);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // If initialCategory or initialSearch changes, update state
  useEffect(() => {
    if (initialCategory) {
      if (initialCategory.toLowerCase() === 'photo cards') {
        setPhotoOnly(true);
        setSelectedOccasion('All');
      } else if (initialCategory.toLowerCase() === 'funny') {
        setSelectedStyle('Funny');
        setSelectedOccasion('All');
      } else if (['her', 'him', 'mum', 'dad', 'sister', 'brother', 'best friend'].includes(initialCategory.toLowerCase())) {
        const found = RECIPIENTS_LIST.find((r) => r.name.toLowerCase() === initialCategory.toLowerCase() || r.id.toLowerCase() === initialCategory.toLowerCase());
        if (found) setSelectedRecipient(found.id);
      } else {
        setSelectedOccasion(initialCategory);
      }
    }
  }, [initialCategory]);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  const clearAllFilters = () => {
    setSearch('');
    setSelectedOccasion('All');
    setSelectedRecipient('All');
    setSelectedStyle('All');
    setPhotoOnly(false);
    setSelectedMilestone('All');
    setMaxPrice(5.0);
    setSortBy('popular');
  };

  const hasActiveFilters =
    search !== '' ||
    selectedOccasion !== 'All' ||
    selectedRecipient !== 'All' ||
    selectedStyle !== 'All' ||
    photoOnly ||
    selectedMilestone !== 'All' ||
    maxPrice < 5.0;

  // Filter logic
  const filteredTemplates = useMemo(() => {
    return ALL_TEMPLATES.filter((template) => {
      // Search query matching
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = template.title.toLowerCase().includes(q);
        const matchDesc = template.description.toLowerCase().includes(q);
        const matchCategory = template.category.toLowerCase().includes(q);
        const matchRecipient = template.recipient.toLowerCase().includes(q);
        const matchTags = template.tags.some((tag) => tag.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchCategory && !matchRecipient && !matchTags) {
          return false;
        }
      }

      // Occasion filter
      if (selectedOccasion !== 'All' && template.category.toLowerCase() !== selectedOccasion.toLowerCase()) {
        return false;
      }

      // Recipient filter
      if (selectedRecipient !== 'All' && template.recipient.toLowerCase() !== selectedRecipient.toLowerCase()) {
        return false;
      }

      // Style filter
      if (selectedStyle !== 'All' && template.style.toLowerCase() !== selectedStyle.toLowerCase()) {
        return false;
      }

      // Photo only filter
      if (photoOnly && !template.isPhotoCard) {
        return false;
      }

      // Milestone age filter
      if (selectedMilestone !== 'All' && template.milestoneAge !== selectedMilestone) {
        return false;
      }

      // Price filter
      if (template.price > maxPrice) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'newest') return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
      return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0);
    });
  }, [search, selectedOccasion, selectedRecipient, selectedStyle, photoOnly, selectedMilestone, maxPrice, sortBy]);

  const displayedTemplates = filteredTemplates.slice(0, visibleCount);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header bar: Title, Count, Sort, Mobile filter toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {selectedOccasion !== 'All'
              ? `${selectedOccasion} Cards`
              : selectedStyle !== 'All'
              ? `${selectedStyle} Greeting Cards`
              : 'Browse All Greeting Cards'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Showing <strong className="text-slate-800">{filteredTemplates.length}</strong> personalized cards
            {hasActiveFilters && <span> matching your current filters</span>}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Filter Button */}
          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="lg:hidden px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-2"
          >
            <Filter className="w-4 h-4 text-rose-500" />
            <span>Filters {hasActiveFilters && '(Active)'}</span>
          </button>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-rose-500 shadow-2xs"
            >
              <option value="popular">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newest Arrivals</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <span className="text-xs font-semibold text-slate-400">Active:</span>

          {search && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-full">
              Search: "{search}"
              <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setSearch('')} />
            </span>
          )}

          {selectedOccasion !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-full">
              Occasion: {selectedOccasion}
              <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setSelectedOccasion('All')} />
            </span>
          )}

          {selectedRecipient !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-full">
              Recipient: {selectedRecipient}
              <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setSelectedRecipient('All')} />
            </span>
          )}

          {selectedStyle !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-full">
              Style: {selectedStyle}
              <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setSelectedStyle('All')} />
            </span>
          )}

          {photoOnly && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium rounded-full">
              Photo Cards Only
              <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setPhotoOnly(false)} />
            </span>
          )}

          <button
            onClick={clearAllFilters}
            className="text-xs font-bold text-rose-600 hover:underline ml-2"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Main Browse Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Sidebar Filters (Desktop & Mobile Drawer) */}
        <aside
          className={`lg:block ${
            isMobileFilterOpen
              ? 'fixed inset-0 z-50 bg-white p-6 overflow-y-auto block'
              : 'hidden'
          } bg-white rounded-3xl lg:border border-slate-200/80 p-5 space-y-6 shadow-2xs`}
        >
          {isMobileFilterOpen && (
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 lg:hidden">
              <h3 className="font-bold text-base text-slate-900">Filter Cards</h3>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          )}

          {/* Occasion Filter */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Occasion</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              <button
                onClick={() => setSelectedOccasion('All')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedOccasion === 'All'
                    ? 'bg-rose-50 text-rose-600 font-bold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Occasions
              </button>
              {OCCASIONS_LIST.map((occ) => (
                <button
                  key={occ.id}
                  onClick={() => setSelectedOccasion(occ.name)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                    selectedOccasion.toLowerCase() === occ.name.toLowerCase()
                      ? 'bg-rose-50 text-rose-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{occ.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Filter */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Recipient</h4>
            <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
              <button
                onClick={() => setSelectedRecipient('All')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedRecipient === 'All'
                    ? 'bg-rose-50 text-rose-600 font-bold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Anyone
              </button>
              {RECIPIENTS_LIST.map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => setSelectedRecipient(rec.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    selectedRecipient === rec.id
                      ? 'bg-rose-50 text-rose-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {rec.name}
                </button>
              ))}
            </div>
          </div>

          {/* Style Filter */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Style</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              <button
                onClick={() => setSelectedStyle('All')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedStyle === 'All'
                    ? 'bg-rose-50 text-rose-600 font-bold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Styles
              </button>
              {STYLES_LIST.map((st) => (
                <button
                  key={st.id}
                  onClick={() => setSelectedStyle(st.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    selectedStyle === st.id
                      ? 'bg-rose-50 text-rose-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {st.name}
                </button>
              ))}
            </div>
          </div>

          {/* Photo Cards Toggle */}
          <div className="pt-3 border-t border-slate-100">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={photoOnly}
                onChange={(e) => setPhotoOnly(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
              />
              <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-purple-600" />
                Photo Upload Cards Only
              </span>
            </label>
          </div>

          {/* Milestone Age */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Milestone Age</h4>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedMilestone('All')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                  selectedMilestone === 'All'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                Any
              </button>
              {MILESTONE_AGES.map((age) => (
                <button
                  key={age}
                  onClick={() => setSelectedMilestone(age)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold border ${
                    selectedMilestone === age
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {age}th
                </button>
              ))}
            </div>
          </div>

          {/* Price Range Slider */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <div className="flex justify-between items-center text-xs">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Max Price</h4>
              <span className="font-bold text-rose-600">£{maxPrice.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={3.49}
              max={5.0}
              step={0.1}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>

          {isMobileFilterOpen && (
            <div className="pt-4">
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full py-3 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-md"
              >
                Apply Filters ({filteredTemplates.length} cards)
              </button>
            </div>
          )}
        </aside>

        {/* Right Card Grid Section */}
        <main className="lg:col-span-3 space-y-8">
          {displayedTemplates.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-500">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No cards found matching your criteria</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Try searching for broader terms like "birthday", "friend", or clearing your filters to explore all 300+ designs.
              </p>
              <button
                onClick={clearAllFilters}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <>
              {/* Responsive Card Grid: 4 Desktop, 3 Tablet, 2 Mobile */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {displayedTemplates.map((template) => (
                  <CardTile
                    key={template.id}
                    template={template}
                    onSelect={onSelectCard}
                    onPersonalize={onPersonalize}
                  />
                ))}
              </div>

              {/* Load More Pagination */}
              {visibleCount < filteredTemplates.length && (
                <div className="text-center pt-6">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 24)}
                    className="px-8 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs rounded-2xl shadow-xs transition transform hover:-translate-y-0.5"
                  >
                    Load More Cards ({filteredTemplates.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
