import React, { useState } from 'react';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Gift,
  Check,
  Truck,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CardAddon } from '../types/cart';

interface CartProps {
  onNavigate: (route: string) => void;
}

export const Cart: React.FC<CartProps> = ({ onNavigate }) => {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    deliveryFee,
    discount,
    total,
    promoCode,
    promoInput,
    setPromoInput,
    applyPromoCode,
    removePromoCode,
  } = useCart();

  const [promoMessage, setPromoMessage] = useState<{ text: string; success: boolean } | null>(null);

  const availableAddons: CardAddon[] = [
    {
      id: 'addon-confetti',
      name: 'Confetti Explosion Bomb',
      price: 1.99,
      description: 'Burst of colourful biodegradable confetti when envelope opens',
    },
    {
      id: 'addon-handwritten',
      name: 'Handwritten Pen-Ink Look',
      price: 0.99,
      description: 'Stylized realistic fountain pen ink rendering for inside text',
    },
    {
      id: 'addon-keepsake-box',
      name: 'Luxury Rigid Keepsake Folder',
      price: 2.50,
      description: 'Protective gold-foiled presentation folder to preserve the card',
    },
  ];

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    const res = applyPromoCode(promoInput);
    setPromoMessage({ text: res.message, success: res.success });
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-500">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Your basket is empty</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          You haven't added any personalized greeting cards yet. Explore our 300+ designs to find something unforgettable!
        </p>
        <button
          onClick={() => onNavigate('browse')}
          className="px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-rose-200 transition"
        >
          Browse All Greeting Cards
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate('browse')}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Your Shopping Basket</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review your personalized cards before checkout
            </p>
          </div>
        </div>

        <button
          onClick={clearCart}
          className="text-xs font-semibold text-rose-600 hover:underline"
        >
          Empty Basket
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Cart items list */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row gap-5"
            >
              {/* Thumbnail */}
              <div className="w-24 h-32 sm:w-28 sm:h-36 bg-slate-50 rounded-2xl overflow-hidden shrink-0 border border-slate-100 p-2 flex items-center justify-center">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt={item.title} className="w-full h-full object-contain" />
                ) : (
                  <Sparkles className="w-8 h-8 text-rose-400" />
                )}
              </div>

              {/* Details */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{item.title}</h3>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1">
                        <span className="capitalize font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          Size: {item.cardSize}
                        </span>
                        <span className="capitalize font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          Envelope: {item.envelopeColor}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 transition"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {item.customSummary && (
                    <div className="mt-3 p-3 bg-rose-50/50 rounded-xl border border-rose-100/60 text-xs">
                      {item.customSummary.recipientName && (
                        <p className="font-semibold text-rose-800">
                          For: {item.customSummary.recipientName}
                        </p>
                      )}
                      {item.customSummary.customMessageSnippet && (
                        <p className="text-slate-600 italic mt-0.5 line-clamp-1">
                          "{item.customSummary.customMessageSnippet}"
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Pricing & Quantity */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-0.5">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-xs font-bold text-slate-800">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-normal">£{item.unitPrice.toFixed(2)} each</span>
                    <span className="text-lg font-black text-slate-900">
                      £{((item.unitPrice + item.addons.reduce((s, a) => s + a.price, 0)) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Optional Addons Showcase */}
          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900">Popular Add-ons for Your Greeting Cards</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {availableAddons.map((addon) => (
                <div
                  key={addon.id}
                  className="p-3 bg-white rounded-2xl border border-slate-200 text-left flex flex-col justify-between"
                >
                  <div>
                    <span className="font-bold text-xs text-slate-800">{addon.name}</span>
                    <p className="text-[10px] text-slate-500 mt-1">{addon.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-900">+£{addon.price.toFixed(2)}</span>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                      Included option
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Order summary card */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-md space-y-5 sticky top-24">
          <h2 className="font-bold text-slate-900 text-lg">Order Summary</h2>

          {/* Promo code box */}
          <div className="space-y-1.5">
            {promoCode ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                <span className="font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Code {promoCode.code} (-{promoCode.discountPercentage}%)
                </span>
                <button onClick={removePromoCode} className="text-rose-600 hover:underline font-semibold">
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyPromo} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Promo Code (try CARDLY20)"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 uppercase font-medium flex-1 focus:outline-rose-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                >
                  Apply
                </button>
              </form>
            )}
            {promoMessage && (
              <p className={`text-[11px] ${promoMessage.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                {promoMessage.text}
              </p>
            )}
          </div>

          {/* Totals */}
          <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <div className="flex justify-between">
              <span>Card Items Subtotal</span>
              <span className="font-semibold text-slate-800">£{subtotal.toFixed(2)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Promotional Discount</span>
                <span>-£{discount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Royal Mail 1st Class Delivery</span>
              <span className="font-semibold text-slate-800">£{deliveryFee.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-base font-black text-slate-900 pt-3 border-t border-slate-200">
              <span>Total Amount</span>
              <span>£{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout CTA */}
          <button
            onClick={() => onNavigate('checkout')}
            className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-rose-200 flex items-center justify-center gap-2 transition transform active:scale-98"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Guarantees */}
          <div className="pt-2 space-y-1.5 text-[11px] text-slate-500 text-center">
            <p className="flex items-center justify-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-rose-500" /> Dispatched same day before 6pm
            </p>
            <p className="flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 100% Happiness Money-back Guarantee
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
