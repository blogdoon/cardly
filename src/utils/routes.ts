export type RouteType =
  | 'home'
  | 'browse'
  | 'card'
  | 'editor'
  | 'cart'
  | 'checkout'
  | 'favorites'
  | 'account'
  | 'admin'
  | 'shared'
  | 'privacy'
  | 'terms'
  | 'notFound';

/**
 * Filter state carried in the query string on /browse/.
 *
 * Every facet gets its own key. Previously the whole thing was funnelled through
 * a single `param`, so a free-text search ("funny birthday"), an occasion
 * ("Birthday"), a recipient ("Mum") and a style ("Funny") were indistinguishable
 * — Browse treated a search phrase as an occasion name, matched nothing, and
 * showed the empty state. Typed keys make each link mean what it says and make
 * the browse state shareable.
 */
export interface BrowseFacets {
  q?: string;
  occasion?: string;
  recipient?: string;
  style?: string;
  photoOnly?: boolean;
  maxPrice?: number;
}

const FACET_KEYS = ['q', 'occasion', 'recipient', 'style'] as const;

/** Read browse facets out of a query string, ignoring anything unrecognised. */
export function parseFacets(search: string): BrowseFacets {
  const params = new URLSearchParams(search);
  const facets: BrowseFacets = {};
  for (const key of FACET_KEYS) {
    const value = params.get(key);
    if (value) facets[key] = value;
  }
  if (params.get('photo') === '1') facets.photoOnly = true;
  const maxPrice = Number(params.get('maxPrice'));
  if (Number.isFinite(maxPrice) && maxPrice > 0) facets.maxPrice = maxPrice;
  return facets;
}

// URL <-> route mapping. Real paths so crawlers (and the back button) see one URL per page.
// Legacy QR links (/?design=…, /?card=…) are rewritten to these in App's deep-link effect.
export function parsePath(
  pathname: string,
  search: string
): { route: RouteType; param?: string; facets?: BrowseFacets } {
  const seg = pathname.split('/').filter(Boolean);
  const q = new URLSearchParams(search);
  switch (seg[0]) {
    case 'browse': {
      // `param` stays the search phrase, for anything that still reads it.
      const facets = parseFacets(search);
      // Omit the key entirely when unfiltered, so a bare /browse/ parses to the
      // same shape as before.
      return Object.keys(facets).length > 0
        ? { route: 'browse', param: facets.q, facets }
        : { route: 'browse' };
    }
    case 'card':
      return seg[1] ? { route: 'card', param: decodeURIComponent(seg[1]) } : { route: 'browse' };
    case 'edit':
      return seg[1] ? { route: 'editor', param: decodeURIComponent(seg[1]) } : { route: 'home' };
    case 'cart':
      return { route: 'cart' };
    case 'checkout':
      return { route: 'checkout' };
    case 'favorites':
      return { route: 'favorites' };
    case 'account':
      return { route: 'account', param: q.get('tab') || 'designs' };
    case 'admin':
      return { route: 'admin' };
    case 'shared':
      return seg[1] ? { route: 'shared', param: decodeURIComponent(seg[1]) } : { route: 'notFound' };
    case 'privacy':
      return { route: 'privacy' };
    case 'terms':
      return { route: 'terms' };
    default:
      // Bare root stays home (legacy QR links carry their payload in the query string);
      // any other unknown path is a real 404.
      return { route: seg.length === 0 ? 'home' : 'notFound' };
  }
}

/** Build a `/browse/?…` query string from facets, omitting anything unset. */
export function facetsQuery(facets?: BrowseFacets): string {
  if (!facets) return '';
  const params = new URLSearchParams();
  for (const key of FACET_KEYS) {
    const value = facets[key];
    if (value) params.set(key, value);
  }
  if (facets.photoOnly) params.set('photo', '1');
  if (facets.maxPrice) params.set('maxPrice', String(facets.maxPrice));
  const query = params.toString();
  return query ? `?${query}` : '';
}

// Trailing slashes on non-root paths: static hosts serve `dist/<path>/index.html`
// (the prerendered template pages) for those, and SPA fallback covers the rest.
export function routePath(route: RouteType, param?: string, facets?: BrowseFacets): string {
  switch (route) {
    case 'home':
      return '/';
    case 'browse':
      // A bare `param` is still treated as a search phrase, so callers that only
      // pass a string keep working.
      return `/browse/${facetsQuery(facets) || (param ? `?q=${encodeURIComponent(param)}` : '')}`;
    case 'card':
      return `/card/${encodeURIComponent(param ?? '')}/`;
    case 'editor':
      return `/edit/${encodeURIComponent(param ?? '')}/`;
    case 'account':
      return param && param !== 'designs' ? `/account/?tab=${encodeURIComponent(param)}` : '/account/';
    case 'shared':
      return `/shared/${encodeURIComponent(param ?? '')}/`;
    case 'notFound':
      return '/';
    default:
      return `/${route}/`;
  }
}

export const DEFAULT_DESCRIPTION =
  'Create, personalize, and send custom greeting cards for birthdays, celebrations, holidays, and every special moment.';

export const ROUTE_META: Record<RouteType, { title: string; desc: string }> = {
  home: { title: 'Cardly - Personalized Greeting Cards', desc: DEFAULT_DESCRIPTION },
  browse: {
    title: 'Browse Greeting Card Templates | Cardly',
    desc: 'Explore birthday, wedding, thank you and hundreds more card designs, then personalise one in minutes.',
  },
  card: { title: 'Greeting Card Template | Cardly', desc: DEFAULT_DESCRIPTION },
  editor: { title: 'Personalise Your Card | Cardly', desc: DEFAULT_DESCRIPTION },
  cart: { title: 'Your Basket | Cardly', desc: DEFAULT_DESCRIPTION },
  checkout: { title: 'Checkout | Cardly', desc: DEFAULT_DESCRIPTION },
  favorites: { title: 'Your Favourite Cards | Cardly', desc: DEFAULT_DESCRIPTION },
  account: { title: 'My Account | Cardly', desc: DEFAULT_DESCRIPTION },
  admin: { title: 'Admin | Cardly', desc: DEFAULT_DESCRIPTION },
  shared: {
    title: 'A Card Made For You | Cardly',
    desc: 'Somebody made this greeting card for you. Take a look before it goes to print.',
  },
  privacy: {
    title: 'Privacy Policy | Cardly',
    desc: 'How Cardly collects, uses and protects your personal data, including the processors we rely on and the rights you have over it.',
  },
  terms: {
    title: 'Terms & Conditions | Cardly',
    desc: 'The terms that apply when you order personalised greeting cards from Cardly, including pricing, delivery estimates and print tolerances.',
  },
  notFound: {
    title: 'Page Not Found | Cardly',
    desc: 'This page could not be found. Browse personalised greeting cards instead.',
  },
};
