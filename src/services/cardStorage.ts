import { doc, setDoc, getDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth, isFirebaseConfigured } from './firebase';
import { UserDesign } from '../types/design';
import { Order } from '../types/order';
import { handleFirestoreError, OperationType } from './firestoreErrors';
import { optimizeImageFile, getCardDesignThumbnail } from '../utils/imageOptimizer';

const LOCAL_DESIGNS_KEY = 'cardly_user_designs';
const LOCAL_FAVORITES_KEY = 'cardly_user_favorites';
const LOCAL_ORDERS_KEY = 'cardly_user_orders';
const LOCAL_RECENT_KEY = 'cardly_recently_viewed';

/**
 * Safely persists designs to localStorage with quota-management fallbacks
 */
function safeSetLocalDesigns(designs: UserDesign[]): void {
  try {
    localStorage.setItem(LOCAL_DESIGNS_KEY, JSON.stringify(designs));
  } catch (err) {
    console.warn('LocalStorage save failed (quota exceeded?), attempting to prune cache:', err);
    try {
      // Keep only 8 most recent designs to reclaim quota
      const pruned = designs.slice(0, 8);
      localStorage.setItem(LOCAL_DESIGNS_KEY, JSON.stringify(pruned));
    } catch (err2) {
      console.warn('LocalStorage prune failed, attempting minimal cache:', err2);
      try {
        const minimal = designs.slice(0, 2);
        localStorage.setItem(LOCAL_DESIGNS_KEY, JSON.stringify(minimal));
      } catch (err3) {
        console.warn('LocalStorage entirely unavailable for designs:', err3);
      }
    }
  }
}

/**
 * Recursively removes undefined fields from an object so that Firestore
 * never throws "Unsupported field value: undefined".
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === undefined) return null as any;
  return JSON.parse(JSON.stringify(data));
}

/**
 * Check if the user is genuinely authenticated in Firebase and matches the target userId
 */
function isAuthUser(userId?: string): boolean {
  return Boolean(
    isFirebaseConfigured &&
    db &&
    auth?.currentUser &&
    userId &&
    auth.currentUser.uid === userId
  );
}

// ======================== DESIGNS ========================

export async function saveUserDesign(design: UserDesign): Promise<void> {
  // If currentUser is logged in, ensure design.userId matches auth UID
  const currentAuthUid = auth?.currentUser?.uid;
  if (currentAuthUid && design.userId !== currentAuthUid && (!design.userId || design.userId === 'guest_user')) {
    design = { ...design, userId: currentAuthUid };
  }

  // Ensure previewThumbnail reflects any customized or uploaded photos
  const effectiveThumbnail = getCardDesignThumbnail(design.pages, design.previewThumbnail);
  if (effectiveThumbnail) {
    design = { ...design, previewThumbnail: effectiveThumbnail };
  }

  // Clean design to strip undefined properties (crucial for Firestore and localStorage)
  const cleanedDesign: UserDesign = cleanForFirestore(design);

  // Always persist locally first so user never loses edits
  const existing = getLocalDesigns();
  const index = existing.findIndex((d) => d.id === cleanedDesign.id);
  if (index >= 0) {
    existing[index] = cleanedDesign;
  } else {
    existing.unshift(cleanedDesign);
  }
  safeSetLocalDesigns(existing);

  // Also remember this active draft for the template
  saveActiveDraftId(cleanedDesign.templateId, cleanedDesign.id);

  // Sync to Firestore if authenticated & authorized
  if (isAuthUser(cleanedDesign.userId)) {
    const designPath = `users/${cleanedDesign.userId}/designs/${cleanedDesign.id}`;
    try {
      const designRef = doc(db, 'users', cleanedDesign.userId, 'designs', cleanedDesign.id);
      await setDoc(designRef, cleanForFirestore({
        id: cleanedDesign.id,
        templateId: cleanedDesign.templateId,
        userId: cleanedDesign.userId,
        title: cleanedDesign.title,
        pages: cleanedDesign.pages,
        previewThumbnail: cleanedDesign.previewThumbnail || '',
        createdAt: cleanedDesign.createdAt,
        updatedAt: new Date().toISOString(),
      }));
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        handleFirestoreError(e, OperationType.WRITE, designPath);
      }
      console.warn('Firestore design save warning:', e);
    }
  }
}

export async function getDesignById(designId: string, userId?: string): Promise<UserDesign | null> {
  const effectiveUserId = userId || auth?.currentUser?.uid;

  // Retrieve cached local version first
  const localList = getLocalDesigns();
  const localDesign = localList.find((d) => d.id === designId) || null;

  // Try Firestore first if authenticated
  if (isAuthUser(effectiveUserId) && effectiveUserId) {
    const designPath = `users/${effectiveUserId}/designs/${designId}`;
    try {
      const designRef = doc(db, 'users', effectiveUserId, 'designs', designId);
      const snap = await getDoc(designRef);
      if (snap.exists()) {
        const remoteData = snap.data() as UserDesign;

        // If local version exists and has newer updatedAt than remote, keep local edits
        if (localDesign) {
          const localTime = new Date(localDesign.updatedAt || localDesign.createdAt || 0).getTime();
          const remoteTime = new Date(remoteData.updatedAt || remoteData.createdAt || 0).getTime();
          if (localTime > remoteTime) {
            return localDesign;
          }
        }

        // Merge into local cache safely
        const idx = localList.findIndex((d) => d.id === designId);
        if (idx >= 0) localList[idx] = remoteData;
        else localList.unshift(remoteData);
        safeSetLocalDesigns(localList);
        return remoteData;
      }
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        handleFirestoreError(e, OperationType.GET, designPath);
      }
      console.warn('Firestore getDesignById warning:', e);
    }
  }

  // Fallback to local storage
  return localDesign;
}

