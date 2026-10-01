import { db, isSupabaseConfigured, currentUserId, PHOTO_BUCKET } from './supabase';
import { UserDesign } from '../types/design';
import { Order } from '../types/order';
import { orderToRow, rowToOrder } from './orderRows';
import { optimizeImageFile, getCardDesignThumbnail } from '../utils/imageOptimizer';

const LOCAL_DESIGNS_KEY = 'cardly_user_designs';
const LOCAL_FAVORITES_KEY = 'cardly_user_favorites';
const LOCAL_ORDERS_KEY = 'cardly_user_orders';
const LOCAL_RECENT_KEY = 'cardly_recently_viewed';

/** Persist designs to localStorage, pruning oldest entries if over quota. */
function safeSetLocalDesigns(designs: UserDesign[]): void {
  try {
    localStorage.setItem(LOCAL_DESIGNS_KEY, JSON.stringify(designs));
  } catch (err) {
    console.warn('LocalStorage save failed (quota?), pruning cache:', err);
    for (const keep of [8, 2]) {
      try {
        localStorage.setItem(LOCAL_DESIGNS_KEY, JSON.stringify(designs.slice(0, keep)));
        return;
      } catch {
        /* try a smaller slice */
      }
    }
    console.warn('LocalStorage entirely unavailable for designs.');
  }
}

/** Strip undefined so jsonb columns and JSON.stringify never choke. */
function clean<T>(data: T): T {
  if (data === undefined) return null as unknown as T;
  return JSON.parse(JSON.stringify(data));
}

/** True when the signed-in user matches the target id, so a DB write is allowed. */
async function isOwner(userId?: string): Promise<boolean> {
  if (!isSupabaseConfigured || !userId) return false;
  return (await currentUserId()) === userId;
}

// --- design row mapping ------------------------------------------------------
const designToRow = (d: UserDesign): Record<string, unknown> => ({
  id: d.id,
  user_id: d.userId,
  template_id: d.templateId || null,
  title: d.title,
  preview_thumbnail: d.previewThumbnail || null,
  pages: d.pages,
  current_page: d.currentPage ?? null,
  selected_element_id: d.selectedElementId ?? null,
  history: d.history ?? [],
  history_index: d.historyIndex ?? null,
  created_at: d.createdAt,
  updated_at: new Date().toISOString(),
});

const rowToDesign = (r: Record<string, unknown>): UserDesign => ({
  id: r.id as string,
  templateId: (r.template_id as string) ?? '',
  userId: r.user_id as string,
  title: (r.title as string) ?? 'Untitled card',
  previewThumbnail: (r.preview_thumbnail as string) ?? undefined,
  pages: r.pages as UserDesign['pages'],
  currentPage: (r.current_page as UserDesign['currentPage']) ?? undefined,
  selectedElementId: (r.selected_element_id as string) ?? undefined,
  history: (r.history as UserDesign['history']) ?? undefined,
  historyIndex: (r.history_index as number) ?? undefined,
  createdAt: (r.created_at as string) ?? new Date().toISOString(),
  updatedAt: (r.updated_at as string) ?? new Date().toISOString(),
});

// ======================== DESIGNS ========================

export async function saveUserDesign(design: UserDesign): Promise<void> {
  const authUid = await currentUserId();
  if (authUid && design.userId !== authUid && (!design.userId || design.userId === 'guest_user')) {
    design = { ...design, userId: authUid };
  }

  const effectiveThumbnail = getCardDesignThumbnail(design.pages, design.previewThumbnail);
  if (effectiveThumbnail) design = { ...design, previewThumbnail: effectiveThumbnail };

  const cleaned: UserDesign = clean(design);

  // Always persist locally first so the user never loses edits.
  const existing = getLocalDesigns();
  const index = existing.findIndex((d) => d.id === cleaned.id);
  if (index >= 0) existing[index] = cleaned;
  else existing.unshift(cleaned);
  safeSetLocalDesigns(existing);
  saveActiveDraftId(cleaned.templateId, cleaned.id);

  if (await isOwner(cleaned.userId)) {
    try {
      const { error } = await db().from('designs').upsert(designToRow(cleaned), { onConflict: 'id' });
      if (error) throw error;
    } catch (e) {
      console.warn('Design save warning:', e);
    }
  }
}

