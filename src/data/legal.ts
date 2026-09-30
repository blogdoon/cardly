/**
 * Privacy Policy and Terms of Service content.
 *
 * The copy lives in `legal.json` so the build-time prerenderer (scripts/prerender.mjs)
 * can emit the same text into the static HTML that Google indexes — crawlers do not
 * run React, so a component-only policy would be invisible to them.
 *
 * !! DRAFT — NOT LEGAL ADVICE. Every [BRACKETED] value is a placeholder that must be
 * filled in before launch, and both documents need review by a lawyer for the
 * jurisdiction Cardly sells in. Payment providers and card networks will not onboard
 * an account without a published privacy policy, so this file is a hard prerequisite
 * for taking money. If you change the data flows, change this file in the same commit.
 */

import data from './legal.json';

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDoc {
  title: string;
  description: string;
  intro: string;
  sections: LegalSection[];
}

export type LegalRoute = 'privacy' | 'terms';

export const LEGAL_LAST_UPDATED: string = data.lastUpdated;
export const LEGAL_DOCS = data.docs as Record<LegalRoute, LegalDoc>;
