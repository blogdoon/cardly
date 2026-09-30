// Runnable check for the SPA route map: `node scripts/routes.check.ts` (npm run test).
import { parsePath, routePath, ROUTE_META, type RouteType, type BrowseFacets } from '../src/utils/routes.ts';

let failures = 0;
const eq = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`FAIL ${label}: expected ${e}, got ${a}`);
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
  { q: 'mum', occasion: 'Birthday', style: 'Funny', photoOnly: true, maxPrice: 4.5 },
];
for (const facets of facetCases) {
  const [pathname, query] = routePath('browse', undefined, facets).split('?');
  // An unfiltered /browse/ carries no facets key at all.
  const expected = Object.keys(facets).length > 0 ? facets : undefined;
  eq(
    `facet round-trip ${JSON.stringify(facets)}`,
    parsePath(pathname, query ? `?${query}` : '').facets,
    expected
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
