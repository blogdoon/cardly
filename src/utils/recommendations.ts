import { CardTemplate } from '../types/template';
import { ALL_TEMPLATES } from '../data/templates';
import { getRecentlyViewed } from '../services/cardStorage';

export function getRecommendationsForTemplate(current: CardTemplate, limit = 6): CardTemplate[] {
  const scored = ALL_TEMPLATES.filter((t) => t.id !== current.id).map((t) => {
    let score = 0;
    // Same category gives +5 points
    if (t.category === current.category) score += 5;
    // Same recipient gives +4 points
    if (t.recipient === current.recipient) score += 4;
    // Same style gives +3 points
    if (t.style === current.style) score += 3;
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
    return ALL_TEMPLATES.filter((t) => t.isPopular).slice(0, limit);
  }

  // Find preferred categories and recipients
  const preferredTemplates = ALL_TEMPLATES.filter((t) => interestedIds.includes(t.id));
  const categoryFreq: Record<string, number> = {};
  const recipientFreq: Record<string, number> = {};

  preferredTemplates.forEach((t) => {
    categoryFreq[t.category] = (categoryFreq[t.category] || 0) + 1;
    recipientFreq[t.recipient] = (recipientFreq[t.recipient] || 0) + 1;
  });

  const scored = ALL_TEMPLATES.filter((t) => !interestedIds.includes(t.id)).map((t) => {
    const catScore = (categoryFreq[t.category] || 0) * 3;
    const recScore = (recipientFreq[t.recipient] || 0) * 2;
    const popBonus = t.isBestSeller ? 2 : t.isPopular ? 1 : 0;
    return { template: t, score: catScore + recScore + popBonus };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.template);
}
