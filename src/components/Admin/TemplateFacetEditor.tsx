/**
 * Admin editor for a template's browse facets.
 *
 * Facets used to be write-only: a card was assigned its recipient/style/season
 * at creation and there was no way to change one, because the only admin
 * mutation was `handleToggleBestSeller`. The only remedy for a card filed in the
 * wrong bucket was to delete and recreate it, which changes the id — and past
 * orders, saved designs and favourites all reference that id.
 *
 * This writes through the same `upsertTemplate`, so it is the same single writer
 * the studio uses, and `buildTemplateFacets` runs on write to fill in anything
 * left blank. Values are read from the catalog, which has already been through
 * the read-path backfill, so a legacy scalar `recipient` shows up as a ticked
 * chip rather than silently disappearing.
 */

import React, { useState } from 'react';
import { Check, Loader2, SlidersHorizontal, X } from 'lucide-react';
import { CardTemplate } from '../../types/template';
import {
  RECIPIENT_TYPES,
  STYLE_TYPES,
  TONE_TYPES,
  SEASON_TYPES,
  PERSONALIZATION_TYPES,
  MILESTONE_AGE_VALUES,
  COLOR_FAMILY_LABELS,
  type ColorFamily,
} from '../../utils/templateFacets';

interface TemplateFacetEditorProps {
  template: CardTemplate;
  onSave: (template: CardTemplate) => Promise<void>;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}

const ChipGroup: React.FC<{
  label: string;
  values: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}> = ({ label, values, selected, onToggle }) => (
  <div>
    <label className="block text-[11px] font-semibold text-slate-600 mb-1">{label}</label>
    <div className="flex flex-wrap gap-1">
      {values.map((v) => {
        const on = selected.includes(v);
        return (
          <button
            key={v}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(v)}
            className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
              on
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white text-slate-600 border-slate-300 hover:border-rose-300'
            }`}
          >
            {v}
          </button>
        );
      })}
    </div>
  </div>
);

export const TemplateFacetEditor: React.FC<TemplateFacetEditorProps> = ({
  template,
  onSave,
  onError,
  onNotice,
}) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Edits are held locally until Save, so an accidental click is not a Firestore
  // write — and the catalog cannot change underneath a half-finished edit.
  const [recipients, setRecipients] = useState<string[]>(template.recipients);
  const [styles, setStyles] = useState<string[]>(template.styles);
  const [tone, setTone] = useState<string>(template.tone);
  const [season, setSeason] = useState<string>(template.season ?? 'all-year');
  const [personalization, setPersonalization] = useState<string[]>(template.personalization);
  const [milestoneAge, setMilestoneAge] = useState<number | ''>(template.milestoneAge ?? '');
  const [price, setPrice] = useState<number>(template.price);

  const reset = () => {
    setRecipients(template.recipients);
    setStyles(template.styles);
    setTone(template.tone);
    setSeason(template.season ?? 'all-year');
    setPersonalization(template.personalization);
    setMilestoneAge(template.milestoneAge ?? '');
    setPrice(template.price);
  };

  const toggle = (list: string[], value: string, set: (next: string[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const save = async () => {
    if (recipients.length === 0 || styles.length === 0 || personalization.length === 0) {
      onError('A card needs at least one recipient, one style and one personalisation type.');
      return;
    }
    setBusy(true);
    try {
      // `isPhotoCard` is derived from personalization on write, so it is set
      // here too — otherwise the card would show a stale badge until the next
      // read rebuilt it.
      await onSave({
        ...template,
        recipients: recipients as CardTemplate['recipients'],
        styles: styles as CardTemplate['styles'],
        tone: tone as CardTemplate['tone'],
        season: season as CardTemplate['season'],
        personalization: personalization as CardTemplate['personalization'],
        isPhotoCard: personalization.includes('photo'),
        ...(milestoneAge === '' ? { milestoneAge: undefined } : { milestoneAge }),
        price,
      });
      onNotice(`Updated the facets on "${template.title}".`);
      setOpen(false);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not save those facets.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center gap-1"
      >
        <SlidersHorizontal className="w-3 h-3" />
        Facets
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={() => !busy && setOpen(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label={`Edit facets for ${template.title}`}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between p-5 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h3 className="font-bold text-slate-900">Browse facets</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{template.title}</p>
          </div>
          <button
            onClick={() => !busy && setOpen(false)}
            className="p-1.5 rounded-full hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[11px] text-slate-500 leading-snug">
            These are the fields the storefront filters on. Tapping more than one
            value within a facet widens the search — a card listed as both
            &ldquo;Cute&rdquo; and &ldquo;Retro&rdquo; is returned by either.
          </p>

          <ChipGroup
            label="Recipients"
            values={RECIPIENT_TYPES}
            selected={recipients}
            onToggle={(v) => toggle(recipients, v, setRecipients)}
          />
          <ChipGroup
            label="Styles"
            values={STYLE_TYPES}
            selected={styles}
            onToggle={(v) => toggle(styles, v, setStyles)}
          />
          <ChipGroup
            label="Personalisation"
            values={PERSONALIZATION_TYPES}
            selected={personalization}
            onToggle={(v) => toggle(personalization, v, setPersonalization)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {TONE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Season</label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {SEASON_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Milestone age
              </label>
              <select
                value={milestoneAge}
                onChange={(e) =>
                  setMilestoneAge(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="">None</option>
                {MILESTONE_AGE_VALUES.map((age) => (
                  <option key={age} value={age}>
                    Turning {age}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Standard price (EUR)
              </label>
              <input
                type="number"
                step="0.10"
                min="1.99"
                max="99.99"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value) || 0)}
                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {milestoneAge === '' && (
            <p className="text-[10px] text-slate-500 leading-snug">
              No milestone age — correct for a general card. Setting one badges
              the card &ldquo;Turning {MILESTONE_AGE_VALUES[0]}&rdquo; etc. and
              restricts it to that age in the Milestone Age filter.
            </p>
          )}

          {personalization.includes('photo') && (
            <p className="text-[10px] text-purple-700 leading-snug">
              This card is now a <strong>Photo Card</strong>: it gets the badge on
              the storefront, appears under <code className="font-mono">?photo=1</code>,
              and shows a photo-upload prompt on its detail page.
            </p>
          )}

          <p className="text-[10px] text-slate-500">
            Colours are derived from the card&rsquo;s swatches
            {template.colors?.length
              ? `: ${template.colors.map((c) => COLOR_FAMILY_LABELS[c as ColorFamily] ?? c).join(', ')}`
              : ''}
            . Rating and review count are owned by approved reviews and are not
            editable here.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 sticky bottom-0 bg-white rounded-b-2xl">
          <button
            onClick={() => {
              reset();
              setOpen(false);
            }}
            disabled={busy}
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save facets
          </button>
        </div>
      </div>
    </div>
  );
};
