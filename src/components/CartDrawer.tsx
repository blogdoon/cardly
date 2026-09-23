import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Sparkles, Check, Gift } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface CartDrawerProps {
  onNavigate: (route: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onNavigate }) => {
  const {
    items,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    updateQuantity,
    removeItem,
    subtotal,
    deliveryFee,
    discount,
    total,
    promoCode,
    promoInput,
    setPromoInput,
    applyPromoCode,
    removePromoCode
  } = useCart();

  const [promoMessage, setPromoMessage] = React.useState<{ text: string; success: boolean } | null>(null);

  if (!isCartDrawerOpen) return null;

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    const res = applyPromoCode(promoInput);
    setPromoMessage({ text: res.message, success: res.success });
  };

  const handleCheckoutClick = () => {
    setIsCartDrawerOpen(false);
    onNavigate('checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartDrawerOpen(false)}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-rose-500" />
              <h2 className="text-base font-bold text-slate-900">
                Your Shopping Basket ({items.reduce((s, i) => s + i.quantity, 0)})
              </h2>
            </div>
            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-2 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body: Cart Items or Empty State */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Your basket is empty</h3>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  Your basket is waiting for something special. Explore hundreds of personalized greeting cards!
                </p>
                <button
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    onNavigate('browse');
                  }}
                  className="mt-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Browse Greeting Cards
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex gap-3.5"
                  >
                    {/* Item Thumbnail */}
                    <div className="w-18 h-24 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.title} className="w-full h-full object-contain" />
                      ) : (
                        <Sparkles className="w-6 h-6 text-rose-400" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{item.title}</h4>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-slate-400 hover:text-rose-500 p-1"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-[11px] text-slate-500 mt-0.5 space-y-0.5">
                          <p className="capitalize">Size: <span className="font-medium text-slate-700">{item.cardSize}</span></p>
                          <p className="capitalize">Envelope: <span className="font-medium text-slate-700">{item.envelopeColor}</span></p>
                          {item.customSummary?.recipientName && (
                            <p className="text-rose-600 font-medium">To: {item.customSummary.recipientName}</p>
                          )}
                        </div>
                      </div>

                      {/* Quantity & Unit Price */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 hover:bg-slate-200 text-slate-600 rounded-l-lg"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-bold text-slate-800">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 hover:bg-slate-200 text-slate-600 rounded-r-lg"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-extrabold text-sm text-slate-900">
                          £{((item.unitPrice + item.addons.reduce((a, b) => a + b.price, 0)) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Popular Add-on Suggestion */}
                <div className="p-3 bg-gradient-to-r from-amber-50 to-rose-50 rounded-2xl border border-amber-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500/20 text-amber-700 rounded-xl">
                      <Gift className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Confetti Explosion Bomb</div>
                      <div className="text-[10px] text-slate-500">Fun surprise when envelope opens (+£1.99)</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-rose-600 bg-white px-2 py-1 rounded-md shadow-xs">
                    Popular
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer: Promos and Totals */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 space-y-3">
              {/* Promo Code input */}
              <div>
                {promoCode ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl text-xs">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Promo {promoCode.code} applied (-{promoCode.discountPercentage}%)
                    </span>
                    <button
                      onClick={removePromoCode}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Promo code (e.g. CARDLY20)"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 uppercase font-medium flex-1 focus:outline-rose-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
                    >
                      Apply
                    </button>
                  </form>
                )}
                {promoMessage && (
                  <p className={`text-[11px] mt-1 ${promoMessage.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {promoMessage.text}
                  </p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">£{subtotal.toFixed(2)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount</span>
                    <span>-£{discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Estimated 1st Class Delivery</span>
                  <span className="font-semibold text-slate-900">£{deliveryFee.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span>£{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={handleCheckoutClick}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-200 flex items-center justify-center gap-2 transition transform active:scale-98"
              >
                <span>Checkout Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setIsCartDrawerOpen(false);
                  onNavigate('cart');
                }}
                className="w-full text-center text-xs font-semibold text-slate-600 hover:text-slate-900 py-1"
              >
                View Full Basket
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
