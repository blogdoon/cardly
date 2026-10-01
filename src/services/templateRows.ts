/**
 * Row mapping for `public.templates`.
 *
 * The Postgres columns are snake_case; the app's `CardTemplate` is camelCase
 * (kept that way so `src/types/*` and every component did not have to change).
 * This is the one translation layer, and it lives here rather than being
 * scattered through catalogService.
 */

import type { CardTemplate } from '../types/template';
import type { CatalogDocument } from './catalogService';

type Row = Record<string, unknown>;

/** DB row → app object. Undefined DB nulls collapse to sensible defaults. */
export function rowToTemplate(row: Row): CatalogDocument {
  return {
    id: row.id as string,
    title: (row.title as string) ?? '',
    description: (row.description as string) ?? '',
    category: row.category as CardTemplate['category'],
    subcategory: (row.subcategory as string) ?? undefined,
    recipients: (row.recipients as CardTemplate['recipients']) ?? [],
    styles: (row.styles as CardTemplate['styles']) ?? [],
    tone: row.tone as CardTemplate['tone'],
    season: (row.season as CardTemplate['season']) ?? undefined,
    personalization: (row.personalization as CardTemplate['personalization']) ?? [],
    colors: (row.colors as CardTemplate['colors']) ?? [],
    tags: (row.tags as string[]) ?? [],
    price: Number(row.price ?? 0),
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    isPhotoCard: Boolean(row.is_photo_card),
    isPopular: Boolean(row.is_popular),
    isNew: Boolean(row.is_new),
    isBestSeller: Boolean(row.is_best_seller),
    milestoneAge: (row.milestone_age as number) ?? undefined,
    altText: (row.alt_text as string) ?? undefined,
    thumbnail: (row.thumbnail as string) ?? '',
    previewColors: (row.preview_colors as string[]) ?? [],
    defaultPages: (row.default_pages as CardTemplate['defaultPages']) ?? ({} as CardTemplate['defaultPages']),
    createdAt: (row.created_at as string) ?? undefined,
    deletedAt: (row.deleted_at as string) ?? null,
    deletedBy: (row.deleted_by as string) ?? null,
    updatedAt: (row.updated_at as string) ?? null,
  };
}

/** App object → DB row. Omits server-managed columns (updated_at trigger). */
export function templateToRow(t: CatalogDocument): Row {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    subcategory: t.subcategory ?? null,
    recipients: t.recipients ?? [],
    styles: t.styles ?? [],
    tone: t.tone ?? null,
    season: t.season ?? null,
    personalization: t.personalization ?? [],
    colors: t.colors ?? [],
    tags: t.tags ?? [],
    price: t.price,
    rating: t.rating ?? 0,
    review_count: t.reviewCount ?? 0,
    is_photo_card: t.isPhotoCard ?? false,
    is_popular: t.isPopular ?? false,
    is_new: t.isNew ?? false,
    is_best_seller: t.isBestSeller ?? false,
    milestone_age: t.milestoneAge ?? null,
    alt_text: t.altText ?? null,
    thumbnail: t.thumbnail ?? '',
    preview_colors: t.previewColors ?? [],
    default_pages: t.defaultPages ?? {},
    created_at: t.createdAt ?? new Date().toISOString(),
    deleted_at: t.deletedAt ?? null,
    deleted_by: t.deletedBy ?? null,
  };
}
