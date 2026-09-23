import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Lock,
  ArrowLeft,
  Package
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { DeliveryAddress, DeliveryMethod, Order } from '../types/order';
import { createOrder } from '../services/cardStorage';

interface CheckoutProps {
  onNavigate: (route: string) => void;
}

export const Checkout: React.FC<CheckoutProps> = ({ onNavigate }) => {
  const { items, subtotal, discount, total, clearCart } = useCart();
  const { user } = useAuth();

  const [deliveryType, setDeliveryType] = useState<'back_to_me' | 'direct_to_recipient'>('direct_to_recipient');

  // Address State
  const [address, setAddress] = useState<DeliveryAddress>({
    id: `addr_${Date.now()}`,
    name: user?.displayName || '',
    line1: '42 Highfield Crescent',
    line2: '',
    city: 'London',
    county: 'Greater London',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom',
  });

  // Delivery Method State
  const deliveryOptions: DeliveryMethod[] = [
    {
      id: 'royal-mail-1st',
      name: 'Royal Mail 1st Class',
      price: 1.25,
      estimatedDelivery: 'Next working day',
      description: 'Delivered straight through letterbox',
    },
    {
      id: 'royal-mail-tracked',
      name: 'Royal Mail Tracked 24',
      price: 2.95,
      estimatedDelivery: 'Tomorrow with tracking updates',
      description: 'SMS & Email delivery notifications',
    },
    {
      id: 'special-delivery',
      name: 'Next Day Special Guaranteed',
      price: 6.50,
      estimatedDelivery: 'Guaranteed by 1:00 PM tomorrow',
      description: 'Signed-for priority courier',
    },
  ];

  const [selectedMethod, setSelectedMethod] = useState<DeliveryMethod>(deliveryOptions[0]);

  // Payment Form State
  const [paymentMethod, setPaymentMethod] = useState<'google_pay' | 'card'>('google_pay');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');

  // Order Placed State
  const [isPlacing, setIsPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  const finalTotal = Math.max(0, subtotal - discount + selectedMethod.price);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.name || !address.line1 || !address.postcode) {
      alert('Please fill out the recipient name, street address, and postcode.');
      return;
    }

    setIsPlacing(true);

    const orderNumber = `CRD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      orderNumber,
      userId: user?.uid || 'guest_user',
      items: [...items],
      subtotal,
      deliveryFee: selectedMethod.price,
      discount,
      total: finalTotal,
      status: 'processing',
      shippingAddress: address,
      deliveryMethod: selectedMethod,
      dispatchDate: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
      paymentSummary: {
        method: paymentMethod,
        last4: paymentMethod === 'card' ? cardNumber.slice(-4) : '4242',
        brand: paymentMethod === 'google_pay' ? 'Google Pay' : 'Visa',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await createOrder(newOrder);

    // Trigger celebration confetti
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

    clearCart();
    setPlacedOrder(newOrder);
    setIsPlacing(false);
  };

  // Render Order Confirmation Screen
  if (placedOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
          <CheckCircle className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
            Order Confirmed!
          </span>
          <h1 className="text-3xl font-black text-slate-900">
            Thank you, {placedOrder.shippingAddress.name}!
          </h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Your personalized card order <strong className="text-slate-900 font-mono">{placedOrder.orderNumber}</strong> has been received and sent to our high-resolution print studio.
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 text-left shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700">Dispatch Status</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              Printing on 350gsm Silk
            </span>
          </div>

          <div className="space-y-3">
            {placedOrder.items.map((it) => (
              <div key={it.id} className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{it.title}</span>
                  <p className="text-[11px] text-slate-500">
                    {it.quantity}x • {it.cardSize} size • {it.envelopeColor} envelope
                  </p>
                </div>
                <span className="font-bold text-slate-800">£{(it.unitPrice * it.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span>Delivery:</span>
              <span className="font-semibold text-slate-800">{placedOrder.deliveryMethod.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Ship to:</span>
              <span className="font-semibold text-slate-800">
                {placedOrder.shippingAddress.line1}, {placedOrder.shippingAddress.postcode}
              </span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
              <span>Total Paid:</span>
              <span>£{placedOrder.total.toFixed(2)}</span>
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
            className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl transition"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

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
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Ireland">Ireland</option>
                  <option value="United States">United States</option>
                  <option value="Australia">Australia</option>
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
                  <span className="font-bold text-xs text-slate-900">£{opt.price.toFixed(2)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Step 4: Payment Simulation */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-rose-500" />
                <span>4. Payment Method</span>
              </h2>
              <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-semibold">
                <Lock className="w-3 h-3" />
                256-Bit SSL Encrypted
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('google_pay')}
                className={`flex-1 py-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition ${
                  paymentMethod === 'google_pay'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-200'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>Google Pay</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex-1 py-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition ${
                  paymentMethod === 'card'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-200'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>Credit / Debit Card</span>
              </button>
            </div>

            {paymentMethod === 'card' && (
              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-rose-500 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Expires</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-rose-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">CVC</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-rose-500 font-mono"
                    />
                  </div>
                </div>
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
                    £{((item.unitPrice + item.addons.reduce((s, a) => s + a.price, 0)) * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
            <div className="flex justify-between">
              <span>Cards Subtotal</span>
              <span className="font-semibold text-slate-900">£{subtotal.toFixed(2)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discount</span>
                <span>-£{discount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Delivery ({selectedMethod.name})</span>
              <span className="font-semibold text-slate-900">£{selectedMethod.price.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-base font-black text-slate-900 pt-3 border-t border-slate-200">
              <span>Total to Pay</span>
              <span>£{finalTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPlacing}
            className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-rose-200 flex items-center justify-center gap-2 transition transform active:scale-98 disabled:opacity-50"
          >
            {isPlacing ? (
              <span>Printing Order...</span>
            ) : (
              <>
                <span>Pay £{finalTotal.toFixed(2)} & Place Order</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
