import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth, isFirebaseConfigured } from './firebase';
import { UserDesign } from '../types/design';
import { Order } from '../types/order';
import { handleFirestoreError, OperationType } from './firestoreErrors';

const LOCAL_DESIGNS_KEY = 'cardly_user_designs';
const LOCAL_FAVORITES_KEY = 'cardly_user_favorites';
const LOCAL_ORDERS_KEY = 'cardly_user_orders';
const LOCAL_RECENT_KEY = 'cardly_recently_viewed';

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
  // Always persist locally first so user never loses edits
  const existing = getLocalDesigns();
  const index = existing.findIndex((d) => d.id === design.id);
  if (index >= 0) {
    existing[index] = design;
  } else {
    existing.unshift(design);
  }
  localStorage.setItem(LOCAL_DESIGNS_KEY, JSON.stringify(existing));

  // Sync to Firestore if authenticated & authorized
  if (isAuthUser(design.userId)) {
    const designPath = `users/${design.userId}/designs/${design.id}`;
    try {
      const designRef = doc(db, 'users', design.userId, 'designs', design.id);
      await setDoc(designRef, {
        id: design.id,
        templateId: design.templateId,
        userId: design.userId,
        title: design.title,
        pages: design.pages,
        previewThumbnail: design.previewThumbnail || '',
        createdAt: design.createdAt,
        updatedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        handleFirestoreError(e, OperationType.WRITE, designPath);
      }
      console.warn('Firestore design save warning:', e);
    }
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

      // Merge remote & local designs by ID, preferring newest
      const mergedMap = new Map<string, UserDesign>();
      remoteList.forEach((d) => mergedMap.set(d.id, d));
      localList.forEach((d) => {
        if (!mergedMap.has(d.id)) {
          mergedMap.set(d.id, d);
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
  localStorage.setItem(LOCAL_DESIGNS_KEY, JSON.stringify(existing));

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

export function getLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (raw) return JSON.parse(raw);

    // Initial demo order with realistic design snapshots so customer has an order history out of the box
    const demoOrder: Order = {
      id: 'ord-8921-uk',
      orderNumber: 'CRD-2026-8921',
      userId: 'demo_user_google_108',
      items: [
        {
          id: 'item-demo-1',
          templateId: 'card-001',
          title: 'Thirty, Flirty & Thriving',
          thumbnail: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80',
          cardSize: 'standard',
          envelopeColor: 'blush',
          quantity: 1,
          unitPrice: 3.99,
          addons: [
            {
              id: 'addon-env',
              name: 'Luxury Blush Envelope',
              price: 0.5,
              description: 'Premium pearlescent paper',
            },
          ],
          customSummary: {
            recipientName: 'Sophie',
            customMessageSnippet: 'Wishing you the happiest 30th birthday Sophie! Hope this year brings you love, joy, and endless champagne celebrations xoxo',
          },
          designSnapshot: {
            id: 'design_demo_sophie_30th',
            templateId: 'card-001',
            userId: 'demo_user_google_108',
            title: 'Thirty, Flirty & Thriving for Sophie',
            previewThumbnail: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
            updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
            pages: {
              front: {
                pageType: 'front',
                backgroundColor: '#fff1f2',
                elements: [
                  {
                    id: 'front_title',
                    type: 'text',
                    x: 50,
                    y: 28,
                    width: 75,
                    height: 20,
                    rotation: 0,
                    zIndex: 1,
                    text: 'THIRTY,\nFLIRTY &\nTHRIVING',
                    fontFamily: 'Playfair Display',
                    fontSize: 34,
                    color: '#e11d48',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  },
                  {
                    id: 'front_name',
                    type: 'text',
                    x: 50,
                    y: 65,
                    width: 60,
                    height: 12,
                    rotation: 0,
                    zIndex: 2,
                    text: 'Happy Birthday Sophie!',
                    fontFamily: 'Montserrat',
                    fontSize: 20,
                    color: '#881337',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  },
                  {
                    id: 'front_sticker',
                    type: 'sticker',
                    x: 50,
                    y: 82,
                    width: 20,
                    height: 20,
                    rotation: 0,
                    zIndex: 3,
                    stickerId: 'sparkles',
                    emoji: '✨',
                    name: 'Sparkles',
                  },
                ],
              },
              insideLeft: {
                pageType: 'inside-left',
                backgroundColor: '#ffffff',
                elements: [
                  {
                    id: 'left_photo',
                    type: 'photo',
                    x: 50,
                    y: 45,
                    width: 65,
                    height: 50,
                    rotation: -2,
                    zIndex: 1,
                    imageUrl: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&auto=format&fit=crop&q=80',
                    borderRadius: 16,
                    scale: 1,
                  },
                  {
                    id: 'left_caption',
                    type: 'text',
                    x: 50,
                    y: 82,
                    width: 70,
                    height: 10,
                    rotation: 0,
                    zIndex: 2,
                    text: 'Best friends forever 🥂',
                    fontFamily: 'Caveat',
                    fontSize: 22,
                    color: '#64748b',
                    textAlign: 'center',
                  },
                ],
              },
              insideRight: {
                pageType: 'inside-right',
                backgroundColor: '#ffffff',
                elements: [
                  {
                    id: 'right_msg',
                    type: 'text',
                    x: 50,
                    y: 46,
                    width: 80,
                    height: 50,
                    rotation: 0,
                    zIndex: 1,
                    text: 'Dearest Sophie,\n\nWishing you the happiest 30th birthday! Can not believe how many wonderful memories we have made together. Here is to thriving and shining brighter than ever in your fabulous thirties!\n\nLots of love always,\nAlex & Maya xxx',
                    fontFamily: 'Caveat',
                    fontSize: 22,
                    color: '#334155',
                    textAlign: 'center',
                  },
                  {
                    id: 'right_sticker',
                    type: 'sticker',
                    x: 50,
                    y: 84,
                    width: 18,
                    height: 18,
                    rotation: 0,
                    zIndex: 2,
                    stickerId: 'party',
                    emoji: '🎉',
                    name: 'Party Popper',
                  },
                ],
              },
              back: {
                pageType: 'back',
                backgroundColor: '#fafafa',
                elements: [
                  {
                    id: 'back_brand',
                    type: 'text',
                    x: 50,
                    y: 86,
                    width: 50,
                    height: 8,
                    rotation: 0,
                    zIndex: 1,
                    text: 'Handcrafted on Cardly • cardly.co.uk',
                    fontFamily: 'Montserrat',
                    fontSize: 11,
                    color: '#94a3b8',
                    textAlign: 'center',
                  },
                ],
              },
            },
          },
        },
      ],
      subtotal: 4.49,
      deliveryFee: 1.25,
      discount: 0,
      total: 5.74,
      status: 'delivered',
      shippingAddress: {
        id: 'addr-1',
        name: 'Alex Morgan',
        line1: '42 Highfield Crescent',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'United Kingdom',
      },
      deliveryMethod: {
        id: 'royal-mail-1st',
        name: 'Royal Mail 1st Class',
        price: 1.25,
        estimatedDelivery: 'Delivered',
        description: 'Delivered through letterbox',
      },
      dispatchDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      paymentSummary: { method: 'google_pay', last4: '4242', brand: 'Visa' },
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    };

    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify([demoOrder]));
    return [demoOrder];
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
  const current = getLocalOrders();
  current.unshift(order);
  localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(current));

  if (isAuthUser(order.userId)) {
    const orderPath = `users/${order.userId}/orders/${order.id}`;
    try {
      const orderRef = doc(db, 'users', order.userId, 'orders', order.id);
      await setDoc(orderRef, order);
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

export async function uploadUserPhoto(file: File, userId: string): Promise<string> {
  // If Firebase Storage is configured, upload to storage
  if (isFirebaseConfigured && storage && userId && auth?.currentUser) {
    try {
      const fileId = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const storageRef = ref(storage, `users/${userId}/photos/${fileId}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (err) {
      console.warn('Firebase Storage upload failed, using DataURL fallback:', err);
    }
  }

  // Fast client-side Data URL conversion
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
