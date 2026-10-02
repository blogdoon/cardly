/**
 * Customer reviews for card templates — `public.reviews` in Postgres.
 *
 * Reviews are gated on a real purchase, and the gate is now server-side: the
 * insert policy in `supabase/migrations/0002_rls.sql` verifies the order belongs
 * to the caller and *contains the template*, using `items @> …`. Postgres rules
 * could not query another collection, so that check used to be a client
 * assertion — this is the one place RLS beats the old scheme outright.
 *
 * The composite primary key `(order_id, template_id)` enforces "one review per
 * order per card" structurally. New reviews land as `pending`; an admin
 * publishes them; only approved reviews count toward the displayed rating.
 *
 * There is no realtime channel: like the catalog, writes refetch and notify
 * in-process subscribers. One card page or one admin queue does not need a
 * postgres_changes publication to see its own writes.
 */

import { db, isSupabaseConfigured } from './supabase';
import { reloadCatalog } from './catalogService';
import {
  summarise,
  reviewDocId,
  EMPTY_RATING,
  type RatingSummary,
  type ReviewStatus as ReviewStatusType,
} from '../utils/rating';

const TABLE = 'reviews';

export type ReviewStatus = ReviewStatusType;

export { summarise, reviewDocId, EMPTY_RATING, type RatingSummary };

export interface Review {
  id: string;
  templateId: string;
  orderId: string;
  authorId: string;
  authorName: string;
  rating: number;
  review: string;
  status: ReviewStatus;
  createdAt: string;
  moderatedAt?: string;
  moderatedBy?: string;
}

type Row = Record<string, unknown>;

const rowToReview = (r: Row): Review => ({
  id: reviewDocId(r.order_id as string, r.template_id as string),
  templateId: r.template_id as string,
  orderId: r.order_id as string,
  authorId: r.author_id as string,
  authorName: r.author_name as string,
  rating: Number(r.rating),
  review: r.review as string,
  status: r.status as ReviewStatus,
  createdAt: (r.created_at as string) ?? '',
  moderatedAt: (r.moderated_at as string) ?? undefined,
  moderatedBy: (r.moderated_by as string) ?? undefined,
});

/** `${orderId}_${templateId}` → the orderId half. */
const orderIdOf = (reviewId: string, templateId: string): string =>
  reviewId.endsWith(`_${templateId}`) ? reviewId.slice(0, -(templateId.length + 1)) : reviewId;

// --- in-process subscription registries (refetch + notify) -------------------
const templateListeners = new Map<string, Set<(r: Review[]) => void>>();
const pendingListeners = new Set<(r: Review[]) => void>();

async function refetchTemplate(templateId: string): Promise<void> {
  const set = templateListeners.get(templateId);
  if (!set?.size) return;
  const reviews = await fetchTemplateReviews(templateId);
  for (const cb of set) cb(reviews);
}

async function refetchPending(): Promise<void> {
  if (!pendingListeners.size) return;
  const all = await fetchAllReviews();
  const pending = all.filter((r) => r.status === 'pending');
  for (const cb of pendingListeners) cb(pending);
}

async function fetchTemplateReviews(templateId: string): Promise<Review[]> {
  const { data, error } = await db()
    .from(TABLE)
    .select('*')
    .eq('template_id', templateId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToReview);
}

/** Reviews for one template, newest first. Pending/rejected included; the caller filters. */
export function subscribeToTemplateReviews(
  templateId: string,
  onReviews: (reviews: Review[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!isSupabaseConfigured) {
    onReviews([]);
    return () => {};
  }
  let set = templateListeners.get(templateId);
  if (!set) templateListeners.set(templateId, (set = new Set()));
  set.add(onReviews);

  fetchTemplateReviews(templateId)
    .then(onReviews)
    .catch((err) => onError?.(err instanceof Error ? err : new Error('unknown error')));

  return () => {
    set!.delete(onReviews);
    if (set!.size === 0) templateListeners.delete(templateId);
  };
}

/** Submit a review. RLS forces it to `pending` and verifies the purchase. */
export async function submitReview(input: {
  templateId: string;
  orderId: string;
  authorId: string;
  authorName: string;
  rating: number;
  review: string;
}): Promise<void> {
  const { error } = await db().from(TABLE).insert({
    order_id: input.orderId,
    template_id: input.templateId,
    author_id: input.authorId,
    author_name: input.authorName,
    rating: input.rating,
    review: input.review,
    status: 'pending',
  });
  if (error) throw new Error(error.message);
  await refetchTemplate(input.templateId);
  await refetchPending();
}

/** Approve or reject. Admin only (RLS). */
export async function moderateReview(
  templateId: string,
  reviewId: string,
  status: Exclude<ReviewStatus, 'pending'>,
  moderatorEmail: string
): Promise<void> {
  const { error } = await db()
    .from(TABLE)
    .update({ status, moderated_at: new Date().toISOString(), moderated_by: moderatorEmail })
    .eq('order_id', orderIdOf(reviewId, templateId))
    .eq('template_id', templateId);
  if (error) throw new Error(error.message);
  await recomputeTemplateRating(templateId);
  await refetchTemplate(templateId);
  await refetchPending();
}

/** Remove a review outright. Admin only. */
export async function deleteReview(templateId: string, reviewId: string): Promise<void> {
  await removeReview(templateId, reviewId);
}

/** Withdraw your own pending review. */
export async function withdrawReview(templateId: string, reviewId: string): Promise<void> {
  await removeReview(templateId, reviewId);
}

async function removeReview(templateId: string, reviewId: string): Promise<void> {
  const { error } = await db()
    .from(TABLE)
    .delete()
    .eq('order_id', orderIdOf(reviewId, templateId))
    .eq('template_id', templateId);
  if (error) throw new Error(error.message);
  await recomputeTemplateRating(templateId);
  await refetchTemplate(templateId);
  await refetchPending();
}

/**
 * Rewrite a template's `rating` / `reviewCount` from its approved reviews, so
 * the catalog never drifts from the reviews behind it. Zeroed when none.
 */
export async function recomputeTemplateRating(templateId: string): Promise<RatingSummary> {
  const reviews = await fetchTemplateReviews(templateId);
  const summary = summarise(reviews);
  const { error } = await db()
    .from('templates')
    .update({ rating: summary.average, review_count: summary.count })
    .eq('id', templateId);
  if (error) throw new Error(error.message);
  await reloadCatalog();
  return summary;
}

/** Every review across every template, for the admin queue. Newest first. */
export async function fetchAllReviews(): Promise<Review[]> {
  const { data, error } = await db()
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToReview);
}

/** Subscribe to the pending queue. Admin only. */
export function subscribeToPendingReviews(
  onReviews: (reviews: Review[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!isSupabaseConfigured) {
    onReviews([]);
    return () => {};
  }
  pendingListeners.add(onReviews);
  refetchPending().catch((err) =>
    onError?.(err instanceof Error ? err : new Error('unknown error'))
  );
  return () => {
    pendingListeners.delete(onReviews);
  };
}
