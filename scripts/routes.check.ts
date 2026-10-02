// Runnable check for the SPA route map: `node scripts/routes.check.ts` (npm run test).
import {
  parsePath,
  routePath,
  ROUTE_META,
  splitFacet,
  LIST_FACET_KEYS,
  type RouteType,
  type BrowseFacets,
} from '../src/utils/routes.ts';

let failures = 0;
const eq = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`FAIL ${label}: expected ${e}, got ${a}`);
  }
};

const ok = (label: string, condition: boolean) => {
  if (!condition) {
    failures++;
    console.error(`FAIL ${label}`);
  }
};

// Unknown / empty paths: bare root stays home (legacy QR links carry data in the query),
// anything else unknown is a 404.
eq('root', parsePath('/', ''), { route: 'home' });
eq('root with legacy query', parsePath('/', '?design=card-001_1'), { route: 'home' });
eq('unknown path', parsePath('/nope/x', ''), { route: 'notFound' });
eq('unknown card id', parsePath('/card/does-not-exist', ''), { route: 'card', param: 'does-not-exist' });
eq('edit without id', parsePath('/edit', ''), { route: 'home' });
eq('404 path not navigable', routePath('notFound'), '/');

// Every route round-trips: state -> path -> state.
const cases: Array<[RouteType, string | undefined]> = [
  ['home', undefined],
  ['browse', undefined],
  ['card', 'card-001'],
  ['editor', 'card-042'],
  ['cart', undefined],
  ['checkout', undefined],
  ['checkoutSuccess', undefined],
  ['favorites', undefined],
  ['account', 'designs'],
  ['account', 'orders'],
  ['admin', undefined],
];
for (const [route, param] of cases) {
  const [pathname, query] = routePath(route, param).split('?');
  eq(`round-trip ${route}/${param ?? ''}`, parsePath(pathname, query ? `?${query}` : ''), {
    route,
    param: route === 'account' ? param ?? 'designs' : param,
  });
}

// query string parsing: browse search term and account tab
eq('browse q', parsePath('/browse', '?q=birthday'), {
  route: 'browse',
  param: 'birthday',
  facets: { q: 'birthday' },
});
eq('account tab', parsePath('/account', '?tab=orders'), { route: 'account', param: 'orders' });

// canonical forms (static hosts must resolve them to the prerendered file)
eq('card path', routePath('card', 'card-001'), '/card/card-001/');
eq('home path', routePath('home'), '/');

// --- browse facets -----------------------------------------------------------
// A search phrase, an occasion, a recipient and a style are separate facets. They
// used to share one `param`, so a Navbar search was interpreted as an occasion
// name, matched nothing, and rendered the empty state.

eq('search facet', parsePath('/browse/', '?q=funny+birthday').facets, { q: 'funny birthday' });
eq('occasion facet', parsePath('/browse/', '?occasion=Birthday').facets, { occasion: 'Birthday' });
eq('recipient facet', parsePath('/browse/', '?recipient=Mum').facets, { recipient: 'Mum' });
eq('style facet', parsePath('/browse/', '?style=Funny').facets, { style: 'Funny' });
eq('photo facet', parsePath('/browse/', '?photo=1').facets, { photoOnly: true });
eq('price facet', parsePath('/browse/', '?maxPrice=4.5').facets, { maxPrice: 4.5 });
eq('min price facet', parsePath('/browse/', '?minPrice=2').facets, { minPrice: 2 });
// Tone and season were stored on every template but had no URL param, so they
// could not be reached or shared.
eq('tone facet', parsePath('/browse/', '?tone=Cheeky').facets, { tone: 'Cheeky' });
eq('season facet', parsePath('/browse/', '?season=autumn').facets, { season: 'autumn' });
eq('colour facet', parsePath('/browse/', '?color=teal').facets, { color: 'teal' });
eq('personalization facet', parsePath('/browse/', '?personalization=photo').facets, {
  personalization: 'photo',
});

