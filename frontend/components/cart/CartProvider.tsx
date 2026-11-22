"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiFetch } from "@/lib/client-api";

type CartState = {
  count: number;                       // how many different products are in the cart
  setCount: (count: number) => void;
};

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [count, setCount] = useState(0);
  const role = user?.role;

  // only customers have a cart. For everyone else the count is 0
  useEffect(() => {
    if (loading) return;
    if (role !== "customer") {
      setCount(0);
      return;
    }
    let cancelled = false;
    apiFetch<{ itemCount: number }>("/customer/cart")
      .then((response) => {
        if (!cancelled) setCount(response.result.itemCount);
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [loading, role]);

  const value = useMemo(() => ({ count, setCount }), [count]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}