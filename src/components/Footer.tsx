import React from 'react';
import { Heart, Sparkles, ShieldCheck, Truck, RefreshCw, Mail } from 'lucide-react';

interface FooterProps {
  onNavigate: (route: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      {/* Guarantees banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 bg-slate-800/60 rounded-3xl border border-slate-700/60">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Same-Day Dispatch</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Order before 6pm Monday to Friday and your personalized card is dispatched the very same day.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Premium Card Quality</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Printed on heavy 350gsm sustainably-sourced silk cardstock with rich, vibrant inks.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">100% Happiness Guarantee</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                If your card isn't 100% perfect, we'll reprint or refund it immediately with zero hassle.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer navigation links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand info */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                card<span className="text-rose-400">ly</span>.
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mb-6">
              Cardly is your modern greeting card companion. We help you create truly memorable, personal moments for the people you cherish most with custom photos, thoughtful words, and heartfelt designs.
            </p>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span>Made with</span>
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>for every celebration</span>
            </div>
          </div>

          {/* Occasions */}
          <div>
            <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Popular Occasions</h5>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <button onClick={() => onNavigate('browse', 'Birthday')} className="hover:text-rose-400 transition">
                  Birthday Cards
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('browse', 'Anniversary')} className="hover:text-rose-400 transition">
                  Anniversary Cards
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('browse', 'Wedding')} className="hover:text-rose-400 transition">
                  Wedding Cards
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('browse', "Mother's Day")} className="hover:text-rose-400 transition">
                  Mother's Day
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('browse', "Father's Day")} className="hover:text-rose-400 transition">
                  Father's Day
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('browse', 'Congratulations')} className="hover:text-rose-400 transition">
                  Congratulations
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('browse', 'New Baby')} className="hover:text-rose-400 transition">
                  New Baby Cards
                </button>
              </li>
            </ul>
          </div>

          {/* Recipients */}
          <div>
            <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Cards For Someone</h5>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <button onClick={() => onNavigate('browse', 'Mum')} className="hover:text-rose-400 transition">
                  Cards for Mum
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('browse', 'Dad')} className="hover:text-rose-400 transition">
                  Cards for Dad
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('browse', 'Best Friend')} className="hover:text-rose-400 transition">
                  Best Friend Cards
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('browse', 'Sister')} className="hover:text-rose-400 transition">
                  Cards for Sister
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('browse', 'Brother')} className="hover:text-rose-400 transition">
                  Cards for Brother
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('browse', 'Partner')} className="hover:text-rose-400 transition">
                  Cards for Partner
                </button>
              </li>
            </ul>
          </div>

          {/* Quick links & Newsletter */}
          <div>
            <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Stay in Touch</h5>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Get exclusive member offers and friendly reminders for upcoming birthdays.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="email"
                placeholder="your.email@example.com"
                className="bg-slate-800 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 w-full focus:outline-rose-500 placeholder-slate-500"
              />
              <button
                type="button"
                onClick={() => alert('Thank you! You are subscribed to Cardly reminders.')}
                className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-2 rounded-xl text-xs font-semibold transition"
              >
                Join
              </button>
            </div>
            <div className="text-[11px] text-slate-500 space-y-1">
              <p>Delivery: Royal Mail 1st Class</p>
              <p>Size options: Standard, Large, Giant</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Cardly Ltd. All rights reserved. Original designs & personalized cards.</p>
          <div className="flex items-center space-x-6">
            <button onClick={() => onNavigate('browse')} className="hover:text-slate-400 transition">
              Explore Catalog
            </button>
            <button onClick={() => onNavigate('account')} className="hover:text-slate-400 transition">
              My Account
            </button>
            <button onClick={() => onNavigate('admin')} className="hover:text-slate-400 transition text-rose-400">
              Admin Portal
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
