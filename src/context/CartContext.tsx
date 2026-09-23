import React, { createContext, useContext, useEffect, useState } from 'react';
import { CartItem, PromoCode } from '../types/cart';
import { useAuth } from './AuthContext';

const LOCAL_CART_KEY = 'cardly_shopping_cart';

const VALID_PROMOS: Record<string, PromoCode> = {
  'CARDLY20': { code: 'CARDLY20', discountPercentage: 20, description: '20% off your entire order' },
  'LOVE10': { code: 'LOVE10', discountPercentage: 10, description: '10% off greeting cards' },
  'FREESHIP': { code: 'FREESHIP', discountPercentage: 15, description: '15% off discount covering shipping' },
};

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  promoCode: PromoCode | null;
  promoInput: string;
  setPromoInput: (val: string) => void;
  applyPromoCode: (code: string) => { success: boolean; message: string };
  removePromoCode: () => void;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [promoCode, setPromoCode] = useState<PromoCode | null>(null);
  const [promoInput, setPromoInput] = useState('');
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Could not save cart locally:', e);
    }
  }, [items, user]);

  const addItem = (itemWithoutId: Omit<CartItem, 'id'>) => {
    const newItem: CartItem = {
      ...itemWithoutId,
      id: `cart_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setItems((prev) => [newItem, ...prev]);
    setIsCartDrawerOpen(true);
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setItems([]);
    setPromoCode(null);
  };

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const subtotal = items.reduce((acc, item) => {
    const addonsTotal = item.addons.reduce((sum, a) => sum + a.price, 0);
    return acc + (item.unitPrice + addonsTotal) * item.quantity;
  }, 0);

  const deliveryFee = items.length > 0 ? 1.25 : 0;
  const discount = promoCode ? (subtotal * promoCode.discountPercentage) / 100 : 0;
  const total = Math.max(0, subtotal - discount + deliveryFee);

  const applyPromoCode = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (VALID_PROMOS[clean]) {
      setPromoCode(VALID_PROMOS[clean]);
      return { success: true, message: `Promo applied: ${VALID_PROMOS[clean].description}` };
    }
    return { success: false, message: 'Invalid promo code. Try "CARDLY20" for 20% off.' };
  };

  const removePromoCode = () => {
    setPromoCode(null);
    setPromoInput('');
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        discount,
        deliveryFee,
        total,
        promoCode,
        promoInput,
        setPromoInput,
        applyPromoCode,
        removePromoCode,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
