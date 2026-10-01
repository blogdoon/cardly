import React, { useState, useMemo, useEffect } from 'react';
import { Filter, X, SlidersHorizontal, Search, ChevronDown, RotateCcw, Camera } from 'lucide-react';
import { CardTile } from '../components/CardTile';
import { getLiveCatalog } from '../data/templates';
import { OCCASIONS_LIST, RECIPIENTS_LIST, STYLES_LIST, MILESTONE_AGES } from '../data/categories';
import { CardTemplate, OccasionType, RecipientType, CardStyleType } from '../types/template';
import { formatPriceCompact } from '../utils/currency';
import {
  TONE_TYPES,
  SEASON_TYPES,
  PERSONALIZATION_TYPES,
  COLOR_FAMILIES,
  COLOR_FAMILY_LABELS,
  priceRangeFor,
  type ColorFamily,
} from '../utils/templateFacets';
import { splitFacet, type BrowseFacets } from '../utils/routes';

/** Top of the price slider. Above the dearest card at every size tier. */
const PRICE_CEILING = 12;
const PRICE_STEP = 0.5;

/**
 * Does any chosen facet value match any of the template's values?
 *
 * Case-insensitive, because a hand-edited or pasted URL should not silently
 * return nothing. OR within a facet, AND across facets.
 */
const anyMatches = (selected: readonly string[], values: readonly string[]): boolean => {
  const wanted = selected.map((v) => v.toLowerCase());
  return values.some((v) => wanted.includes(v.toLowerCase()));
};

/**
 * One multi-select facet group.
 *
 * Every list facet uses this, so the OR-within/AND-across rule is stated once
 * and behaves identically everywhere: tapping a second value widens the result
 * set rather than replacing it.
 */
