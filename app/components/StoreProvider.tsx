"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getProduct } from "../lib/products";

type CartLine = { id: string; size: string; color: string; quantity: number };
type StoreContextValue = {
  cart: CartLine[];
  wishlist: string[];
  cartCount: number;
  toast: string;
  addToCart: (id: string, size?: string, color?: string) => void;
  removeFromCart: (id: string, size: string, color: string) => void;
  updateQuantity: (id: string, size: string, color: string, quantity: number) => void;
  updateCartColor: (id: string, size: string, currentColor: string, nextColor: string) => void;
  clearCart: () => void;
  toggleWishlist: (id: string) => void;
  showToast: (message: string) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const storedCart = JSON.parse(localStorage.getItem("elan-cart") || "[]") as Array<Partial<CartLine> & { id: string; size: string; quantity: number }>;
      setCart(storedCart.map((line) => ({ ...line, color: line.color ?? getProduct(line.id).colors[0].name })) as CartLine[]);
      setWishlist(JSON.parse(localStorage.getItem("elan-wishlist") || "[]"));
    } catch {
      setCart([]);
      setWishlist([]);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("elan-cart", JSON.stringify(cart));
    localStorage.setItem("elan-wishlist", JSON.stringify(wishlist));
  }, [cart, wishlist, ready]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const addToCart = (id: string, size = "S", color = getProduct(id).colors[0].name) => {
    setCart((lines) => {
      const existing = lines.find((line) => line.id === id && line.size === size && line.color === color);
      if (existing) return lines.map((line) => line === existing ? { ...line, quantity: line.quantity + 1 } : line);
      return [...lines, { id, size, color, quantity: 1 }];
    });
    showToast("쇼핑백에 상품을 담았습니다.");
  };

  const removeFromCart = (id: string, size: string, color: string) => setCart((lines) => lines.filter((line) => !(line.id === id && line.size === size && line.color === color)));
  const updateQuantity = (id: string, size: string, color: string, quantity: number) => setCart((lines) => lines.map((line) => line.id === id && line.size === size && line.color === color ? { ...line, quantity: Math.max(1, quantity) } : line));
  const updateCartColor = (id: string, size: string, currentColor: string, nextColor: string) => setCart((lines) => {
    if (currentColor === nextColor) return lines;
    const source = lines.find((line) => line.id === id && line.size === size && line.color === currentColor);
    const target = lines.find((line) => line.id === id && line.size === size && line.color === nextColor);
    if (!source) return lines;
    if (target) return lines.filter((line) => line !== source).map((line) => line === target ? { ...line, quantity: line.quantity + source.quantity } : line);
    return lines.map((line) => line === source ? { ...line, color: nextColor } : line);
  });
  const toggleWishlist = (id: string) => {
    setWishlist((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  };
  const clearCart = () => setCart([]);

  const value = useMemo(() => ({
    cart,
    wishlist,
    cartCount: cart.reduce((total, line) => total + line.quantity, 0),
    toast,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateCartColor,
    clearCart,
    toggleWishlist,
    showToast,
  }), [cart, wishlist, toast]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
}
