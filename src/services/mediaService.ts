import { db, isSupabaseConfigured, currentUserId, MEDIA_BUCKET } from './supabase';
import type { MediaKind } from '../types/template';

/**
 * Audio and video memories attached to a card, printed as a QR code.
 *
 * A card cannot play sound, so what we print is a code and what plays is the
 * recipient's phone. The upload path is therefore deliberately different from
 * `uploadUserPhoto` in cardStorage.ts:
 *
 *   photo  -> optimized down to ~100KB, may live in localStorage as a data URL,
 *            only ever shown to its owner, so its bucket is private.
 *   media  -> up to 100MB, NEVER a data URL (it would blow the 1MB jsonb column
 *            and the 5MB localStorage quota on the first clip), only ever read by
 *            whoever holds the printed card, so its bucket is public.
 *
 * There is no local fallback here and there must not be one. A media element that
 * cannot upload is not a degraded memory, it is a broken QR code printed on paper
 * that will never resolve — so this fails loudly and the UI says so, rather than
 * letting the customer finish a card that ships dead.
 *
 * The row id is the only secret protecting the file (`card_media` is world-
 * readable by design), so it is minted with crypto.randomUUID() — never derived
 * from the design, order or template id, all of which are guessable.
 */

const TABLE = 'card_media';

/**
 * Upload ceilings. Audio is a phone voice memo; video is a short clip. These are
 * checked in the browser before any network call so a 400MB home video fails in
 * an instant instead of after a long upload.
 *
 * 25MB for BOTH, deliberately. Video was 100MB and that was the single biggest
 * cost lever in the feature: the `card-media` bucket is public, so reads bypass
 * Supabase's CDN and bill at the origin rate (~$0.09/GB). A 100MB clip served
 * 5,000 times is ~$22 of egress for one customer's memory. At 25MB that worst case
 * is ~$5.75, and a 25MB clip is still 60+ seconds of 480p — far more than fits
 * the use. If media ever moves to a zero-egress host (R2) or gets transcoded on
 * upload, raise this; do not raise it before one of those happens.
 *
 * The bucket's own limit is the backstop — set it in the Supabase dashboard to at
 * least this. A ceiling the client enforces alone is a suggestion.
 */
export const MEDIA_LIMITS: Record<MediaKind, { maxBytes: number; accept: string; label: string }> = {
  audio: {
    maxBytes: 25 * 1024 * 1024,
    accept: 'audio/mpeg,audio/mp4,audio/wav,audio/x-m4a,audio/aac,audio/ogg,audio/webm',
    label: 'MP3, M4A, WAV, AAC or OGG up to 25MB',
  },
  video: {
    maxBytes: 25 * 1024 * 1024,
    accept: 'video/mp4,video/quicktime,video/webm',
    label: 'MP4, MOV or WebM up to 25MB — short clips only',
  },
};

export interface CardMedia {
  id: string;
  ownerId: string | null;
  kind: MediaKind;
  /** Object key within the bucket, NOT a URL. */
  storagePath: string;
  byteSize: number | null;
  title: string;
  durationSeconds: number | null;
  createdAt: string;
}

/**
 * Whether the editor should offer this feature at all. There is no offline
 * fallback, so without a database there is nothing honest to show.
 */
export function isMediaUploadAvailable(): boolean {
  return isSupabaseConfigured;
}

/**
 * The scan URL, defined once in routes.ts alongside every other path so the QR
 * encoder and the router cannot drift apart. Re-exported here so callers that
 * already import this service do not need a second import.
 */
export { mediaPath as musicPath } from '../utils/routes';

export function mediaKindFromMime(mime: string): MediaKind | null {
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return null;
}

/** Strip anything that could escape the object key or confuse a content-type. */
function safeExtension(name: string, kind: MediaKind): string {
  const fromName = name.toLowerCase().match(/\.([a-z0-9]{2,5})$/)?.[1];
  // Whitelist rather than blacklist: an extension is the only part of the
  // original filename that reaches storage.
  const allowed: Record<MediaKind, string[]> = {
    audio: ['mp3', 'm4a', 'wav', 'aac', 'ogg', 'oga', 'opus', 'mp4', 'weba'],
    video: ['mp4', 'mov', 'webm', 'm4v'],
  };
  const ext = fromName && allowed[kind].includes(fromName) ? fromName : allowed[kind][0];
  return ext;
}

const rowToMedia = (row: Record<string, unknown>): CardMedia => ({
  id: row.id as string,
  ownerId: (row.owner_id as string) ?? null,
  kind: row.kind as MediaKind,
  storagePath: row.storage_path as string,
  byteSize: (row.byte_size as number) ?? null,
  title: (row.title as string) ?? '',
  durationSeconds: (row.duration_seconds as number) ?? null,
  createdAt: (row.created_at as string) ?? new Date().toISOString(),
});

/**
 * Upload a clip and return the row describing it.
 *
 * Order matters: the object is uploaded first, then the row. If the row insert
 * fails we remove the object, because an orphaned object in a public bucket is
 * readable by anyone who can guess its UUID and nothing references it to clean
 * it up later.
 */
