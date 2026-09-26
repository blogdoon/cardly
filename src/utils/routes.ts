export type RouteType =
  | 'home'
  | 'browse'
  | 'card'
  | 'editor'
  | 'cart'
  | 'checkout'
  | 'favorites'
  | 'account'
  | 'admin';

// URL <-> route mapping. Real paths so crawlers (and the back button) see one URL per page.
// Legacy QR links (/?design=…, /?card=…) are rewritten to these in App's deep-link effect.
export function parsePath(pathname: string, search: string): { route: RouteType; param?: string } {
  const seg = pathname.split('/').filter(Boolean);
  const q = new URLSearchParams(search);
  switch (seg[0]) {
    case 'browse':
      return { route: 'browse', param: q.get('q') || undefined };
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
    default:
      return { route: 'home' };
  }
}

// Trailing slashes on non-root paths: static hosts serve `dist/<path>/index.html`
// (the prerendered template pages) for those, and SPA fallback covers the rest.
export function routePath(route: RouteType, param?: string): string {
  switch (route) {
    case 'home':
      return '/';
    case 'browse':
      return param ? `/browse/?q=${encodeURIComponent(param)}` : '/browse/';
    case 'card':
      return `/card/${encodeURIComponent(param ?? '')}/`;
    case 'editor':
      return `/edit/${encodeURIComponent(param ?? '')}/`;
    case 'account':
      return param && param !== 'designs' ? `/account/?tab=${encodeURIComponent(param)}` : '/account/';
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
};
