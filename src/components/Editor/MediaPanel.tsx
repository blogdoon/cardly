import React, { useEffect, useState } from 'react';
import { Upload, Music4, Video, Trash2, Loader2, Info } from 'lucide-react';
import {
  uploadCardMedia,
  deleteCardMedia,
  listMyMedia,
  probeDuration,
  formatDuration,
  isMediaUploadAvailable,
  MEDIA_LIMITS,
  type CardMedia,
} from '../../services/mediaService';
import type { MediaKind } from '../../types/template';

/**
 * The editor panel for attaching an audio or video memory to a card.
 *
 * This panel uploads; it does not place. The customer picks a clip here, and the
 * editor drops a `media` element (a QR code, not a player) onto the page —
 * because a printed card cannot play anything, and a big video placeholder
 * occupying a quarter of the front would be a print-design mistake the customer
 * would have to undo. The separation also means re-uploading never disturbs the
 * layout: the element holds only the media id.
 *
 * There is deliberately no offline path. See mediaService: a memory that cannot
 * upload prints as a QR code that will never resolve, so the panel refuses
 * clearly up front rather than letting the customer finish a card that ships
 * broken.
 */
export interface MediaPanelProps {
  /** Already on the card, so we can mark what is in use. */
  usedMediaIds: string[];
  onAttach: (media: CardMedia) => void;
}

export const MediaPanel: React.FC<MediaPanelProps> = ({ usedMediaIds, onAttach }) => {
  const available = isMediaUploadAvailable();
  const [kind, setKind] = useState<MediaKind>('audio');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState<CardMedia[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const loadMine = () => {
    setLoadingList(true);
    listMyMedia()
      .then(setMine)
      .catch(() => setMine([]))
      .finally(() => setLoadingList(false));
  };

  useEffect(loadMine, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const limit = MEDIA_LIMITS[kind];
    // Checked before the network call so a huge file fails instantly.
    if (file.size > limit.maxBytes) {
      setError(`That file is too large. ${limit.label}.`);
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const duration = await probeDuration(file, kind);
      const media = await uploadCardMedia(file, { kind, durationSeconds: duration });
      onAttach(media);
      loadMine();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (media: CardMedia) => {
    const inUse = usedMediaIds.includes(media.id);
    const warning = inUse
      ? 'This memory is on a card. Deleting it breaks the QR code already printed — and if the card is in the post, nothing can bring it back.'
      : 'Delete this recording? This cannot be undone.';
    if (typeof window !== 'undefined' && !window.confirm(warning)) return;
    try {
      await deleteCardMedia(media.id);
      setMine((list) => list.filter((m) => m.id !== media.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that recording.');
    }
  };

  if (!available) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Recordings &amp; Video</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Print a scannable code that plays a message on the recipient's phone.
          </p>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Recordings need a configured database, because the file is stored and the QR code on
            the card points at it. Set <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
            <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> and apply{' '}
            <code className="font-mono">0006_media.sql</code>.
          </span>
        </div>
      </div>
    );
  }

  const limit = MEDIA_LIMITS[kind];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-slate-900 text-sm">Recordings &amp; Video</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Print a scannable code that plays a message on the recipient's phone.
        </p>
      </div>

      {/* Audio or video */}
      <div className="flex gap-2">
        {(['audio', 'video'] as MediaKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
              kind === k
                ? 'bg-rose-500 text-white border-rose-500'
                : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300'
            }`}
          >
            {k === 'audio' ? <Music4 className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            <span>{k === 'audio' ? 'Audio message' : 'Video'}</span>
          </button>
        ))}
      </div>

      <label
        className={`border-2 border-dashed border-rose-300 hover:border-rose-500 bg-rose-50/50 hover:bg-rose-50 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center ${
          isUploading ? 'opacity-70 pointer-events-none' : ''
        }`}
      >
        <input
          type="file"
          accept={limit.accept}
          onChange={handleFile}
          disabled={isUploading}
          className="hidden"
        />
        {isUploading ? (
          <Loader2 className="w-6 h-6 text-rose-500 mb-1.5 animate-spin" />
        ) : (
          <Upload className="w-6 h-6 text-rose-500 mb-1.5" />
        )}
        <span className="text-xs font-bold text-rose-700">
          {isUploading
            ? 'Uploading…'
            : kind === 'audio'
              ? 'Upload a voice message'
              : 'Upload a short video'}
        </span>
        <span className="text-[10px] text-slate-500 mt-0.5">{limit.label}</span>
      </label>

      {error && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Previously uploaded */}
      <div>
        <span className="text-xs font-semibold text-slate-700 block mb-2">Your recordings</span>
        {loadingList ? (
          <p className="text-[11px] text-slate-400">Loading…</p>
        ) : mine.length === 0 ? (
          <p className="text-[11px] text-slate-400">
            Nothing uploaded yet. Add one above and a QR code appears on the card.
          </p>
        ) : (
          <div className="space-y-2">
            {mine.map((m) => {
              const inUse = usedMediaIds.includes(m.id);
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-white"
                >
                  <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                    {m.kind === 'video' ? (
                      <Video className="w-4 h-4 text-rose-500" />
                    ) : (
                      <Music4 className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {m.title || (m.kind === 'video' ? 'Video clip' : 'Voice message')}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {formatDuration(m.durationSeconds) || '—'}
                      {inUse && <span className="ml-1.5 text-rose-500 font-bold">· On card</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAttach(m)}
                    disabled={inUse}
                    className="px-2 py-1 rounded-lg bg-rose-500 text-white text-[10px] font-bold hover:bg-rose-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition"
                  >
                    {inUse ? 'On card' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(m)}
                    aria-label={`Delete ${m.title || 'recording'}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-400 leading-relaxed">
        Anyone who scans the code can play this. Don't attach anything you'd rather keep private.
      </p>
    </div>
  );
};