export async function uploadCardMedia(
  file: File,
  options: { kind: MediaKind; title?: string; durationSeconds?: number } = { kind: 'audio' }
): Promise<CardMedia> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Audio and video need a configured database. There is no offline fallback — a memory that cannot upload would print as a QR code that never resolves.'
    );
  }

  const kind = options.kind ?? mediaKindFromMime(file.type) ?? 'audio';
  const limit = MEDIA_LIMITS[kind];
  if (file.size > limit.maxBytes) {
    throw new Error(`That file is too large. ${limit.label}.`);
  }
  if (file.size === 0) throw new Error('That file is empty.');

  // Required, not optional: the row id is the secret, and only the signed-in
  // customer may write a row. Guests get told to sign in rather than being
  // silently given a media element that will not resolve.
  const ownerId = await currentUserId();
  if (!ownerId) {
    throw new Error('Sign in to attach a recording to your card.');
  }

  const id = crypto.randomUUID();
  const path = `${id}/${Date.now()}.${safeExtension(file.name, kind)}`;

  const { error: uploadError } = await db()
    .storage.from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const row = {
    id,
    owner_id: ownerId,
    kind,
    storage_path: path,
    byte_size: file.size,
    // Trimmed and length-capped: this is the only free text on a world-readable
    // row, and it is rendered on the scan page.
    title: (options.title ?? '').trim().slice(0, 120),
    duration_seconds:
      typeof options.durationSeconds === 'number' && Number.isFinite(options.durationSeconds)
        ? Math.max(0, Math.round(options.durationSeconds))
        : null,
  };

  const { error: insertError } = await db().from(TABLE).insert(row);
  if (insertError) {
    // Roll the object back. An orphan in a public bucket is a permanently
    // reachable file that no page can revoke.
    try {
      await db().storage.from(MEDIA_BUCKET).remove([path]);
    } catch (cleanupError) {
      console.warn('Could not remove orphaned media object:', cleanupError);
    }
    throw new Error(`Could not save the memory: ${insertError.message}`);
  }

  return {
    id,
    ownerId,
    kind,
    storagePath: path,
    byteSize: file.size,
    title: row.title,
    durationSeconds: row.duration_seconds,
    createdAt: new Date().toISOString(),
  };
}

/** Public, permanent URL for a row. Valid because the bucket is public. */
export function mediaPlaybackUrl(media: Pick<CardMedia, 'storagePath'>): string {
  return db().storage.from(MEDIA_BUCKET).getPublicUrl(media.storagePath).data.publicUrl;
}

/**
 * Resolve the rows a design references, for the scan page and for re-printing.
 * Never throws: a missing row means the QR is dead, and the caller needs to say
 * so rather than crash a printed card's page.
 */
export async function getCardMediaByIds(ids: string[]): Promise<CardMedia[]> {
  if (!isSupabaseConfigured || ids.length === 0) return [];
  const unique = Array.from(new Set(ids.filter(Boolean))).slice(0, 12);
  try {
    const { data, error } = await db()
      .from(TABLE)
      .select('*')
      .in('id', unique);
    if (error) throw new Error(error.message);
    // Preserve the caller's order so element order on the card is the order here.
    const byId = new Map((data ?? []).map((r) => [r.id as string, rowToMedia(r)]));
    return unique.map((id) => byId.get(id)).filter((m): m is CardMedia => Boolean(m));
  } catch (e) {
    console.warn('Could not load card media:', e);
    return [];
  }
}

/** The signed-in customer's own memories, newest first, for the editor list. */
export async function listMyMedia(): Promise<CardMedia[]> {
  if (!isSupabaseConfigured) return [];
  const ownerId = await currentUserId();
  if (!ownerId) return [];
  try {
    const { data, error } = await db()
      .from(TABLE)
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToMedia);
  } catch (e) {
    console.warn('Could not list media:', e);
    return [];
  }
}

/**
 * Delete a memory and its object.
 *
 * The row is removed first and the object second: if the object delete fails we
 * are left with an unreachable file, whereas the other order leaves a row whose
 * QR resolves to nothing — the printed-card failure mode. Neither can be revoked
 * retroactively for a card already in the post, which is why the UI warns.
 */
export async function deleteCardMedia(mediaId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { data, error } = await db()
    .from(TABLE)
    .delete()
    .eq('id', mediaId)
    .select('storage_path')
    .maybeSingle();
  if (error) throw new Error(error.message);
  const path = (data as { storage_path?: string } | null)?.storage_path;
  if (path) {
    try {
      await db().storage.from(MEDIA_BUCKET).remove([path]);
    } catch (e) {
      console.warn('Row deleted but the media object could not be removed:', e);
    }
  }
}

/**
 * Read a clip's duration in the browser, before upload.
 *
 * Loaded through an object URL purely to read metadata — the URL is revoked in
 * the finally, and nothing is downloaded twice because we upload the original
 * File, not this probe.
 */
export function probeDuration(file: File, kind: MediaKind): Promise<number | undefined> {
  if (typeof document === 'undefined') return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const media = document.createElement(kind);
    const done = (value?: number) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    media.preload = 'metadata';
    media.onloadedmetadata = () =>
      done(Number.isFinite(media.duration) ? Math.round(media.duration) : undefined);
    // A codec the browser cannot decode is not fatal — the phone that scans may
    // still play it — so an unknown duration is fine, a rejected upload is not.
    media.onerror = () => done(undefined);
    media.src = url;
  });
}

/** Human-readable duration for the editor list, e.g. "1:07". */
export function formatDuration(seconds?: number | null): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return '';
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}