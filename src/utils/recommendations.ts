import { CardTemplate } from '../types/template';
import { getLiveCatalog } from '../data/templates';
import { getRecentlyViewed } from '../services/cardStorage';

export function getRecommendationsForTemplate(current: CardTemplate, limit = 6): CardTemplate[] {
  const scored = getLiveCatalog().filter((t) => t.id !== current.id).map((t) => {
    let score = 0;
    // Same category gives +5 points
    if (t.category === current.category) score += 5;
    // Shared recipients give +4 points (both are now arrays, so a card listed
    // for a "Friend" and a "Best Friend" scores against either).
    const sharedRecipients = t.recipients.filter((r) => current.recipients.includes(r));
    score += sharedRecipients.length > 0 ? 4 : 0;
    // Shared styles give +3 points
    const sharedStyles = t.styles.filter((s) => current.styles.includes(s));
    score += sharedStyles.length > 0 ? 3 : 0;
    // Same tone gives +2 points
    if (t.tone === current.tone) score += 2;
    // Common tags
    const commonTags = t.tags.filter((tag) => current.tags.includes(tag));
    score += commonTags.length * 1.5;

    return { template: t, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.template);
}

export function getPersonalizedFeed(favorites: string[], limit = 8): CardTemplate[] {
  const recentIds = getRecentlyViewed();
  const interestedIds = Array.from(new Set([...favorites, ...recentIds]));

  if (interestedIds.length === 0) {
    return getLiveCatalog().filter((t) => t.isPopular).slice(0, limit);
  }

  // Find preferred categories and recipients
  const preferredTemplates = getLiveCatalog().filter((t) => interestedIds.includes(t.id));
  const categoryFreq: Record<string, number> = {};
  const recipientFreq: Record<string, number> = {};

  preferredTemplates.forEach((t) => {
    categoryFreq[t.category] = (categoryFreq[t.category] || 0) + 1;
    // Every listed recipient contributes, so a card tagged for several people
    // is recommended to each of them.
    t.recipients.forEach((r) => {
      recipientFreq[r] = (recipientFreq[r] || 0) + 1;
    });
  });

  const scored = getLiveCatalog().filter((t) => !interestedIds.includes(t.id)).map((t) => {
    const catScore = (categoryFreq[t.category] || 0) * 3;
    // Best-matching recipient counts, not "any overlap", so a card listed for
    // one specific person is not boosted as much as a broadly-usable one.
    const recScore = t.recipients.reduce(
      (max, r) => Math.max(max, recipientFreq[r] || 0),
      0
    ) * 2;
    const popBonus = t.isBestSeller ? 2 : t.isPopular ? 1 : 0;
    return { template: t, score: catScore + recScore + popBonus };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.template);
}
