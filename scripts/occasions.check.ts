import assert from 'node:assert';
import { getOccasionReminders, daysUntil } from '../src/utils/occasions.ts';
import type { OccasionReminder } from '../src/utils/occasions.ts';
import type { UserDesign } from '../src/types/design.ts';
import type { CardTemplate } from '../src/types/template.ts';

const design = (id: string, createdAt: string, templateId = 't1'): UserDesign =>
  ({
    id,
    templateId,
    title: 'Birthday',
    pages: {},
    createdAt,
    updatedAt: createdAt,
  }) as unknown as UserDesign;

const template = (id: string, milestoneAge?: number): CardTemplate =>
  ({ id, title: 'Birthday', milestoneAge } as unknown as CardTemplate);

const lookupFor = (t?: CardTemplate) => () => t;

// All arithmetic is whole-day and local, so a time of day must not move a result.
const now = new Date(2026, 5, 1, 16, 30); // 1 Jun 2026

assert.equal(daysUntil(new Date(2026, 7, 14), now), 74); // 14 Aug, months away
assert.equal(daysUntil(new Date(2026, 3, 20), now), -42); // 20 Apr, already past

// Made 5 Jun 2025 -> due 5 Jun 2026, four days out: inside the window.
const soon = getOccasionReminders(
  [design('a', '2025-06-05T10:00:00Z')],
  lookupFor(template('t1')),
  now
);
assert.equal(soon.length, 1);
assert.equal(soon[0].daysUntil, 4);
assert.equal(soon[0].yearsAgo, 1);

// Made Mar 2025: the Mar 2026 date has passed and Mar 2027 is far off. Must not fire.
assert.equal(
  getOccasionReminders([design('b', '2025-03-10T10:00:00Z')], lookupFor(template('t1')), now).length,
  0
);

// Made Jun 2024: 2025 has passed, so it walks the year boundary to 2026-06-02.
const twoYears = getOccasionReminders(
  [design('c', '2024-06-02T10:00:00Z')],
  lookupFor(template('t1')),
  now
);
assert.equal(twoYears.length, 1);
assert.equal(twoYears[0].yearsAgo, 2);
assert.equal(twoYears[0].daysUntil, 1);

// Milestones roll forward: made for a 40th last year -> the 41st is next.
const milestone = getOccasionReminders(
  [design('d', '2025-06-20T10:00:00Z')],
  lookupFor(template('t1', 40)),
  now
);
assert.equal(milestone.length, 1);
assert.equal(milestone[0].nextMilestone, 41);

// 29 Feb must clamp to 28 Feb rather than rolling into March.
const leap = getOccasionReminders(
  [design('e', '2024-02-29T10:00:00Z')],
  lookupFor(template('t1')),
  new Date(2025, 0, 20, 9, 0, 0)
);
assert.equal(leap.length, 1);
assert.equal(new Date(leap[0].nextDate).getMonth(), 1);
assert.equal(new Date(leap[0].nextDate).getDate(), 28);

// A template deleted from the catalog is skipped, not crashed on.
assert.equal(
  getOccasionReminders([design('f', '2025-06-05T10:00:00Z')], () => undefined, now).length,
  0
);

// An unparseable createdAt is skipped.
assert.equal(
  getOccasionReminders([design('g', 'nonsense')], lookupFor(template('t1')), now).length,
  0
);

// Sorted soonest first: today, then in 19 days.
const many: OccasionReminder[] = getOccasionReminders(
  [design('y', '2025-06-20T10:00:00Z'), design('x', '2025-06-01T10:00:00Z')],
  lookupFor(template('t1')),
  now
);
assert.equal(many.length, 2);
assert.equal(many[0].daysUntil, 0);
assert.equal(many[1].daysUntil, 19);

console.log('occasion reminders: ok');
