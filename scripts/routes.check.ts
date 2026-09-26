// Runnable check for the SPA route map: `node scripts/routes.check.ts` (npm run test).
import { parsePath, routePath, ROUTE_META, type RouteType } from '../src/utils/routes.ts';

let failures = 0;
const eq = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`FAIL ${label}: expected ${e}, got ${a}`);
  }
};

// Unknown / empty paths land on home.
eq('root', parsePath('/', ''), { route: 'home' });
eq('unknown', parsePath('/nope/x', ''), { route: 'home' });
eq('edit without id', parsePath('/edit', ''), { route: 'home' });

// Every route round-trips: state -> path -> state.
const cases: Array<[RouteType, string | undefined]> = [
  ['home', undefined],
  ['browse', undefined],
  ['browse', "Mother's Day"],
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
eq('browse q', parsePath('/browse', '?q=birthday'), { route: 'browse', param: 'birthday' });
eq('account tab', parsePath('/account', '?tab=orders'), { route: 'account', param: 'orders' });

// canonical forms (static hosts must resolve them to the prerendered file)
eq('card path', routePath('card', 'card-001'), '/card/card-001/');
eq('home path', routePath('home'), '/');

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
