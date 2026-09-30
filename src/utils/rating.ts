/**
 * Rating aggregation, kept free of any Firebase import so it can be unit tested
 * and reasoned about on its own. `services/reviewService.ts` re-exports these.
 *
 * Only APPROVED reviews count. That is the whole point of moderation: a pending
 * review must not move the number customers see, otherwise approving or
 * rejecting a review would change nothing.
 */

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

/** The subset of a review that rating maths needs. */
export interface ReviewLike {
  rating: number;
  status: ReviewStatus;
}

export interface RatingSummary {
  average: number;
  count: number;
  /** Star distribution, index 0 = 1 star … index 4 = 5 stars. */
  histogram: [number, number, number, number, number];
}

export const EMPTY_RATING: RatingSummary = {
  average: 0,
  count: 0,
  histogram: [0, 0, 0, 0, 0],
};

/** Average (1dp) and histogram over approved reviews only. */
export function summarise(reviews: ReviewLike[]): RatingSummary {
  const approved = reviews.filter((r) => r.status === 'approved');
  if (approved.length === 0) return EMPTY_RATING;

  const histogram: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let total = 0;
  for (const review of approved) {
    // Clamp, so a bad value can never index outside the tuple.
    const index = Math.min(4, Math.max(0, Math.round(review.rating) - 1));
    histogram[index] += 1;
    total += review.rating;
  }
  return {
    average: Math.round((total / approved.length) * 10) / 10,
    count: approved.length,
    histogram,
  };
}

/**
 * The deterministic review document id.
 *
 * `firestore.rules` pins a review's id to `${orderId}_${templateId}`, which is
 * how "one review per order per card" is enforced: a second attempt collides on
 * the same document rather than creating another.
 */
export const reviewDocId = (orderId: string, templateId: string) => `${orderId}_${templateId}`;
