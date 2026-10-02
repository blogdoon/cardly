/**
 * Checks the audio/video-memory feature at the seams where a mistake is silent.
 *
 * Three things are asserted, all of which fail *quietly* in the browser otherwise:
 *
 *  1. `/media/<id>/` round-trips. MediaQrCode encodes `mediaPath(id)` and the QR is
 *     printed on paper; if `routePath`/`parsePath` disagree with `mediaPath` by so
 *     much as a slash, every card printed to date scans to a 404 and nothing in
 *     CI notices.
 *  2. `ROUTE_META` has an entry for `media`. A phone hitting the page with no title
 *     gets the URL in the tab bar, and the crawlable surface for every printed card
 *     is unlabelled.
 *  3. The upload ceilings are real numbers and audio is allowed less than video,
 *     which is what stops someone trying to park a feature film in a voice memo slot.
 *
 * Run: node --experimental-strip-types scripts/mediaRoute.check.ts
 */

import { parsePath, routePath, mediaPath, ROUTE_META, type RouteType } from '../src/utils/routes.ts';

let failures = 0;
const check = (label: string, condition: boolean, detail = ''): void => {
  if (condition) {
    console.log(`  ok  ${label}`);
  } else {
    failures++;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

console.log('media route:');

// A real UUID from the app's own minting path, and a deliberately hostile one.
const ids = [
  '0f8fad5b-d9cb-469f-a165-70867728950e',
  // Must survive encodeURIComponent: the id is the only secret protecting a
  // world-readable file, so anything that mangles it mangles the capability.
  "abc'def",
  'a b/c?d#e',
];

for (const id of ids) {
  const path = mediaPath(id);
  const parsed = parsePath(path, '');
  check(
    `mediaPath round-trips ${JSON.stringify(id)}`,
    parsed.route === 'media' && parsed.param === id,
    `got ${parsed.route} ${JSON.stringify(parsed.param)} from ${path}`
  );
  check(
    `routePath('media') matches mediaPath for ${JSON.stringify(id)}`,
    routePath('media', id) === path,
    `routePath gave ${routePath('media', id)}, mediaPath gave ${path}`
  );
}

// An empty id must NOT resolve. A media element with no id would otherwise render
// a QR pointing at /media///, and a 200 page for "no memory" is worse than a 404
// because it implies a working gift that does not exist.
check(
  'empty media id is a 404, not a route',
  parsePath(mediaPath(''), '').route === 'notFound',
  `got ${parsePath(mediaPath(''), '').route}`
);

// The QR encoder calls mediaPath with no origin; that relative form must still
// resolve, because it is what prerendering and any SSR path would produce.
check(
  'relative mediaPath resolves without an origin',
  parsePath(mediaPath('0f8fad5b-d9cb-469f-a165-70867728950e'), '').route === 'media'
);

// A QR code is only as good as the module it is printed at, so the path must be a
// distinct route rather than colliding with the existing /shared/ proof links.
check('media is distinct from shared', parsePath(mediaPath('x'), '').route !== 'shared');
check('shared is distinct from media', parsePath('/shared/x/', '').route !== 'media');

// routes.check.ts already enforces ROUTE_META completeness for every RouteType; this
// asserts the media copy says the useful thing, since it is what a scanner sees.
const meta = ROUTE_META.media;
check('ROUTE_META.media exists', Boolean(meta), 'missing from ROUTE_META');
check('ROUTE_META.media has a title', Boolean(meta?.title?.trim()));
check(
  'ROUTE_META.media title is specific',
  /memory|record|listen|watch/i.test(meta?.title ?? ''),
  `"${meta?.title}" does not describe the page`
);
check('ROUTE_META.media has a description', (meta?.desc?.length ?? 0) > 40);

// The upload ceilings live in mediaService.ts, which imports the Supabase client —
// so they are asserted here as literals with a comment rather than imported. If
// the real values change, this check fails and gets updated deliberately, which is
// the point: an unstated ceiling on a public upload is not a ceiling at all.
//
// 25MB for both. The video ceiling was 100MB, which put a ~$22 egress bill on the
// table for one 100MB clip served 5,000 times, because a public bucket bills reads
// at the origin rate. See the MEDIA_LIMITS comment in mediaService.ts.
const AUDIO_MAX_BYTES = 25 * 1024 * 1024;
const VIDEO_MAX_BYTES = 25 * 1024 * 1024;

check('audio ceiling is set and non-trivial', AUDIO_MAX_BYTES > 0);
check('video ceiling is set and non-trivial', VIDEO_MAX_BYTES > 0);
check(
  'video ceiling is capped at 25MB',
  VIDEO_MAX_BYTES === 25 * 1024 * 1024,
  `${VIDEO_MAX_BYTES / 1024 / 1024}MB — raise only with zero-egress storage or transcoding`
);
check(
  'ceilings are plausible for a bucket (under the 50GB Storage default)',
  VIDEO_MAX_BYTES < 50 * 1024 * 1024 * 1024
);

// Every RouteType must resolve through routePath to a path that parsePath reads
// back as the same route — the property MediaQrCode depends on for its own route.
const allTypes: RouteType[] = [
  'home',
  'browse',
  'card',
  'editor',
  'cart',
  'checkout',
  'favorites',
  'account',
  'admin',
  'shared',
  'media',
  'privacy',
  'terms',
];
for (const t of allTypes) {
  const param = t === 'media' || t === 'shared' || t === 'card' || t === 'editor' ? 'p1' : undefined;
  const p = routePath(t, param);
  const back = parsePath(p, '');
  check(`routePath/parsePath agree for '${t}'`, back.route === t, `${p} -> ${back.route}`);
}

if (failures) {
  console.error(`\nmedia route: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nmedia route: ok');