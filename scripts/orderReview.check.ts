/**
 * Checks the order-lifecycle and review rules that are easy to get wrong.
 *
 * The pure functions live in src/types/order.ts and src/services/reviewService.ts.
 * reviewService imports firebase/firestore at the top level, so this checks the
 * pieces that do not need a live connection; the aggregation maths is exercised
 * through `summarise`.
 *
 * `npm test`
 */

import {
  ORDER_STATUS_FLOW,
  TERMINAL_ORDER_STATUSES,
  isTerminalStatus,
  type Order,
  type OrderStatus,
} from '../src/types/order.ts';
import {
  summarise,
  reviewDocId,
  EMPTY_RATING,
  type ReviewLike,
} from '../src/utils/rating.ts';

let failures = 0;
const eq = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`FAIL ${label}: expected ${e}, got ${a}`);
  }
};

const makeOrder = (over: Partial<Order> = {}): Order =>
  ({
    id: 'ord_1',
    orderNumber: 'CRD-2026-0001',
    userId: 'user_1',
    items: [],
    subtotal: 10,
    deliveryFee: 1.45,
    discount: 0,
    total: 11.45,
    status: 'processing',
    shippingAddress: {
      id: 'a',
      name: 'Alex',
      line1: '12 Merrion Square',
      city: 'Dublin',
      postcode: 'D02 AF30',
      country: 'Ireland',
    },
    deliveryMethod: {
      id: 'letterbox-standard',
      name: 'Standard Letterbox',
      price: 1.45,
      estimatedDelivery: '3–5 working days',
      description: 'Delivered through the letterbox',
      transitDays: 4,
    },
    dispatchDate: '2026-01-02T10:00:00.000Z',
    deliveryType: 'direct_to_recipient',
    estimatedArrival: '2026-01-06T10:00:00.000Z',
    paymentSummary: { method: 'card', last4: '4242' },
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    ...over,
  }) as Order;

const makeReview = (over: Partial<ReviewLike> = {}): ReviewLike => ({
  rating: 5,
  status: 'approved',
  ...over,
});

// --- terminal statuses -------------------------------------------------------
// The fulfilment flow must not include cancelled/refunded, or an admin could
// walk a refunded order back to "processing".
eq('flow is the four live states', ORDER_STATUS_FLOW, [
  'processing',
  'printed',
  'dispatched',
  'delivered',
]);
eq('terminal states are separate', TERMINAL_ORDER_STATUSES, ['cancelled', 'refunded']);
for (const status of ORDER_STATUS_FLOW) {
  eq(`${status} is not terminal`, isTerminalStatus(status as OrderStatus), false);
}
for (const status of TERMINAL_ORDER_STATUSES) {
  eq(`${status} is terminal`, isTerminalStatus(status as OrderStatus), true);
}

// --- refund eligibility ------------------------------------------------------
// Mirrors isRefundable in src/services/adminOrderService.ts.
const isRefundable = (order: Order) =>
  order.status !== 'refunded' && order.status !== 'cancelled' && order.total > 0;

eq('a processing order is refundable', isRefundable(makeOrder()), true);
eq('a delivered order is still refundable', isRefundable(makeOrder({ status: 'delivered' })), true);
eq('a refunded order is not refundable', isRefundable(makeOrder({ status: 'refunded' })), false);
eq('a cancelled order is not refundable', isRefundable(makeOrder({ status: 'cancelled' })), false);
eq('a zero-total order is not refundable', isRefundable(makeOrder({ total: 0 })), false);

// --- refund amount clamping --------------------------------------------------
// A full refund defaults to the order total and can never exceed it.
const clamp = (order: Order, amount?: number) =>
  amount === undefined ? order.total : Math.min(Math.max(0, amount), order.total);

eq('no amount means a full refund', clamp(makeOrder()), 11.45);
eq('partial refund is kept', clamp(makeOrder(), 5), 5);
eq('over-refund is clamped to the total', clamp(makeOrder(), 99), 11.45);
eq('a negative refund is clamped to zero', clamp(makeOrder(), -10), 0);

// --- review document id ------------------------------------------------------
// Pinned by firestore.rules to `${orderId}_${templateId}`, which is what allows
// exactly one review per order per card.
eq('review id is order and template', reviewDocId('ord_1', 'card-001'), 'ord_1_card-001');
eq('review id is stable', reviewDocId('ord_1', 'card-001'), reviewDocId('ord_1', 'card-001'));
eq('a different order yields a different id', reviewDocId('ord_2', 'card-001'), 'ord_2_card-001');
eq('a different card yields a different id', reviewDocId('ord_1', 'card-002'), 'ord_1_card-002');

// --- rating aggregation ------------------------------------------------------
eq('no reviews is the empty summary', summarise([]), EMPTY_RATING);

const oneReview = summarise([makeReview({ rating: 5 })]);
eq('one review counts once', oneReview.count, 1);
eq('one review averages to its rating', oneReview.average, 5);
eq('one review lands in the 5-star bucket', oneReview.histogram, [0, 0, 0, 0, 1]);

const mixed = summarise([
  makeReview({ rating: 5 }),
  makeReview({ rating: 4 }),
  makeReview({ rating: 3 }),
  makeReview({ rating: 1 }),
]);
eq('mixed count', mixed.count, 4);
eq('mixed average is 1dp', mixed.average, 3.3);
eq('mixed histogram totals the count', mixed.histogram.reduce((a, b) => a + b, 0), 4);
eq('mixed histogram', mixed.histogram, [1, 0, 1, 1, 1]);

// Only approved reviews count. Pending and rejected must not move the rating,
// which is what makes moderation meaningful.
const withPending = summarise([
  makeReview({ rating: 5, status: 'approved' }),
  makeReview({ rating: 1, status: 'pending' }),
  makeReview({ rating: 1, status: 'rejected' }),
]);
eq('pending and rejected are excluded', withPending.count, 1);
eq('pending and rejected do not drag the average down', withPending.average, 5);
eq('the histogram only counts approved', withPending.histogram, [0, 0, 0, 0, 1]);

// All-pending is the same as no reviews at all.
eq('all pending is the empty summary', summarise([makeReview({ status: 'pending' })]), EMPTY_RATING);

// Fractional ratings round to the nearest star: 4.6 → 5, 3.7 → 4.
const fractional = summarise([
  makeReview({ rating: 4.6 }),
  makeReview({ rating: 3.7 }),
]);
eq('fractional ratings bucket to the nearest star', fractional.histogram, [0, 0, 0, 1, 1]);
eq('fractional average is still computed on the raw value', fractional.average, 4.2);

// Out-of-range values cannot produce an out-of-range index.
const outOfRange = summarise([
  makeReview({ rating: 0 }),
  makeReview({ rating: 9 }),
]);
eq('out-of-range ratings stay in bounds', outOfRange.histogram.reduce((a, b) => a + b, 0), 2);
eq('5 stars or above buckets to 5', outOfRange.histogram[4], 1);
eq('below 1 star buckets to 1', outOfRange.histogram[0], 1);

if (failures > 0) {
  throw new Error(`${failures} order/review check(s) failed`);
}
console.log('order + review: ok');
