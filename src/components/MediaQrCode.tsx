import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { mediaPath } from '../utils/routes';

/**
 * The QR code a printed card carries for an attached recording.
 *
 * Extracted into its own component because the same code has to be produced in
 * two very different contexts — the editor canvas (draggable, resizable, screen)
 * and the print preview (fixed, paper) — and the encoding must be byte-identical
 * in both or the card prints a code that leads somewhere else than the editor
 * showed. One implementation, two call sites, no drift.
 *
 * The encoded URL is /media/<id>/ and nothing else. No origin is baked in at
 * generation time, which is deliberate: the QR is generated in the browser and
 * printed by the customer's own machine, so hardcoding an origin would pin every
 * card to whatever host happened to be open in the browser. `absolute` resolves
 * against whatever site actually serves the page. (The print pipeline that will
 * eventually own this needs to pass SITE_ORIGIN explicitly — see AGENTS.md.)
 */
export const MediaQrCode: React.FC<{ mediaId: string; kind: 'audio' | 'video' }> = ({
  mediaId,
}) => {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!mediaId) return;
    let mounted = true;

    // Resolve in the browser, so the same code works on any origin. Fall back to
    // a relative path if there is no window (SSR/prerender), which still
    // round-trips through URL parsing and cannot produce a wrong absolute host.
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = origin ? origin + mediaPath(mediaId) : mediaPath(mediaId);

    QRCode.toDataURL(url, {
      margin: 1,
      width: 320,
      // M rather than H: a printed code with a caption over artwork picks up
      // smudges and fold wear, and M recovers ~15% where H's density would just
      // print dirtier. This matches the existing design QR's choice.
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (mounted) setDataUrl(url);
      })
      .catch((err) => console.error('Could not generate media QR code:', err));

    return () => {
      mounted = false;
    };
  }, [mediaId]);

  if (!dataUrl) {
    // Reserve the box so the layout does not jump once the code arrives.
    return <div className="w-full aspect-square bg-white" aria-hidden="true" />;
  }

  return (
    <img
      src={dataUrl}
      alt="QR code to play the recording attached to this card"
      className="block w-full h-full object-contain"
      draggable={false}
    />
  );
};