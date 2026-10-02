/**
 * The page Stripe redirects to after a successful payment.
 *
 * It renders the order the *server* built (`create-checkout` hands it to the
 * client before the redirect, stashed in sessionStorage), so the amounts shown
 * are the ones actually charged — not the browser's display totals. The
 * database row is the source of truth for admin and fulfilment; this is the
 * customer's copy of it.
 *
 * Guests get the order recorded in localStorage (their order history is local),
 * signed-in customers already have it in the database under their own id. The
 * cart is cleared here, once, on arrival back.
 */

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/currency';
import { readPendingOrder } from '../services/paymentService';
import { createOrder } from '../services/cardStorage';
import type { Order } from '../types/order';

interface CheckoutSuccessProps {
  onNavigate: (route: string) => void;
}

export const CheckoutSuccess: React.FC<CheckoutSuccessProps> = ({ onNavigate }) => {
  const { clearCart } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const pending = readPendingOrder();
    if (!pending) {
      setMissing(true);
      return;
    }
    setOrder(pending);
    // Local order history (no-op for a row that is already there), and the
    // basket is now spent.
    void createOrder(pending);
    clearCart();
    try {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#e11d48', '#f59e0b', '#8b5cf6', '#10b981'],
      });
    } catch {
      // ignore
    }
  }, []); // run once: clearCart's identity changes every render, so it must not be a dep

  if (missing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment</p>
        <h1 className="text-3xl font-black text-slate-900">No recent order to show</h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          We could not find a checkout from this browser session. If your card was charged, your
          order is safe — it appears in your account, and support can find it by email.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigate('account')}
            className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
          >
            View My Orders
          </button>
          <button
            onClick={() => onNavigate('browse')}
            className="px-6 py-3.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl transition"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6 animate-in zoom-in-95 duration-300">
      <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
        <CheckCircle className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
          Payment received
        </span>
        <h1 className="text-3xl font-black text-slate-900">
          Thank you, {order.shippingAddress.name || 'and enjoy'}!
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Your card order <strong className="text-slate-900 font-mono">{order.orderNumber}</strong>{' '}
          is paid and queued for our print studio.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 text-left shadow-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-700">Dispatch Status</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            Printing on 350gsm Silk
          </span>
        </div>

        <div className="space-y-3">
          {order.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-900">{it.title}</span>
                <p className="text-[11px] text-slate-500">
                  {it.quantity}x • {it.cardSize} size • {it.envelopeColor} envelope
                </p>
              </div>
              <span className="font-bold text-slate-800">
                {formatPrice(it.unitPrice * it.quantity)}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 text-xs space-y-1 text-slate-600">
          <div className="flex justify-between">
            <span>Delivery:</span>
            <span className="font-semibold text-slate-900">{order.deliveryMethod.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Ship to:</span>
            <span className="font-semibold text-slate-900">
              {order.shippingAddress.line1}, {order.shippingAddress.postcode}
            </span>
          </div>
          <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
            <span>Total Paid:</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
        <button
          onClick={() => onNavigate('account')}
          className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
        >
          View My Orders
        </button>
        <button
          onClick={() => onNavigate('browse')}
          className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl transition flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-rose-500" />
          Continue Shopping
        </button>
      </div>
    </div>
  );
};