export function saveActiveDraftId(templateId: string, designId: string): void {
  try {
    localStorage.setItem(`cardly_active_draft_${templateId}`, designId);
  } catch (e) {
    console.warn(e);
  }
}

export function getActiveDraftId(templateId: string): string | null {
  try {
    return localStorage.getItem(`cardly_active_draft_${templateId}`);
  } catch {
    return null;
  }
}

export function clearActiveDraftId(templateId: string): void {
  try {
    localStorage.removeItem(`cardly_active_draft_${templateId}`);
  } catch (e) {
    console.warn(e);
  }
}

export async function getUserDesigns(userId?: string): Promise<UserDesign[]> {
  const localList = getLocalDesigns();
  
  // Only query Firestore if authenticated with matching UID
  if (!isAuthUser(userId) || !userId) {
    return localList;
  }

  const colPath = `users/${userId}/designs`;
  try {
    const colRef = collection(db, 'users', userId, 'designs');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const remoteList: UserDesign[] = [];
      snap.forEach((d) => remoteList.push(d.data() as UserDesign));

      // Merge remote & local designs by ID, preferring whichever version has the newer timestamp
      const mergedMap = new Map<string, UserDesign>();
      remoteList.forEach((d) => mergedMap.set(d.id, d));
      localList.forEach((localD) => {
        const remoteD = mergedMap.get(localD.id);
        if (!remoteD) {
          mergedMap.set(localD.id, localD);
        } else {
          const localTime = new Date(localD.updatedAt || localD.createdAt || 0).getTime();
          const remoteTime = new Date(remoteD.updatedAt || remoteD.createdAt || 0).getTime();
          if (localTime >= remoteTime) {
            mergedMap.set(localD.id, localD);
          }
        }
      });
      return Array.from(mergedMap.values());
    }
  } catch (e: any) {
    if (e?.code === 'permission-denied') {
      handleFirestoreError(e, OperationType.LIST, colPath);
    }
    console.warn('Firestore fetch designs warning:', e);
  }
  return localList;
}