const FacetGroup: React.FC<{
  label: string;
  selected: string[];
  options: { value: string; label: string }[];
  onToggle: (value: string) => void;
  onClear: () => void;
  maxHeight?: string;
}> = ({ label, selected, options, onToggle, onClear, maxHeight = '' }) => (
  <div className="space-y-2 pt-3 border-t border-slate-100 first:border-0 first:pt-0">
    <div className="flex items-center justify-between">
      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">{label}</h4>
      {selected.length > 1 && (
        <button
          onClick={onClear}
          className="text-[10px] font-semibold text-rose-600 hover:underline"
        >
          clear
        </button>
      )}
    </div>
    <div className={`space-y-1 overflow-y-auto pr-1 ${maxHeight}`}>
      <button
        onClick={onClear}
        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
          selected.length === 0
            ? 'bg-rose-50 text-rose-600 font-bold'
            : 'text-slate-600 hover:bg-slate-50'
        }`}
      >
        Any {label.toLowerCase()}
      </button>
      {options.map((opt) => {
        const on = selected.some((v) => v.toLowerCase() === opt.value.toLowerCase());
        return (
          <button
            key={opt.value}
            onClick={() => onToggle(opt.value)}
            aria-pressed={on}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
              on
                ? 'bg-rose-50 text-rose-600 font-bold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{opt.label}</span>
            {selected.length > 1 && (
              <span className="text-[10px] text-rose-500">+</span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

interface BrowseProps {
  /**
   * Filter state from the query string. Each facet is typed, so a search phrase
   * is never mistaken for an occasion name (the old bug, where a Navbar search
   * was passed as `initialCategory`, matched zero templates, and rendered the
   * empty state).
   */
  initialFacets?: BrowseFacets;
  onSelectCard: (templateId: string) => void;
  onPersonalize: (templateId: string) => void;
}

export const Browse: React.FC<BrowseProps> = ({
  initialFacets,
  onSelectCard,
  onPersonalize,
}) => {
  const [search, setSearch] = useState(initialFacets?.q || '');
  // Every list facet is multi-select and ORs within itself ("Cute" *or* "Retro"),
  // while different facets AND together. A card matches when it lists at least
  // one of the chosen values — which is only expressible because the template
  // stores arrays rather than a single value.
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>(splitFacet(initialFacets?.occasion));
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>(splitFacet(initialFacets?.recipient));
  const [selectedStyles, setSelectedStyles] = useState<string[]>(splitFacet(initialFacets?.style));
  const [selectedTones, setSelectedTones] = useState<string[]>(splitFacet(initialFacets?.tone));
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>(splitFacet(initialFacets?.season));
  const [selectedColors, setSelectedColors] = useState<string[]>(splitFacet(initialFacets?.color));
  const [selectedPersonalization, setSelectedPersonalization] = useState<string[]>(
    splitFacet(initialFacets?.personalization)
  );
  const [photoOnly, setPhotoOnly] = useState<boolean>(Boolean(initialFacets?.photoOnly));
  const [selectedMilestone, setSelectedMilestone] = useState<number | 'All'>('All');
  // A range, not just a ceiling: the cheapest size of a card is well below its
  // standard price, so a max-only slider hid cheap cards and `?maxPrice=` could
  // not express "under €4".
  const [minPrice, setMinPrice] = useState<number>(initialFacets?.minPrice || 0);
  const [maxPrice, setMaxPrice] = useState<number>(initialFacets?.maxPrice || PRICE_CEILING);
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'price-asc' | 'price-desc' | 'newest'>('popular');

  const [visibleCount, setVisibleCount] = useState(24);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [templateList, setTemplateList] = useState<CardTemplate[]>(getLiveCatalog());

  useEffect(() => {
    // Re-read the live catalog (Postgres-backed) whenever it changes, so an
    // admin deletion disappears from the grid without a page reload.
    const handleUpdate = () => setTemplateList([...getLiveCatalog()]);
    window.addEventListener('cardly_templates_updated', handleUpdate);
    handleUpdate();
    return () => window.removeEventListener('cardly_templates_updated', handleUpdate);
  }, []);

  // Re-apply filters whenever the URL changes, so a link, the back button, or a
  // fresh navigation into /browse/ all land on the same result set.
  useEffect(() => {
    setSearch(initialFacets?.q || '');
    setSelectedOccasions(splitFacet(initialFacets?.occasion));
    setSelectedRecipients(splitFacet(initialFacets?.recipient));
    setSelectedStyles(splitFacet(initialFacets?.style));
    setSelectedTones(splitFacet(initialFacets?.tone));
    setSelectedSeasons(splitFacet(initialFacets?.season));
    setSelectedColors(splitFacet(initialFacets?.color));
    setSelectedPersonalization(splitFacet(initialFacets?.personalization));
    setPhotoOnly(Boolean(initialFacets?.photoOnly));
    setMinPrice(initialFacets?.minPrice || 0);
    setMaxPrice(initialFacets?.maxPrice || PRICE_CEILING);
    setVisibleCount(24);
  }, [initialFacets]);

  const clearAllFilters = () => {
    setSearch('');
    setSelectedOccasions([]);
    setSelectedRecipients([]);
    setSelectedStyles([]);
    setSelectedTones([]);
    setSelectedSeasons([]);
    setSelectedColors([]);
    setSelectedPersonalization([]);
    setPhotoOnly(false);
    setSelectedMilestone('All');
    setMinPrice(0);
    setMaxPrice(PRICE_CEILING);
    setSortBy('popular');
  };

  const hasActiveFilters =
    search !== '' ||
    selectedOccasions.length > 0 ||
    selectedRecipients.length > 0 ||
    selectedStyles.length > 0 ||
    selectedTones.length > 0 ||
    selectedSeasons.length > 0 ||
    selectedColors.length > 0 ||
    selectedPersonalization.length > 0 ||
    photoOnly ||
    selectedMilestone !== 'All' ||
    minPrice > 0 ||
    maxPrice < PRICE_CEILING;

  // Filter logic
  const filteredTemplates = useMemo(() => {
    return templateList.filter((template) => {
      // Search query matching
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = template.title.toLowerCase().includes(q);
        const matchDesc = template.description.toLowerCase().includes(q);
        const matchCategory = template.category.toLowerCase().includes(q);
        const matchRecipient = template.recipients.some((r) => r.toLowerCase().includes(q));
        const matchTags = template.tags.some((tag: string) => tag.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchCategory && !matchRecipient && !matchTags) {
          return false;
        }
      }

      // Occasion filter
      if (
        selectedOccasions.length > 0 &&
        !anyMatches(selectedOccasions, [template.category])
      ) {
        return false;
      }

      // Recipient filter — OR within the facet, so a card listed for both
      // "Kids" and "Anyone" is returned by either selection.
      if (
        selectedRecipients.length > 0 &&
        !anyMatches(selectedRecipients, template.recipients)
      ) {
        return false;
      }

      // Style filter
      if (selectedStyles.length > 0 && !anyMatches(selectedStyles, template.styles)) {
        return false;
      }

      if (selectedTones.length > 0 && !anyMatches(selectedTones, [template.tone])) {
        return false;
      }

      if (selectedSeasons.length > 0 && !anyMatches(selectedSeasons, [template.season ?? 'all-year'])) {
        return false;
      }

      if (selectedColors.length > 0 && !anyMatches(selectedColors, template.colors ?? [])) {
        return false;
      }

      if (
        selectedPersonalization.length > 0 &&
        !anyMatches(selectedPersonalization, template.personalization)
      ) {
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

      // Price filter, against the whole size range rather than just the
      // standard price, so a "under €4" filter reaches the postcard size of a
      // €4.79 card. A card matches when its band *overlaps* the chosen range.
      const band = priceRangeFor(template.price);
      if (band.max < minPrice || band.min > maxPrice) {
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
  }, [
    search,
    selectedOccasions,
    selectedRecipients,
    selectedStyles,
    selectedTones,
    selectedSeasons,
    selectedColors,
    selectedPersonalization,
    photoOnly,
    selectedMilestone,
    minPrice,
    maxPrice,
    sortBy,
    templateList,
  ]);

  const displayedTemplates = filteredTemplates.slice(0, visibleCount);

  /** Toggle one value in a multi-select facet list. */
  const toggleFacet = (
    selected: string[],
    value: string,
    set: (next: string[]) => void
  ) =>
    set(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header bar: Title, Count, Sort, Mobile filter toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {selectedOccasions.length === 1
              ? `${selectedOccasions[0]} Cards`
              : selectedStyles.length === 1
              ? `${selectedStyles[0]} Greeting Cards`
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

          {selectedOccasions.map((v) => (
            <span key={`occ-${v}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-full">
              Occasion: {v}
              <X
                className="w-3.5 h-3.5 cursor-pointer"
                onClick={() => toggleFacet(selectedOccasions, v, setSelectedOccasions)}
              />
            </span>
          ))}

          {selectedRecipients.map((v) => (
            <span key={`rec-${v}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-full">
              Recipient: {v}
              <X
                className="w-3.5 h-3.5 cursor-pointer"
                onClick={() => toggleFacet(selectedRecipients, v, setSelectedRecipients)}
              />
            </span>
          ))}

          {selectedStyles.map((v) => (
            <span key={`sty-${v}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-full">
              Style: {v}
              <X
                className="w-3.5 h-3.5 cursor-pointer"
                onClick={() => toggleFacet(selectedStyles, v, setSelectedStyles)}
              />
            </span>
          ))}

          {selectedTones.map((v) => (
            <span key={`ton-${v}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-full">
              Tone: {v}
              <X
                className="w-3.5 h-3.5 cursor-pointer"
                onClick={() => toggleFacet(selectedTones, v, setSelectedTones)}
              />
            </span>
          ))}

          {selectedSeasons.map((v) => (
            <span key={`sea-${v}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-full">
              Season: {v}
              <X
                className="w-3.5 h-3.5 cursor-pointer"
                onClick={() => toggleFacet(selectedSeasons, v, setSelectedSeasons)}
              />
            </span>
          ))}

          {selectedColors.map((v) => (
            <span key={`col-${v}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-full">
              Colour: {COLOR_FAMILY_LABELS[v as ColorFamily] ?? v}
              <X
                className="w-3.5 h-3.5 cursor-pointer"
                onClick={() => toggleFacet(selectedColors, v, setSelectedColors)}
              />
            </span>
          ))}

          {selectedPersonalization.map((v) => (
            <span key={`per-${v}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-full">
              Personalise: {v}
              <X
                className="w-3.5 h-3.5 cursor-pointer"
                onClick={() => toggleFacet(selectedPersonalization, v, setSelectedPersonalization)}
              />
            </span>
          ))}

          {selectedMilestone !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-full">
              Turning {selectedMilestone}
              <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setSelectedMilestone('All')} />
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
          <FacetGroup
            label="Occasion"
            selected={selectedOccasions}
            onToggle={(v) => toggleFacet(selectedOccasions, v, setSelectedOccasions)}
            onClear={() => setSelectedOccasions([])}
            options={OCCASIONS_LIST.map((occ) => ({ value: occ.name, label: occ.name }))}
            maxHeight="max-h-48"
          />

          {/* Recipient Filter */}
          <FacetGroup
            label="Recipient"
            selected={selectedRecipients}
            onToggle={(v) => toggleFacet(selectedRecipients, v, setSelectedRecipients)}
            onClear={() => setSelectedRecipients([])}
            options={RECIPIENTS_LIST.map((rec) => ({ value: rec.id, label: rec.name }))}
            maxHeight="max-h-44"
          />

          {/* Style Filter */}
          <FacetGroup
            label="Style"
            selected={selectedStyles}
            onToggle={(v) => toggleFacet(selectedStyles, v, setSelectedStyles)}
            onClear={() => setSelectedStyles([])}
            options={STYLES_LIST.map((st) => ({ value: st.id, label: st.name }))}
            maxHeight="max-h-40"
          />

          {/* Tone / Season were stored on every template but had no control, so
              they could not be reached. */}
          <FacetGroup
            label="Tone"
            selected={selectedTones}
            onToggle={(v) => toggleFacet(selectedTones, v, setSelectedTones)}
            onClear={() => setSelectedTones([])}
            options={TONE_TYPES.map((t) => ({ value: t, label: t }))}
          />

          <FacetGroup
            label="Season"
            selected={selectedSeasons}
            onToggle={(v) => toggleFacet(selectedSeasons, v, setSelectedSeasons)}
            onClear={() => setSelectedSeasons([])}
            options={SEASON_TYPES.map((s) => ({ value: s, label: s }))}
          />

          <FacetGroup
            label="Colour"
            selected={selectedColors}
            onToggle={(v) => toggleFacet(selectedColors, v, setSelectedColors)}
            onClear={() => setSelectedColors([])}
            options={COLOR_FAMILIES.map((c) => ({ value: c, label: COLOR_FAMILY_LABELS[c] }))}
            maxHeight="max-h-40"
          />

          <FacetGroup
            label="Personalisation"
            selected={selectedPersonalization}
            onToggle={(v) => toggleFacet(selectedPersonalization, v, setSelectedPersonalization)}
            onClear={() => setSelectedPersonalization([])}
            options={PERSONALIZATION_TYPES.map((p) => ({
              value: p,
              label: p === 'photo' ? 'Photo upload' : p === 'text' ? 'Written message' : 'No personalisation',
            }))}
          />

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

          {/* Price range. Two sliders rather than a max only, so "under €4" is
              expressible and cheap size tiers are not hidden. The band is the
              card's full size range, so a card matches on overlap. */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <div className="flex justify-between items-center text-xs">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Price</h4>
              <span className="font-bold text-rose-600">
                {minPrice > 0 ? `${formatPriceCompact(minPrice)} – ` : ''}
                {maxPrice >= PRICE_CEILING ? `${formatPriceCompact(PRICE_CEILING)}+` : formatPriceCompact(maxPrice)}
              </span>
            </div>
            <label className="block text-[10px] text-slate-500">Min</label>
            <input
              type="range"
              min={0}
              max={PRICE_CEILING}
              step={PRICE_STEP}
              value={minPrice}
              onChange={(e) => {
                const next = Number(e.target.value);
                setMinPrice(next);
                // Keep the two handles from crossing over.
                if (next > maxPrice) setMaxPrice(next);
              }}
              className="w-full accent-rose-500"
            />
            <label className="block text-[10px] text-slate-500">Max</label>
            <input
              type="range"
              min={0}
              max={PRICE_CEILING}
              step={PRICE_STEP}
              value={maxPrice}
              onChange={(e) => {
                const next = Number(e.target.value);
                setMaxPrice(next);
                if (next < minPrice) setMinPrice(next);
              }}
              className="w-full accent-rose-500"
            />
            <p className="text-[10px] text-slate-500 leading-snug">
              Matched against each card's full size range, not just its standard
              price.
            </p>
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
