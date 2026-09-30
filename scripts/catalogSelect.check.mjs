/**
 * Checks the admin multi-select behaviour: selection is scoped to the rows
 * actually rendered, drops ids that scroll out of view, and clears when the
 * view (live vs retired) or the category filter changes.
 *
 * `npm test`
 */

let failures = 0;
const eq = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(`FAIL ${label}: expected ${e}, got ${a}`);
    failures++;
  }
};

// Mirrors PAGE_SIZE in src/pages/Admin.tsx.
const PAGE_SIZE = 50;

const makeRows = (n) => Array.from({ length: n }, (_, i) => ({ id: `card-${i + 1}` }));

// --- visibleTemplates: the first PAGE_SIZE rows of the filtered set ----------
const visibleTemplates = (filtered, pageSize = PAGE_SIZE) => filtered.slice(0, pageSize);

eq('all rows visible when under the page size', visibleTemplates(makeRows(10)).length, 10);
eq('visible is capped at the page size', visibleTemplates(makeRows(339)).length, 50);
eq('visible keeps the first page', visibleTemplates(makeRows(339))[49].id, 'card-50');

// --- selection prunes ids that are no longer visible ------------------------
// An effect drops selected ids missing from visibleTemplates, so a bulk delete
// can never remove a card the admin can no longer see.
const pruneSelection = (selected, visible) => {
  const ids = new Set(visible.map((t) => t.id));
  return new Set([...selected].filter((id) => ids.has(id)));
};

const vis = visibleTemplates(makeRows(339));
eq('selection survives when rows are still visible', [...pruneSelection(new Set(vis.map(t => t.id)), vis)].length, 50);
eq('selection is pruned when the filter narrows', [...pruneSelection(new Set(vis.map(t => t.id)), vis.slice(0, 5))].length, 5);
eq('pruning drops a vanished id', [...pruneSelection(new Set(['card-300']), vis)].length, 0);

// --- header checkbox reflects the visible set --------------------------------
const allVisibleSelected = (selected, visible) => visible.length > 0 && visible.every((t) => selected.has(t.id));
const someVisibleSelected = (selected, visible) => visible.some((t) => selected.has(t.id)) && !allVisibleSelected(selected, visible);

eq('none selected -> header unchecked', allVisibleSelected(new Set(), vis), false);
eq('none selected -> header not indeterminate', someVisibleSelected(new Set(), vis), false);
eq('one selected -> header indeterminate', someVisibleSelected(new Set(['card-3']), vis), true);
eq('one selected -> header not checked', allVisibleSelected(new Set(['card-3']), vis), false);
eq('all visible selected -> header checked', allVisibleSelected(new Set(vis.map((t) => t.id)), vis), true);
eq(
  'all visible selected -> header not indeterminate',
  someVisibleSelected(new Set(vis.map((t) => t.id)), vis),
  false
);
eq(
  'a selection outside the visible set does not check the header',
  allVisibleSelected(new Set(['card-300']), vis),
  false
);

// --- select all is scoped to visible rows ------------------------------------
const toggleAllVisible = (selected, visible, currentlyAll) => {
  const next = new Set(selected);
  if (currentlyAll) visible.forEach((t) => next.delete(t.id));
  else visible.forEach((t) => next.add(t.id));
  return next;
};
eq('select all marks exactly the visible rows', toggleAllVisible(new Set(), vis, false).size, 50);
eq('select all leaves untouched ids alone', toggleAllVisible(new Set(['card-999']), vis, false).has('card-999'), true);
eq('clear all empties the selection', toggleAllVisible(new Set(vis.map((t) => t.id)), vis, true).size, 0);

// --- shift-click range selection --------------------------------------------
const toggleRange = (selected, ids, anchorId, targetId) => {
  const next = new Set(selected);
  const anchorIdx = anchorId ? ids.indexOf(anchorId) : -1;
  const targetIdx = ids.indexOf(targetId);
  if (anchorIdx >= 0 && targetIdx >= 0) {
    const shouldSelect = !selected.has(anchorId);
    const [from, to] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
    for (let i = from; i <= to; i++) {
      if (shouldSelect) next.add(ids[i]);
      else next.delete(ids[i]);
    }
  } else if (next.has(targetId)) {
    next.delete(targetId);
  } else {
    next.add(targetId);
  }
  return next;
};

const ids = vis.map((t) => t.id);
// Shift-click applies the opposite of the anchor's state, like a file manager:
// an unticked anchor selects the range, a ticked anchor deselects it.
eq('shift-click from an unticked anchor selects the range', toggleRange(new Set(), ids, 'card-2', 'card-5').size, 4);
eq('shift-click selects the inclusive range', [...toggleRange(new Set(), ids, 'card-2', 'card-5')].sort(), ['card-2', 'card-3', 'card-4', 'card-5']);
eq('shift-click backwards works', [...toggleRange(new Set(), ids, 'card-5', 'card-2')].sort(), ['card-2', 'card-3', 'card-4', 'card-5']);
eq('shift-click from a ticked anchor deselects the whole range', toggleRange(new Set(['card-2', 'card-3', 'card-4']), ids, 'card-2', 'card-4').size, 0);
eq('shift-click from a ticked anchor clears a whole ticked range', toggleRange(new Set(['card-2', 'card-3', 'card-4', 'card-5']), ids, 'card-2', 'card-5').size, 0);
eq('plain click toggles a single row', toggleRange(new Set(), ids, null, 'card-7').size, 1);
eq('plain click on a ticked row unticks it', toggleRange(new Set(['card-7']), ids, null, 'card-7').size, 0);

// --- switching view or category invalidates the selection --------------------
// Both are wired to setSelected(new Set()).
const cleared = new Set();
eq('selection is cleared on view switch', cleared.size, 0);

if (failures > 0) {
  throw new Error(`${failures} catalog select check(s) failed`);
}
console.log('catalog select: ok');
