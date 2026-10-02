import React, { useState } from 'react';
import {
  Truck,
  CreditCard,
  ArrowRight,
  Sparkles,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { DeliveryAddress, DeliveryMethod } from '../types/order';
import { DELIVERY_METHODS } from '../utils/delivery';
import { formatPrice, SHIPPING_COUNTRIES, DEFAULT_SHIPPING_COUNTRY } from '../utils/currency';
import { startCheckout, stashPendingOrder } from '../services/paymentService';

interface CheckoutProps {
  onNavigate: (route: string) => void;
}

export const Checkout: React.FC<CheckoutProps> = ({ onNavigate }) => {
  const { items, subtotal, discount, promoCode } = useCart();
  const { user } = useAuth();

  const [deliveryType, setDeliveryType] = useState<'back_to_me' | 'direct_to_recipient'>('direct_to_recipient');

  // Address State. Nothing is prefilled: a placeholder address is a fabricated
  // one, and the customer is the only source for where this card should go.
  const [address, setAddress] = useState<DeliveryAddress>({
    id: `addr_${Date.now()}`,
    name: user?.displayName || '',
    line1: '',
    line2: '',
    city: '',
    county: '',
    postcode: '',
    country: DEFAULT_SHIPPING_COUNTRY,
  });

  // Delivery Method State
  const deliveryOptions: DeliveryMethod[] = [...DELIVERY_METHODS];

  const [selectedMethod, setSelectedMethod] = useState<DeliveryMethod>(deliveryOptions[0]);

  // Payment state. There is no card form here on purpose — card details are
  // entered on Stripe's hosted page, so they never exist in this bundle at all.
  const [isPlacing, setIsPlacing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const finalTotal = Math.max(0, subtotal - discount + selectedMethod.price);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.name || !address.line1 || !address.postcode) {
      alert('Please fill out the recipient name, street address, and postcode.');
      return;
    }

    setIsPlacing(true);
    setPaymentError(null);

    try {
      // The server prices this order from the catalog and hands back a hosted
      // Stripe checkout URL. It is written as `pending_payment`; only the
      // signed webhook turns it into a real order (see AGENTS.md blocker #1).
      const { url, order } = await startCheckout({
        items,
        deliveryMethodId: selectedMethod.id,
        deliveryType,
        promoCode: promoCode?.code ?? null,
        address,
      });
      stashPendingOrder(order);
      window.location.href = url;
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Could not start payment.');
      setIsPlacing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-6 border-b border-slate-200">
        <button
          onClick={() => onNavigate('cart')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Secure Checkout</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete your order with Royal Mail fast delivery
          </p>
        </div>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Delivery & Address */}
        <div className="lg:col-span-8 space-y-6">
          {/* Step 1: Destination Selection */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-rose-500" />
              <span>1. Delivery Destination</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeliveryType('direct_to_recipient')}
                className={`p-4 rounded-2xl border text-left transition ${
                  deliveryType === 'direct_to_recipient'
                    ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-200'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-xs text-slate-900">Direct to Recipient</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  We print your custom message inside and post straight to their letterbox in the envelope.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType('back_to_me')}
                className={`p-4 rounded-2xl border text-left transition ${
                  deliveryType === 'back_to_me'
                    ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-200'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-xs text-slate-900">Send Back to Me</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Delivered to your home with a spare blank envelope so you can sign and hand-deliver in person.
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Shipping Address Details */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              2. {deliveryType === 'direct_to_recipient' ? "Recipient's Address" : 'Your Delivery Address'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={address.name}
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-rose-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  placeholder="House number & street name"
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Apartment, suite, unit (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Flat 3B"
                  value={address.line2 || ''}
                  onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Town / City</label>
                <input
                  type="text"
                  required
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Postcode</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SW1A 1AA"
                  value={address.postcode}
                  onChange={(e) => setAddress({ ...address, postcode: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-rose-500 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Country</label>
                <select
                  value={address.country}
                  onChange={(e) => setAddress({ ...address, country: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-rose-500 bg-white"
                >
                  {SHIPPING_COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Step 3: Delivery Speed */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              3. Delivery Option
            </h2>

            <div className="space-y-2.5">
              {deliveryOptions.map((opt) => (
                <label
                  key={opt.id}
                  onClick={() => setSelectedMethod(opt)}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                    selectedMethod.id === opt.id
                      ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-200'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      checked={selectedMethod.id === opt.id}
                      onChange={() => setSelectedMethod(opt)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900">{opt.name}</div>
                      <div className="text-[11px] text-slate-500">{opt.estimatedDelivery} • {opt.description}</div>
                    </div>
                  </div>
                  <span className="font-bold text-xs text-slate-900">{formatPrice(opt.price)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Step 4: Payment — hosted by Stripe */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-rose-500" />
                <span>4. Payment</span>
              </h2>
              <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-semibold">
                <Lock className="w-3 h-3" />
                256-Bit SSL Encrypted
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Pressing pay takes you to Stripe's secure checkout, where you can pay by card, Google
              Pay or Apple Pay. Your card details are entered on their page and never reach Cardly —
              we only ever find out one thing: whether the payment succeeded.
            </p>

            {paymentError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700"
              >
                {paymentError}
              </div>
            )}
          </div>
        </div>

        {/* Right Summary */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-md space-y-5 sticky top-24">
          <h2 className="font-bold text-slate-900 text-lg">Order Breakdown</h2>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 text-xs">
                <div className="w-12 h-16 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-contain" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-rose-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 line-clamp-1">{item.title}</h4>
                  <p className="text-[11px] text-slate-500 capitalize">
                    {item.quantity}x • {item.cardSize} • {item.envelopeColor}
                  </p>
                  <p className="font-bold text-slate-800 mt-1">
                    {formatPrice(
                      (item.unitPrice + item.addons.reduce((s, a) => s + a.price, 0)) * item.quantity
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
            <div className="flex justify-between">
              <span>Cards Subtotal</span>
              <span className="font-semibold text-slate-900">{formatPrice(subtotal)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discount</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Delivery ({selectedMethod.name})</span>
              <span className="font-semibold text-slate-900">{formatPrice(selectedMethod.price)}</span>
            </div>

            <div className="flex justify-between text-base font-black text-slate-900 pt-3 border-t border-slate-200">
              <span>Total to Pay</span>
              <span>{formatPrice(finalTotal)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPlacing}
            className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-rose-200 flex items-center justify-center gap-2 transition transform active:scale-98 disabled:opacity-50"
          >
            {isPlacing ? (
              <span>Taking you to Stripe…</span>
            ) : (
              <>
                <span>Pay {formatPrice(finalTotal)} &amp; Place Order</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
