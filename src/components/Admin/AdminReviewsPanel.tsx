/**
 * Admin review moderation queue.
 *
 * Reviews are created as `pending` and are invisible on the card page until an
 * admin publishes them, so this queue is what makes the storefront ratings real.
 * Approving or rejecting recomputes the template's aggregate rating, which is
 * why the numbers on a card can never drift from the reviews underneath them.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Trash2, Star, Loader2, AlertCircle, Inbox } from 'lucide-react';
import {
  subscribeToPendingReviews,
  moderateReview,
  deleteReview,
  type Review,
} from '../../services/reviewService';
import { useAuth } from '../../context/AuthContext';
import { getTemplateById } from '../../data/templates';

export const AdminReviewsPanel: React.FC = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToPendingReviews(
      (next) => setReviews(next),
      (err) => setError(err.message)
    );
  }, []);

  const act = useCallback(
    async (review: Review, action: () => Promise<void>) => {
      setBusyId(review.id);
      setError(null);
      try {
        await action();
      } catch (e) {
        setError(
          e instanceof Error
            ? `${e.message} — check that RLS policies allow admin review moderation.`
            : 'That action failed.'
        );
      } finally {
        setBusyId(null);
      }
    },
    []
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-6">
      <div>
        <h2 className="font-bold text-slate-900 text-base">Review Moderation</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {reviews.length} review{reviews.length === 1 ? '' : 's'} waiting. Only approved reviews
          count toward a card's rating.
        </p>
      </div>

      {error && (
        <p className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
          {error}
        </p>
      )}

      {reviews.length === 0 ? (
        <p className="py-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Inbox className="w-4 h-4" />
          Nothing to moderate.
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const template = getTemplateById(review.templateId);
            const isBusy = busyId === review.id;
            return (
              <div key={review.id} className="p-5 rounded-2xl border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs">
                        {template?.title ?? review.templateId}
                      </span>
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < review.rating ? 'text-amber-400' : 'text-slate-200'
                            }`}
                            fill={i < review.rating ? 'currentColor' : 'none'}
                          />
                        ))}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">{review.review}</p>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      {review.authorName} · order {review.orderId} ·{' '}
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() =>
                        act(review, () =>
                          moderateReview(
                            review.templateId,
                            review.id,
                            'approved',
                            user?.email ?? 'admin'
                          )
                        )
                      }
                      disabled={isBusy}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() =>
                        act(review, () =>
                          moderateReview(
                            review.templateId,
                            review.id,
                            'rejected',
                            user?.email ?? 'admin'
                          )
                        )
                      }
                      disabled={isBusy}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() =>
                        act(review, () => deleteReview(review.templateId, review.id))
                      }
                      disabled={isBusy}
                      aria-label="Delete review"
                      className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
