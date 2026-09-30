import React, { useEffect, useState } from 'react';
import { Heart, Loader2, Link2Off } from 'lucide-react';
import { getShareProof, SharedProof } from '../services/shareService';
import { PreviewModal } from '../components/PreviewModal';
import { UserDesign } from '../types/design';

interface SharedCardProps {
  shareId: string;
  onNavigate: (route: string) => void;
}

/**
 * Public, read-only view of a shared card proof. No sign-in, no editing, no
 * buy button — the point is to show the card to someone for approval.
 */
export const SharedCard: React.FC<SharedCardProps> = ({ shareId, onNavigate }) => {
  const [proof, setProof] = useState<SharedProof | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    getShareProof(shareId).then((p) => {
      if (mounted) {
        setProof(p);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!proof) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <Link2Off className="w-10 h-10 text-slate-300 mx-auto" />
        <h1 className="text-xl font-black text-slate-900">This card proof isn't available</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          It may have expired — share links last 30 days — or it may have been withdrawn.
          Ask the sender for a fresh link.
        </p>
        <button
          onClick={() => onNavigate('browse')}
          className="mt-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold"
        >
          Browse cards instead
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center space-y-6">
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
          <Heart className="w-3 h-3 fill-rose-400 text-rose-400" />
          Made for you on Cardly
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{proof.title}</h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Somebody personalised this card for you and asked for your opinion before it goes to
          print. Open it to read the message.
        </p>
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => setIsOpen(true)}
          className="px-7 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-2xl shadow-xl shadow-rose-200 transition active:scale-98"
        >
          Open the card
        </button>
      </div>

      <p className="text-[11px] text-slate-400">
        This is a preview only — nothing has been ordered or charged.
      </p>

      {isOpen && (
        <PreviewModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title={proof.title}
          pages={proof.design.pages}
          onProceedToCart={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
