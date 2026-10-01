/**
 * Shared image fallback. Every card in this catalogue is an image, and the
 * thumbnails come from three places that can each fail: the Vite bundle, the
 * user's own localStorage data-URLs (quota-pruned), and Supabase Storage — whose
 * CORS config is opt-in (see VITE_USE_SUPABASE_STORAGE in .env.example).
 * Without a fallback any of those failures renders a blank white tile.
 *
 * Callers pass the card's own background colour via data-bgcolor so a broken
 * image leaves a correctly-coloured card rather than a white hole.
 */

export function handleImageError(e: { currentTarget: HTMLImageElement }): void {
  const img = e.currentTarget;
  if (img.dataset.fallbackApplied === '1') return; // never re-run
  img.dataset.fallbackApplied = '1';

  const color = img.getAttribute('data-bgcolor') || '';
  img.classList.add('opacity-0');

  const parent = img.parentElement;
  if (parent && !parent.dataset.fallbackApplied) {
    parent.dataset.fallbackApplied = '1';
    if (color) parent.style.backgroundColor = color;
    parent.classList.add('bg-rose-50/40');
  }
}
