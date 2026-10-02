import React, { useEffect, useState } from 'react';
import { Play, Pause, Volume2, Video, Music4, AlertTriangle, Loader2 } from 'lucide-react';
import {
  getCardMediaByIds,
  mediaPlaybackUrl,
  formatDuration,
  type CardMedia,
} from '../services/mediaService';

/**
 * The page a printed card's QR code opens. Opened by a phone camera by someone
 * who has never heard of Cardly and has no account.
 *
 * Design constraints that follow from that, all deliberate:
 *
 *   - No auth, no "sign in to continue". The recipient is a stranger holding a
 *     physical card; a login wall would make the gift unusable.
 *   - The id in the URL is the only secret, so never render anything that helps
 *     enumerate: no owner id, no "other cards by this person", no listing.
 *   - It plays the file directly from the public bucket rather than proxying it,
 *     so it works on a phone with no app, no JS bundle warm and no session.
 *   - Native <audio>/<video> controls, because the recipient is not a customer
 *     and has never seen our UI.
 */
export const MediaPage: React.FC<{ mediaId: string; onBack?: () => void }> = ({
  mediaId,
}) => {
  const [media, setMedia] = useState<CardMedia | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    getCardMediaByIds([mediaId])
      .then((rows) => {
        if (cancelled) return;
        if (rows.length === 0) {
          // The row is gone, or never existed. The common real cause is a memory
          // deleted after the card was printed, which cannot be undone — so say
          // that plainly instead of showing an empty player.
          setStatus('missing');
          return;
        }
        setMedia(rows[0]);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [mediaId]);

  const src = media ? mediaPlaybackUrl(media) : '';

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {status === 'loading' && (
          <div className="text-center text-slate-500 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading your memory…</span>
          </div>
        )}

        {status === 'missing' && (
          <div className="text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">This memory is no longer available</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              The recording attached to this card has been removed by the person who sent it to
              you. If that seems wrong, the card itself is still theirs — please get in touch with
              them directly.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
            <p className="text-sm text-slate-600">
              This recording could not be loaded. Check your connection and try again.
            </p>
          </div>
        )}

        {status === 'ready' && media && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-500">
                {media.kind === 'video' ? (
                  <Video className="w-3.5 h-3.5" />
                ) : (
                  <Music4 className="w-3.5 h-3.5" />
                )}
                <span>{media.kind === 'video' ? 'A video for you' : 'A recording for you'}</span>
              </div>
              {media.title && (
                <h1 className="text-2xl font-black text-slate-900 leading-tight">{media.title}</h1>
              )}
            </div>

            <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-white">
              {media.kind === 'video' ? (
                <video
                  src={src}
                  controls
                  playsInline
                  preload="metadata"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full bg-slate-900 aspect-video"
                >
                  Your browser cannot play this video format.
                </video>
              ) : (
                <div className="px-6 py-10 bg-gradient-to-br from-rose-50 to-amber-50 flex flex-col items-center gap-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      const audio = e.currentTarget.closest('[data-audio-host]')?.querySelector('audio');
                      if (!audio) return;
                      if (audio.paused) void audio.play();
                      else audio.pause();
                    }}
                    aria-label={isPlaying ? 'Pause recording' : 'Play recording'}
                    className="w-20 h-20 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg hover:bg-rose-600 active:scale-95 transition"
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8 fill-current" />
                    ) : (
                      <Play className="w-8 h-8 fill-current ml-1" />
                    )}
                  </button>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>
                      {formatDuration(media.durationSeconds)
                        ? `${formatDuration(media.durationSeconds)} recording`
                        : 'Tap to play'}
                    </span>
                  </div>
                  {/* Visually collapsed: native controls are ugly on iOS but they
                      are the only ones guaranteed to work on every phone, and this
                      is a page for a non-customer. */}
                  <audio
                    src={src}
                    controls
                    preload="metadata"
                    data-audio-host=""
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <p className="text-center text-xs text-slate-500 leading-relaxed">
              This recording was attached to a Cardly greeting card. Keep the link if you want to
              listen again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};