export async function getDesignById(designId: string, userId?: string): Promise<UserDesign | null> {
  const effectiveUserId = userId || (await currentUserId()) || undefined;
  const localList = getLocalDesigns();
  const localDesign = localList.find((d) => d.id === designId) || null;

  if (await isOwner(effectiveUserId)) {
    try {
      const { data, error } = await db().from('designs').select('*').eq('id', designId).maybeSingle();
      if (error) throw error;
      if (data) {
        const remote = rowToDesign(data);
        // Keep local edits if they are newer than the remote copy.
        if (localDesign) {
          const localTime = new Date(localDesign.updatedAt || localDesign.createdAt || 0).getTime();
          const remoteTime = new Date(remote.updatedAt || remote.createdAt || 0).getTime();
          if (localTime > remoteTime) return localDesign;
        }
        const idx = localList.findIndex((d) => d.id === designId);
        if (idx >= 0) localList[idx] = remote;
        else localList.unshift(remote);
        safeSetLocalDesigns(localList);
        return remote;
      }
    } catch (e) {
      console.warn('getDesignById warning:', e);
    }
  }
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
  if (!(await isOwner(userId))) return localList;

  try {
    const { data, error } = await db().from('designs').select('*').eq('user_id', userId!);
    if (error) throw error;
    if (data && data.length) {
      const merged = new Map<string, UserDesign>();
      for (const row of data) merged.set(row.id as string, rowToDesign(row));
      for (const localD of localList) {
        const remoteD = merged.get(localD.id);
        if (!remoteD) {
          merged.set(localD.id, localD);
        } else {
          const localTime = new Date(localD.updatedAt || localD.createdAt || 0).getTime();
          const remoteTime = new Date(remoteD.updatedAt || remoteD.createdAt || 0).getTime();
          if (localTime >= remoteTime) merged.set(localD.id, localD);
        }
      }
      return Array.from(merged.values());
    }
  } catch (e) {
    console.warn('Fetch designs warning:', e);
  }
  return localList;
}

export async function deleteUserDesign(designId: string, userId?: string): Promise<void> {
  safeSetLocalDesigns(getLocalDesigns().filter((d) => d.id !== designId));
  if (await isOwner(userId)) {
    try {
      const { error } = await db().from('designs').delete().eq('id', designId);
      if (error) throw error;
    } catch (e) {
      console.warn('Delete design warning:', e);
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
  if (isFav) favs.add(templateId);
  else favs.delete(templateId);
  localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(Array.from(favs)));

  if (await isOwner(userId)) {
    try {
      if (isFav) {
        const { error } = await db()
          .from('favorites')
          .upsert({ user_id: userId, template_id: templateId }, { onConflict: 'user_id,template_id' });
        if (error) throw error;
      } else {
        const { error } = await db()
          .from('favorites')
          .delete()
          .eq('user_id', userId!)
          .eq('template_id', templateId);
        if (error) throw error;
      }
    } catch (e) {
      console.warn('Favorite sync warning:', e);
    }
  }
}

// ======================== ORDERS ========================

export function getLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) return [];
    const parsed: Order[] = JSON.parse(raw);
    // Purge the fabricated demo order if present.
    const filtered = parsed.filter(
      (o) => o.id !== 'ord-8921-uk' && o.userId !== 'demo_user_google_108'
    );
    if (filtered.length !== parsed.length) {
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(filtered));
    }
    return filtered;
  } catch {
    return [];
  }
}

export async function getUserOrders(userId?: string): Promise<Order[]> {
  const localOrders = getLocalOrders();
  if (!(await isOwner(userId))) return localOrders;

  try {
    const { data, error } = await db()
      .from('orders')
      .select('*')
      .eq('user_id', userId!)
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (data && data.length) {
      const map = new Map<string, Order>();
      for (const row of data) map.set(row.id as string, rowToOrder(row));
      for (const o of localOrders) if (!map.has(o.id)) map.set(o.id, o);
      return Array.from(map.values());
    }
  } catch (e) {
    console.warn('Fetch orders warning:', e);
  }
  return localOrders;
}

export async function createOrder(order: Order): Promise<void> {
  const cleaned: Order = clean(order);
  const current = getLocalOrders();
  current.unshift(cleaned);
  localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(current));

  if (await isOwner(cleaned.userId)) {
    try {
      const { error } = await db().from('orders').insert(orderToRow(cleaned));
      if (error) throw error;
    } catch (e) {
      console.warn('Order creation warning:', e);
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
    /* ignore */
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

// By default photos are stored as optimized WebP/JPEG data URLs (~60-120KB),
// which need no bucket, no CORS and no extra round trip. Set
// VITE_USE_SUPABASE_STORAGE="true" to upload to the Supabase Storage bucket
// instead (requires the bucket + storage policies).
const ENABLE_REMOTE_STORAGE_UPLOAD = import.meta.env.VITE_USE_SUPABASE_STORAGE === 'true';

export async function uploadUserPhoto(file: File, userId?: string): Promise<string> {
  const effectiveUserId = userId || (await currentUserId()) || undefined;

  let optimizedDataUrl: string | null = null;
  let optimizedBlob: Blob | null = null;
  try {
    const optimized = await optimizeImageFile(file, 1200, 0.82);
    optimizedDataUrl = optimized.dataUrl;
    optimizedBlob = optimized.blob;
  } catch (optErr) {
    console.warn('Image optimization failed, using original file:', optErr);
  }

  if (ENABLE_REMOTE_STORAGE_UPLOAD && isSupabaseConfigured && effectiveUserId) {
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '') || 'photo.webp';
      const path = `${effectiveUserId}/${Date.now()}_${sanitizedName}`;
      const payload = optimizedBlob || file;
      const { error } = await db()
        .storage.from(PHOTO_BUCKET)
        .upload(path, payload, { contentType: optimizedBlob ? 'image/webp' : file.type, upsert: true });
      if (error) throw error;
      const { data } = db().storage.from(PHOTO_BUCKET).getPublicUrl(path);
      if (data?.publicUrl) return data.publicUrl;
    } catch (err) {
      console.warn('Supabase Storage upload failed, falling back to data URL:', err);
    }
  }

  if (optimizedDataUrl) return optimizedDataUrl;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
