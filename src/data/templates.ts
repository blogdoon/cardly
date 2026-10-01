import { CardTemplate, OccasionType, RecipientType } from '../types/template';

/**
 * In-memory live catalog mirror.
 *
 * The catalog is Postgres-backed and nothing is bundled. `templates/{id}` in
 * Postgres is the source of truth. This module is an in-memory mirror kept in sync
 * by CatalogProvider (via `subscribeToCatalog` in `src/services/catalogService.ts`).
 *
 * An empty catalog is a real state. When Postgres has documents, they are streamed
 * into `liveCatalog` via `setLiveCatalog()`.
 */

let liveCatalog: CardTemplate[] = [];

/**
 * Array export for backwards compatibility. Modules importing `ALL_TEMPLATES`
 * access the current live catalog elements.
 */
export const ALL_TEMPLATES: CardTemplate[] = liveCatalog;

export function getLiveCatalog(): CardTemplate[] {
  return liveCatalog;
}

export function setLiveCatalog(templates: CardTemplate[]): void {
  liveCatalog = templates;
  // Keep ALL_TEMPLATES in sync in-place so modules referencing ALL_TEMPLATES see updates
  ALL_TEMPLATES.length = 0;
  ALL_TEMPLATES.push(...templates);
}

export function getTemplateById(id: string): CardTemplate | undefined {
  return liveCatalog.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: OccasionType): CardTemplate[] {
  return liveCatalog.filter((t) => t.category.toLowerCase() === category.toLowerCase());
}

export function getTemplatesByRecipient(recipient: RecipientType): CardTemplate[] {
  // `recipients` is an array, so a card for a "Friend" is also returned for
  // "Best Friend" when it lists both. A legacy scalar `recipient` is widened to
  // an array by `withFacets` in catalogService, so no fallback is needed here.
  return liveCatalog.filter((t) =>
    t.recipients.some((r) => r.toLowerCase() === recipient.toLowerCase())
  );
}

export function getPopularTemplates(limit = 12): CardTemplate[] {
  return liveCatalog.filter((t) => t.isPopular || t.isBestSeller).slice(0, limit);
}

export function getPhotoTemplates(limit = 12): CardTemplate[] {
  return liveCatalog.filter((t) => t.isPhotoCard).slice(0, limit);
}

export function registerCustomTemplate(template: CardTemplate): void {
  const existingIdx = liveCatalog.findIndex((t) => t.id === template.id);
  if (existingIdx >= 0) {
    liveCatalog[existingIdx] = template;
  } else {
    liveCatalog.unshift(template);
  }
  ALL_TEMPLATES.length = 0;
  ALL_TEMPLATES.push(...liveCatalog);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cardly_templates_updated', { detail: template }));
  }
}

export function unregisterCustomTemplate(templateId: string): void {
  const existingIdx = liveCatalog.findIndex((t) => t.id === templateId);
  if (existingIdx >= 0) {
    liveCatalog.splice(existingIdx, 1);
  }
  ALL_TEMPLATES.length = 0;
  ALL_TEMPLATES.push(...liveCatalog);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('cardly_templates_updated', { detail: { id: templateId, deleted: true } })
    );
  }
}
