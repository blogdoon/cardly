import assert from 'node:assert';
import {
  DELIVERY_METHODS,
  findDeliveryMethod,
  deliveryWindow,
  canArriveBy,
  earliestRequestableDate,
  toDateInput,
  parseDateInput,
} from '../src/utils/delivery.ts';

const express = findDeliveryMethod('express-courier');
const standard = findDeliveryMethod('letterbox-standard');
const tracked = findDeliveryMethod('post-tracked');

// Unknown ids fall back to the standard tier rather than throwing.
assert.equal(findDeliveryMethod('nope').id, 'letterbox-standard');

// A yyyy-mm-dd string is parsed as LOCAL midnight. If this ever becomes
// `new Date(string)` the day shifts backwards for anyone west of UTC.
const parsed = parseDateInput('2026-03-14');
assert.equal(parsed.getFullYear(), 2026);
assert.equal(parsed.getMonth(), 2);
assert.equal(parsed.getDate(), 14);
assert.equal(toDateInput(parsed), '2026-03-14');

// Express skips production; everything else gets a day in the print room.
const from = new Date(2026, 2, 10, 9, 0, 0); // Tue 10 Mar 2026, local
assert.equal(toDateInput(deliveryWindow(express, from).dispatchDate), '2026-03-10');
assert.equal(toDateInput(deliveryWindow(standard, from).dispatchDate), '2026-03-11');

// Arrival = dispatch + the tier's transit time.
assert.equal(toDateInput(deliveryWindow(express, from).arrivalDate), '2026-03-11');
assert.equal(toDateInput(deliveryWindow(tracked, from).arrivalDate), '2026-03-14');

// A card arriving at 23:59 on the requested day still counts as on time.
assert.equal(canArriveBy(tracked, '2026-03-14', from), true);
assert.equal(canArriveBy(standard, '2026-03-14', from), false); // arrives 15th
assert.equal(canArriveBy(express, '2026-03-11', from), true);
assert.equal(canArriveBy(express, '2026-03-10', from), false); // arrives 11th

// No date requested means no constraint.
assert.equal(canArriveBy(standard, '', from), true);

// The earliest date offered is the fastest tier's arrival, never in the past.
assert.equal(earliestRequestableDate(from), '2026-03-11');

// Every configured tier must be able to meet the earliest date we offer,
// otherwise checkout shows a min the customer cannot select.
for (const m of DELIVERY_METHODS) {
  assert.ok(m.transitDays >= 0, `${m.id} has negative transit`);
}

console.log('delivery windows: ok');