export async function deleteUserDesign(designId: string, userId?: string): Promise<void> {
  const existing = getLocalDesigns().filter((d) => d.id !== designId);
  safeSetLocalDesigns(existing);

  if (isAuthUser(userId) && userId) {
    const docPath = `users/${userId}/designs/${designId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'designs', designId));
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        handleFirestoreError(e, OperationType.DELETE, docPath);
      }
      console.warn('Firestore delete design warning:', e);
    }
  }
}

export function getLocalDesigns(): UserDesign[] {
  try {
    const raw = localStorage.getItem(LOCAL_DESIGNS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ======================== FAVORITES ========================

export function getLocalFavorites(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_FAVORITES_KEY);
    return raw ? JSON.parse(raw) : ['card-001', 'card-003', 'card-007'];
  } catch {
    return [];
  }
}

export async function saveFavorite(templateId: string, isFav: boolean, userId?: string): Promise<void> {
  const favs = new Set(getLocalFavorites());
  if (isFav) {
    favs.add(templateId);
  } else {
    favs.delete(templateId);
  }
  const arr = Array.from(favs);
  localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(arr));

  if (isAuthUser(userId) && userId) {
    const favPath = `users/${userId}/favorites/${templateId}`;
    try {
      const favRef = doc(db, 'users', userId, 'favorites', templateId);
      if (isFav) {
        await setDoc(favRef, { templateId, createdAt: new Date().toISOString() });
      } else {
        await deleteDoc(favRef);
      }
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        handleFirestoreError(e, isFav ? OperationType.WRITE : OperationType.DELETE, favPath);
      }
      console.warn('Firestore favorite sync warning:', e);
    }
  }
}

// ======================== ORDERS ========================

/** Identifiers of the order older builds fabricated. Used to purge it. */
const FAKE_DEMO_ORDER_ID = 'ord-8921-ie';
const FAKE_DEMO_ORDER_USER = 'demo_user_google_108';

/**
 * Orders stored in this browser.
 *
 * There is deliberately no seeded demo order any more. It used to be fabricated
 * on first read, so every visitor — and the admin console, which reads these —
 * showed a fake delivered order and revenue that never existed. An empty history
 * is the honest state; real orders appear here for guests and sync to Firestore
 * for signed-in customers.
 */
export function getLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) return [];
    const orders: Order[] = JSON.parse(raw);
    // Browsers that loaded an older build have the fabricated demo order sitting
    // in localStorage. Drop it so it never shows up as real history.
    if (orders.some((o) => o.id === FAKE_DEMO_ORDER_ID || o.userId === FAKE_DEMO_ORDER_USER)) {
      const real = orders.filter(
        (o) => o.id !== FAKE_DEMO_ORDER_ID && o.userId !== FAKE_DEMO_ORDER_USER
      );
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(real));
      return real;
    }
    return orders;
  } catch {
    return [];
  }
}

export async function getUserOrders(userId?: string): Promise<Order[]> {
  const localOrders = getLocalOrders();

  if (!isAuthUser(userId) || !userId) {
    return localOrders;
  }

  const colPath = `users/${userId}/orders`;
  try {
    const colRef = collection(db, 'users', userId, 'orders');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const remoteOrders: Order[] = [];
      snap.forEach((d) => remoteOrders.push(d.data() as Order));

      // Merge local and remote orders without duplicates
      const orderMap = new Map<string, Order>();
      remoteOrders.forEach((o) => orderMap.set(o.id, o));
      localOrders.forEach((o) => {
        if (!orderMap.has(o.id)) {
          orderMap.set(o.id, o);
        }
      });
      return Array.from(orderMap.values());
    }
  } catch (e: any) {
    if (e?.code === 'permission-denied') {
      handleFirestoreError(e, OperationType.LIST, colPath);
    }
    console.warn('Firestore fetch orders warning:', e);
  }

  return localOrders;
}

export async function createOrder(order: Order): Promise<void> {
  const cleanedOrder = cleanForFirestore(order);
  const current = getLocalOrders();
  current.unshift(cleanedOrder);
  localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(current));

  if (isAuthUser(cleanedOrder.userId)) {
    const orderPath = `users/${cleanedOrder.userId}/orders/${cleanedOrder.id}`;
    try {
      const orderRef = doc(db, 'users', cleanedOrder.userId, 'orders', cleanedOrder.id);
      await setDoc(orderRef, cleanedOrder);
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        handleFirestoreError(e, OperationType.CREATE, orderPath);
      }
      console.warn('Firestore order creation warning:', e);
    }
  }
}

// ======================== RECENTLY VIEWED ========================

export function recordRecentlyViewed(templateId: string): void {
  try {
    const raw = localStorage.getItem(LOCAL_RECENT_KEY);
    let list: string[] = raw ? JSON.parse(raw) : [];
    list = [templateId, ...list.filter((id) => id !== templateId)].slice(0, 16);
    localStorage.setItem(LOCAL_RECENT_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function getRecentlyViewed(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_RECENT_KEY);
    return raw ? JSON.parse(raw) : ['card-001', 'card-002', 'card-005', 'card-008'];
  } catch {
    return [];
  }
}

// ======================== PHOTO UPLOAD ========================

// By default, Cardly uses high-performance client-side optimized WebP/JPEG data URLs (~60-100KB)
// for customer card photos. These save directly into Firestore and localStorage with zero latency
// and zero CORS preflight errors. If you have configured CORS on your Firebase Storage bucket,
// you can enable remote bucket uploads by setting VITE_USE_FIREBASE_STORAGE="true".
const ENABLE_REMOTE_STORAGE_UPLOAD = import.meta.env.VITE_USE_FIREBASE_STORAGE === 'true';

export async function uploadUserPhoto(file: File, userId?: string): Promise<string> {
  const effectiveUserId = userId || auth?.currentUser?.uid;

  // 1. Optimize image into lightweight WebP/JPEG via Canvas (~60KB - 120KB)
  let optimizedDataUrl: string | null = null;
  let optimizedBlob: Blob | null = null;

  try {
    const optimized = await optimizeImageFile(file, 1200, 0.82);
    optimizedDataUrl = optimized.dataUrl;
    optimizedBlob = optimized.blob;
  } catch (optErr) {
    console.warn('Canvas image optimization failed, proceeding with original file:', optErr);
  }

  // 2. If remote bucket upload is explicitly enabled and Firebase Storage is configured:
  if (ENABLE_REMOTE_STORAGE_UPLOAD && isFirebaseConfigured && storage && effectiveUserId && auth?.currentUser) {
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '') || 'photo.webp';
      const fileId = `${Date.now()}_${sanitizedName}`;
      const storageRef = ref(storage, `users/${effectiveUserId}/photos/${fileId}`);
      const uploadPayload = optimizedBlob || file;
      await uploadBytes(storageRef, uploadPayload, {
        contentType: optimizedBlob ? 'image/webp' : file.type,
      });
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (err) {
      console.warn('Firebase Storage upload failed (CORS or permissions), falling back to optimized DataURL:', err);
    }
  }

  // 3. Fast, reliable client-side optimized WebP/JPEG DataURL (~60KB - 120KB)
  // Immune to CORS issues and immediately persistent in Firestore & local storage.
  if (optimizedDataUrl) {
    return optimizedDataUrl;
  }

  // 4. Raw file reader fallback if canvas failed
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
