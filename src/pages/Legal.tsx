import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { LEGAL_DOCS, LEGAL_LAST_UPDATED } from '../data/legal';

interface LegalProps {
  doc: 'privacy' | 'terms';
  onNavigate: (route: string) => void;
}

export const Legal: React.FC<LegalProps> = ({ doc, onNavigate }) => {
  const { title, intro, sections } = LEGAL_DOCS[doc];
  const other = doc === 'privacy' ? 'terms' : 'privacy';
  const otherLabel = doc === 'privacy' ? 'Terms & Conditions' : 'Privacy Policy';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <button
        onClick={() => onNavigate('home')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Cardly</span>
      </button>

      <h1 className="text-3xl font-black text-slate-900">{title}</h1>
      <p className="text-xs text-slate-400 mt-1">Last updated {LEGAL_LAST_UPDATED}</p>
      <p className="text-sm text-slate-600 mt-4 leading-relaxed">{intro}</p>

      <div className="mt-8 space-y-7">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{s.heading}</h2>
            <div className="mt-2 space-y-3">
              {s.body.map((p, i) => (
                <p key={i} className="text-sm text-slate-600 leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap gap-4">
        <button onClick={() => onNavigate(doc)} className="font-semibold text-slate-700 hover:text-rose-600">
          {title}
        </button>
        <button onClick={() => onNavigate(other)} className="hover:text-rose-600">
          {otherLabel}
        </button>
      </div>
    </div>
  );
};
