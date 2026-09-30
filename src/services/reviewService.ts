/**
 * Customer reviews for card templates.
 *
 * Reviews are gated on a real purchase: only a customer with an order containing
 * that template can review it, and the document id is pinned to
 * `${orderId}_${templateId}` so one order yields at most one review per card.
 * New reviews land as `pending`; an admin publishes them. Only approved reviews
 * count toward the template's displayed rating.
 *
 * The template's `rating` / `reviewCount` are recomputed from approved reviews
 * whenever moderation changes, so the numbers on the storefront always match the
 * reviews underneath them — the previous "4.9★ from 12,000+ reviews" came from
 * static catalog fields with no review data behind them at all.
 */

import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  orderBy,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  summarise,
  reviewDocId,
  EMPTY_RATING,
  type RatingSummary,
  type ReviewStatus as ReviewStatusType,
} from '../utils/rating';

const TEMPLATES = 'templates';

export type ReviewStatus = ReviewStatusType;

// Re-exported so callers have one obvious import for review maths and one for
// the Firestore plumbing. The implementation lives in utils/rating.ts because it
// has no Firebase dependency and is unit tested directly (see
// scripts/orderReview.check.ts).
export { summarise, reviewDocId, EMPTY_RATING, type RatingSummary };

export interface Review {
  id: string;
  templateId: string;
  orderId: string;
  /** uid of the reviewer. */
  authorId: string;
  /** Display name shown on the review; never the email. */
  authorName: string;
  rating: number;
  review: string;
  status: ReviewStatus;
  createdAt: string;
  moderatedAt?: string;
  moderatedBy?: string;
}

/** Firestore rejects `undefined`, so strip it before writing. */
const toDoc = (r: Review) => {
  const doc: Record<string, unknown> = {
    templateId: r.templateId,
    orderId: r.orderId,
    authorId: r.authorId,
    authorName: r.authorName,
    rating: r.rating,
    review: r.review,
    status: r.status,
    createdAt: r.createdAt,
  };
  if (r.moderatedAt) doc.moderatedAt = r.moderatedAt;
  if (r.moderatedBy) doc.moderatedBy = r.moderatedBy;
  return doc;
};

/**
 * Reviews for one template, newest first. Pending and rejected reviews are
 * returned too — the caller decides what to show (the card page hides them, the
 * admin console shows everything). Keeping one query avoids two round trips.
 */
export function subscribeToTemplateReviews(
  templateId: string,
  onReviews: (reviews: Review[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    return onSnapshot(
      query(collection(db, TEMPLATES, templateId, 'reviews'), orderBy('createdAt', 'desc')),
      (snap) => {
        onReviews(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review)
        );
      },
      (err) => onError?.(err)
    );
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error('unknown error'));
    return () => {};
  }
}

/**
 * Submit a review. Always created as `pending` — the rules reject any other
 * status, so a client cannot publish its own review.
 */
export async function submitReview(input: {
  templateId: string;
  orderId: string;
  authorId: string;
  authorName: string;
  rating: number;
  review: string;
}): Promise<void> {
  const review: Review = {
    ...input,
    id: reviewDocId(input.orderId, input.templateId),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, TEMPLATES, input.templateId, 'reviews', review.id), toDoc(review));
}

/** Approve or reject. Admin only (enforced by firestore.rules). */
export async function moderateReview(
  templateId: string,
  reviewId: string,
  status: Exclude<ReviewStatus, 'pending'>,
  moderatorEmail: string
): Promise<void> {
  await setDoc(
    doc(db, TEMPLATES, templateId, 'reviews', reviewId),
    { status, moderatedAt: new Date().toISOString(), moderatedBy: moderatorEmail },
    { merge: true }
  );
  await recomputeTemplateRating(templateId);
}

/** Remove a review outright. Admin only. */
export async function deleteReview(templateId: string, reviewId: string): Promise<void> {
  await deleteDoc(doc(db, TEMPLATES, templateId, 'reviews', reviewId));
  await recomputeTemplateRating(templateId);
}

/** Withdraw your own pending review. */
export async function withdrawReview(templateId: string, reviewId: string): Promise<void> {
  await deleteDoc(doc(db, TEMPLATES, templateId, 'reviews', reviewId));
  await recomputeTemplateRating(templateId);
}

/**
 * Rewrite a template's `rating` / `reviewCount` from its approved reviews.
 *
 * Called after any moderation change so the catalog can never drift from the
 * reviews behind it. With no approved reviews the fields are zeroed rather than
 * left stale.
 */
export async function recomputeTemplateRating(templateId: string): Promise<RatingSummary> {
  const snap = await getDocs(collection(db, TEMPLATES, templateId, 'reviews'));
  const reviews = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review);
  const summary = summarise(reviews);
  await setDoc(
    doc(db, TEMPLATES, templateId),
    { rating: summary.average, reviewCount: summary.count },
    { merge: true }
  );
  return summary;
}

/**
 * Every review across every template, for the admin moderation queue.
 * Newest first.
 */
export async function fetchAllReviews(): Promise<Review[]> {
  const snap = await getDocs(query(collectionGroup(db, 'reviews'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review);
}

/** Subscribe to the pending queue. Admin only. */
export function subscribeToPendingReviews(
  onReviews: (reviews: Review[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    return onSnapshot(
      query(collectionGroup(db, 'reviews'), where('status', '==', 'pending'), orderBy('createdAt', 'desc')),
      (snap) => onReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review)),
      (err) => onError?.(err)
    );
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error('unknown error'));
    return () => {};
  }
}
