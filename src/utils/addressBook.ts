import type { DeliveryAddress } from '../types/user';

const LOCAL_ADDRESSES_KEY = 'cardly_saved_addresses';

/**
 * The address book lives in localStorage, matching designs/favorites/orders.
 * The Firestore user doc is never read back for `savedAddresses` (see
 * authService), so writing only there would lose the book on every reload.
 */
export function getSavedAddresses(): DeliveryAddress[] {
  try {
    const raw = localStorage.getItem(LOCAL_ADDRESSES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupted entry — start clean
  }
  return [];
}

const addressKey = (a: DeliveryAddress) =>
  `${a.name}|${a.line1}|${a.postcode}`.toLowerCase().replace(/\s+/g, ' ').trim();

function persist(list: DeliveryAddress[]): DeliveryAddress[] {
  try {
    localStorage.setItem(LOCAL_ADDRESSES_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Could not save address book:', e);
  }
  return list;
}

/** Adds the address if it is not already in the book; returns the resulting book. */
export function saveAddress(addr: DeliveryAddress): DeliveryAddress[] {
  const list = getSavedAddresses();
  if (list.some((a) => addressKey(a) === addressKey(addr))) return list;
  return persist([...list, { ...addr, isDefault: list.length === 0 }]);
}

export function deleteSavedAddress(id: string): DeliveryAddress[] {
  const next = getSavedAddresses().filter((a) => a.id !== id);
  // Exactly one default, always.
  if (next.length && !next.some((a) => a.isDefault)) next[0].isDefault = true;
  return persist(next);
}