// List facets are comma-separated, so a multi-select is one shareable link.
eq('multi-value style facet', parsePath('/browse/', '?style=Cute,Retro').facets, { style: 'Cute,Retro' });
eq('multi-value recipient facet', parsePath('/browse/', '?recipient=Kids,Best Friend').facets, {
  recipient: 'Kids,Best Friend',
});
// Whitespace and duplicates from a hand-edited or pasted URL are cleaned up.
eq('list facets are trimmed and de-duplicated', parsePath('/browse/', '?style=Cute,%20Retro%20,Cute').facets, {
  style: 'Cute,Retro',
});
eq('empty list entries are dropped', parsePath('/browse/', '?style=,Cute,').facets, { style: 'Cute' });
eq('an empty list is not a facet', parsePath('/browse/', '?style=').facets, undefined);
eq('a single value is not comma-wrapped', splitFacet('Cute'), ['Cute']);
eq('splitFacet of nothing is empty', splitFacet(undefined), []);
// `q` is a single free-text phrase, not a list, so it must never be comma-split
// — otherwise searching "mum, dad" silently becomes a filter on two values.
ok('q is not a list facet', !(LIST_FACET_KEYS as readonly string[]).includes('q'));
eq('a comma inside a search phrase is preserved', parsePath('/browse/', '?q=mum%2C+dad').facets, {
  q: 'mum, dad',
});

// A query string with no real facets parses to no facets at all.
eq('photo=0 is not a photo filter', parsePath('/browse/', '?photo=0').facets, undefined);
eq('junk params are ignored', parsePath('/browse/', '?utm_source=twitter&nope=1').facets, undefined);
eq('combined facets', parsePath('/browse/', '?q=mum&occasion=Birthday&style=Funny&photo=1').facets, {
  q: 'mum',
  occasion: 'Birthday',
  style: 'Funny',
  photoOnly: true,
});

// `param` is the search phrase, so a caller that only passes a string still works.
eq('browse param mirrors the search phrase', parsePath('/browse/', '?q=cake').param, 'cake');
eq('browse param is undefined for a category link', parsePath('/browse/', '?occasion=Birthday').param, undefined);

// Facets round-trip through routePath.
const facetCases: BrowseFacets[] = [
  {},
  { q: 'funny birthday' },
  { occasion: "Mother's Day" },
  { recipient: 'Best Friend' },
  { style: 'Funny' },
  { photoOnly: true },
  { maxPrice: 4.5 },
  { minPrice: 2, maxPrice: 6 },
  { tone: 'Cheeky', season: 'autumn' },
  { color: 'teal', personalization: 'photo' },
  { style: 'Cute,Retro', recipient: 'Kids,Best Friend' },
  { q: 'mum', occasion: 'Birthday', style: 'Funny', photoOnly: true, maxPrice: 4.5 },
];
/** Key-order-independent comparison, so a round-trip is judged on values only. */
const canonical = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
};

for (const facets of facetCases) {
  const [pathname, query] = routePath('browse', undefined, facets).split('?');
  // An unfiltered /browse/ carries no facets key at all.
  const expected = Object.keys(facets).length > 0 ? facets : undefined;
  eq(
    `facet round-trip ${JSON.stringify(facets)}`,
    canonical(parsePath(pathname, query ? `?${query}` : '').facets),
    canonical(expected)
  );
}

// A bare param still degrades to a search query, for older call sites.
eq('bare param becomes a search', routePath('browse', 'birthday'), '/browse/?q=birthday');
eq('no facets means a bare browse', routePath('browse'), '/browse/');
eq('facets win over a bare param', routePath('browse', 'ignored', { occasion: 'Wedding' }), '/browse/?occasion=Wedding');

// SEO meta exists for every route
for (const route of Object.keys(ROUTE_META) as RouteType[]) {
  if (!ROUTE_META[route]?.title || !ROUTE_META[route]?.desc) {
    failures++;
    console.error(`FAIL meta for ${route}`);
  }
}

if (failures) {
  throw new Error(`${failures} route check(s) failed`);
}
console.log('routes check: ok');
