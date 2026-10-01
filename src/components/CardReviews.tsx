/**
 * Customer reviews for a card.
 *
 * Ratings shown on a card come from real, approved reviews — previously the
 * catalog carried a static `rating` / `reviewCount` with no review data behind
 * it. A review can only be left by a customer whose order actually contains this
 * template, and it appears publicly only once an admin approves it.
 *
 * The gate is enforced in three places, which is worth knowing when reading this:
 *  - Postgres rules pin the document id to `${orderId}_${templateId}`, so one
 *    order yields at most one review per card;
 *  - the rules require the review to be created as `pending`;
 *  - the client only offers the form for templates the customer has bought.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Star, CheckCircle2, ShieldCheck, Loader2, Send } from 'lucide-react';
import {
  subscribeToTemplateReviews,
  submitReview,
  withdrawReview,
  reviewDocId,
  summarise,
  EMPTY_RATING,
  type Review,
} from '../services/reviewService';
import { getUserOrders } from '../services/cardStorage';
import { useAuth } from '../context/AuthContext';
import type { Order } from '../types/order';

interface Props {
  templateId: string;
  /** Used until the live review summary arrives. */
  fallbackRating: number;
  fallbackCount: number;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const StarRow: React.FC<{ rating: number; size?: number }> = ({ rating, size = 14 }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
    {Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        style={{ width: size, height: size }}
        className={i < Math.round(rating) ? 'text-amber-400' : 'text-slate-200'}
        fill={i < Math.round(rating) ? 'currentColor' : 'none'}
      />
    ))}
  </span>
);

export const CardReviews: React.FC<Props> = ({ templateId, fallbackRating, fallbackCount }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(
    () => subscribeToTemplateReviews(templateId, setReviews, (err) => setError(err.message)),
    [templateId]
  );

  // Only signed-in customers can review, so only fetch orders for them.
  useEffect(() => {
    if (!user) {
      setOrdersLoaded(true);
      return;
    }
    let cancelled = false;
    getUserOrders(user.uid)
      .then((result) => {
        if (!cancelled) {
          setOrders(result);
          setOrdersLoaded(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load your orders.');
          setOrdersLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const approved = useMemo(() => reviews.filter((r) => r.status === 'approved'), [reviews]);
  const summary = approved.length > 0 ? summarise(approved) : null;

  /**
   * Orders that actually contain this template, and are not cancelled or
   * refunded — you cannot review a card you did not get, or one you sent back.
   */
  const eligibleOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status !== 'cancelled' &&
          o.status !== 'refunded' &&
          o.items.some((item) => item.templateId === templateId)
      ),
    [orders, templateId]
  );

  const existing = useMemo(() => {
    const mine = reviews.filter((r) => r.authorId === user?.uid);
    return mine.length > 0 ? mine : null;
  }, [reviews, user]);

  const reviewableOrder = eligibleOrders.find(
    (o) => !reviews.some((r) => r.id === reviewDocId(o.id, templateId))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reviewableOrder) return;
    if (rating < 1) {
      setError('Pick a star rating first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitReview({
        templateId,
        orderId: reviewableOrder.id,
        authorId: user.uid,
        authorName: user.displayName || 'Cardly customer',
        rating,
        review: text.trim(),
      });
      setText('');
      setRating(0);
      setJustSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not submit: ${err.message}`
          : 'Could not submit your review.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = summary?.average ?? (fallbackCount > 0 ? fallbackRating : 0);
  const displayCount = summary?.count ?? fallbackCount;

  return (
    <section className="space-y-6" id="reviews">
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900">Customer Reviews</h2>
        {displayCount > 0 && (
          <div className="flex items-center gap-2">
            <StarRow rating={displayRating} size={16} />
            <span className="text-sm font-bold text-slate-900">{displayRating.toFixed(1)}</span>
            <span className="text-xs text-slate-500">
              ({displayCount} review{displayCount === 1 ? '' : 's'})
            </span>
          </div>
        )}
      </div>

      {displayCount === 0 ? (
        <p className="text-sm text-slate-500">
          No reviews yet. If you have bought this card, you can be the first to review it.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-start">
          {summary && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 w-full sm:w-40">
              <div className="text-3xl font-black text-slate-900">
                {summary.average.toFixed(1)}
              </div>
              <StarRow rating={summary.average} />
              <div className="mt-2 space-y-0.5">
                {summary.histogram
                  .map((count, i) => ({ count, star: i + 1 }))
                  .reverse()
                  .map(({ count, star }) => (
                    <div key={star} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span className="w-3">{star}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{
                            width: `${summary.count > 0 ? (count / summary.count) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-3 text-right">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {approved.slice(0, 5).map((review) => (
              <article key={review.id} className="pb-4 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <StarRow rating={review.rating} />
                  <span className="text-sm font-bold text-slate-900">{review.authorName}</span>
                  <span className="text-[11px] text-slate-400">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">{review.review}</p>
              </article>
            ))}
            {approved.length > 5 && (
              <p className="text-xs text-slate-500">
                Showing the 5 most recent of {approved.length} reviews.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Write a review */}
      <div className="pt-2">
        {error && (
          <p className="mb-3 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
            {error}
          </p>
        )}

        {justSubmitted && (
          <p className="mb-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Thanks — your review is awaiting approval and will appear shortly.
          </p>
        )}

        {!user && (
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Sign in to review this card.
          </p>
        )}

        {user && existing && (
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
            <p className="text-xs text-slate-600">
              You reviewed this card {formatDate(existing[0].createdAt)} with{' '}
              <strong>{existing[0].rating} star{existing[0].rating === 1 ? '' : 's'}</strong>.{' '}
              {existing[0].status === 'pending'
                ? 'It is waiting for approval.'
                : existing[0].status === 'approved'
                  ? 'It is published.'
                  : 'It was not published.'}
            </p>
            {existing[0].status === 'pending' && (
              <button
                onClick={() =>
                  withdrawReview(templateId, existing[0].id).catch((err) =>
                    setError(err instanceof Error ? err.message : 'Could not withdraw.')
                  )
                }
                className="text-[11px] font-bold text-slate-500 hover:text-rose-600 underline"
              >
                Withdraw review
              </button>
            )}
          </div>
        )}

        {user && !existing && reviewableOrder && (
          <form onSubmit={handleSubmit} className="space-y-3 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Your rating</label>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }, (_, i) => i + 1).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    onMouseEnter={() => setHoverRating(value)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${value} star${value === 1 ? '' : 's'}`}
                    className="p-0.5"
                  >
                    <Star
                      style={{ width: 26, height: 26 }}
                      className={
                        value <= (hoverRating || rating) ? 'text-amber-400' : 'text-slate-300'
                      }
                      fill={value <= (hoverRating || rating) ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Your review of the card and print quality
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="How was the card? Was the print quality good?"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-rose-500"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Reviews are checked before they appear publicly.
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting || rating < 1}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Submit review
            </button>
          </form>
        )}

        {user && !existing && ordersLoaded && eligibleOrders.length === 0 && (
          <p className="text-xs text-slate-500">
            Only customers who have bought this card can review it.
          </p>
        )}
      </div>
    </section>
  );
};
