import type { UserDesign } from '../types/design';
import type { CardTemplate } from '../types/template';

/**
 * "You made Sam a birthday card last September" — surface past designs whose
 * occasion is coming back round, so the customer does not have to remember.
 *
 * The signal already exists: every design stores the template it came from and
 * the date it was made. A birthday card made 11 months ago is a birthday card
 * that is due again. Milestone templates (turning 40) roll forward a year at a
 * time, so last year's "turning 40" becomes this year's "turning 41".
 */

export interface OccasionReminder {
  design: UserDesign;
  template: CardTemplate;
  /** ISO date of the original design. */
  madeOn: string;
  /** ISO date this occasion next falls due. */
  nextDate: string;
  yearsAgo: number;
  daysUntil: number;
  /** Next milestone age, for templates that have one. */
  nextMilestone?: number;
}

/** How far ahead to look. Long enough to be useful, short enough to feel timely. */
export const REMINDER_WINDOW_DAYS = 45;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days from `now` to `date`, ignoring clock time. */
export const daysUntil = (date: Date, now: Date = new Date()): number => {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
};

/**
 * The same month and day-of-month as `made`, `yearsAhead` years later.
 * Clamped to the last valid day so a 31 Jan design does not land on 3 March.
 */
const addYears = (made: Date, yearsAhead: number): Date => {
  const year = made.getFullYear() + yearsAhead;
  const lastDay = new Date(year, made.getMonth() + 1, 0).getDate();
  return new Date(year, made.getMonth(), Math.min(made.getDate(), lastDay), 12, 0, 0);
};

export function getOccasionReminders(
  designs: UserDesign[],
  lookup: (templateId: string) => CardTemplate | undefined,
  now: Date = new Date()
): OccasionReminder[] {
  const out: OccasionReminder[] = [];

  for (const design of designs) {
    const template = lookup(design.templateId);
    if (!template) continue;

    const made = new Date(design.createdAt);
    if (Number.isNaN(made.getTime())) continue;

    // Find the next anniversary inside the window, walking whole years.
    let chosen: { date: Date; yearsAgo: number } | null = null;
    for (let yearsAgo = 1; yearsAgo <= 25; yearsAgo++) {
      const candidate = addYears(made, yearsAgo);
      const until = daysUntil(candidate, now);
      if (until >= 0 && until <= REMINDER_WINDOW_DAYS) {
        chosen = { date: candidate, yearsAgo };
        break;
      }
      // Past the window and heading further away — stop walking.
      if (until < 0 && addYears(made, yearsAgo + 1) < now) break;
    }
    if (!chosen) continue;

    out.push({
      design,
      template,
      madeOn: made.toISOString(),
      nextDate: chosen.date.toISOString(),
      yearsAgo: chosen.yearsAgo,
      daysUntil: daysUntil(chosen.date, now),
      nextMilestone:
        template.milestoneAge != null ? template.milestoneAge + chosen.yearsAgo : undefined,
    });
  }

  // Soonest first.
  return out.sort((a, b) => a.daysUntil - b.daysUntil);
}
