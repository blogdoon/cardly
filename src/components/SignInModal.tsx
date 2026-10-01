import React, { useState } from 'react';
import { X } from 'lucide-react';
import { loginWithPassword, signUpWithPassword } from '../services/authService';

interface Props {
  onClose: () => void;
  onGoogle: () => Promise<void>;
}

/** Email + password sign-in / sign-up, with Google as the alternative. */
export const SignInModal: React.FC<Props> = ({ onClose, onGoogle }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (mode === 'signin') {
        await loginWithPassword(email, password);
        onClose();
      } else if (await signUpWithPassword(email, password)) {
        setNotice('Check your inbox to confirm your email, then sign in.');
        setMode('signin');
      } else {
        onClose();
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-title"
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="signin-title" className="text-lg font-black text-slate-900">
            {mode === 'signin' ? 'Sign in to Cardly' : 'Create your account'}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Password
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-normal"
            />
          </label>

          {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
          {notice && <p className="text-xs text-emerald-700">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl text-xs font-semibold"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
          }}
          className="w-full text-xs text-rose-600 font-semibold"
        >
          {mode === 'signin' ? 'No account? Create one' : 'Already have an account? Sign in'}
        </button>

        <div className="flex items-center gap-2 text-[10px] uppercase text-slate-400">
          <span className="flex-1 h-px bg-slate-200" />or<span className="flex-1 h-px bg-slate-200" />
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => run(async () => { await onGoogle(); onClose(); })}
          className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-800"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
};
