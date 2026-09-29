import assert from 'node:assert';
import { getSavedAddresses, saveAddress, deleteSavedAddress } from '../src/utils/addressBook.ts';

// Minimal localStorage stand-in so the pure util runs under plain node.
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const addr = (id: string, name: string) => ({
  id,
  name,
  line1: '1 High St',
  city: 'London',
  postcode: 'SW1A 1AA',
  country: 'UK',
});

// First address becomes the default.
assert.equal(saveAddress(addr('a1', 'Sarah Jenkins')).length, 1);
assert.equal(getSavedAddresses()[0].isDefault, true);

// Same person, different generated id -> deduped, not duplicated.
assert.equal(saveAddress(addr('a2', 'sarah  jenkins')).length, 1);

// A genuinely different address is appended and is not default.
const two = saveAddress(addr('a3', 'Bob Smith'));
assert.equal(two.length, 2);
assert.equal(two[1].isDefault, false);

// Deleting the default promotes the survivor, so a default always exists.
const after = deleteSavedAddress('a1');
assert.equal(after.length, 1);
assert.equal(after[0].isDefault, true);

// And it survives a reload, which was the original bug.
assert.equal(getSavedAddresses().length, 1);

console.log('address book: ok');
