import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

export interface CartItem {
  id: string | number;
  itemId?: string; // used for db reference
  name: string;
  price: number;
  quantity: number;
  type: 'meal' | 'grocery';
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  healthScore?: number;
  imageUrl?: string;
  cuisine?: string;
  category?: string;
  unit?: string;
  description?: string;
}

export interface Address {
  id: string;
  label: string;
  address: string;
  icon: string;
}

export const DEFAULT_ADDRESSES: Address[] = [
  { id: "home", label: "Home", address: "Flat 402, Block A, Green Meadows Apartments, HSR Layout, Bengaluru", icon: "Home" },
  { id: "work", label: "Work", address: "7th Floor, Tower B, Prestige Tech Park, Marathahalli, Bengaluru", icon: "Briefcase" },
];

export function useSwiggyAddresses() {
  const { user } = useAuth();

  return useQuery<Address[]>({
    queryKey: ["swiggy", "addresses"],
    queryFn: async () => {
      // Must have active NutriFlow Swiggy session
      if (!user) {
        return DEFAULT_ADDRESSES;
      }

      const res = await fetch("/api/swiggy/mcp/get_addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        console.warn("Failed to fetch live Swiggy addresses. Falling back to default mock addresses.");
        return DEFAULT_ADDRESSES;
      }

      const data = await res.json().catch(() => null);
      const incoming = data?.addresses || [];

      if (!Array.isArray(incoming) || incoming.length === 0) return DEFAULT_ADDRESSES;

      // Normalize Swiggy address shape to our Address interface
      const normalized: Address[] = incoming.map((a: any, idx: number) => ({
        id: a.id ?? `addr_${idx}`,
        label: a.name ?? a.label ?? (a.isDefault ? "Home" : `Address ${idx + 1}`),
        address: a.address ?? a.description ?? `${a.city ?? ""} ${a.address ?? ""}`,
        icon: a.icon ?? (a.isDefault ? "Home" : "MapPin"),
      }));

      return normalized;
    },
    enabled: true,
    staleTime: 10 * 60 * 1000, 
  });
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, qty?: number) => Promise<void>;
  removeFromCart: (id: string | number) => Promise<void>;
  updateQuantity: (id: string | number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  itemCount: number;
  subtotal: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addresses: Address[];
  selectedAddress: Address;
  setSelectedAddress: (address: Address) => void;
  deliveryEstimate: string;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: liveAddresses } = useSwiggyAddresses();
  const addresses = liveAddresses || DEFAULT_ADDRESSES;
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address>(DEFAULT_ADDRESSES[0]);

  useEffect(() => {
    if (liveAddresses && liveAddresses.length > 0) {
      setSelectedAddress((current) => {
        const exists = liveAddresses.some((a) => a.id === current.id);
        return exists ? current : liveAddresses[0];
      });
    }
  }, [liveAddresses]);

  const getCartKey = () => user ? `nutriflow_cart_${user.id}` : `nutriflow_cart_guest`;

  // Sync cart from DB when user changes
  useEffect(() => {
    if (user) {
      loadCartFromDb();
    } else {
      loadGuestCart();
    }
  }, [user]);

  const loadGuestCart = () => {
    try {
      const raw = localStorage.getItem("nutriflow_cart_guest");
      if (raw) {
        setItems(JSON.parse(raw));
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    }
  };

  const loadCartFromDb = async () => {
    const userId = user?.id;
    const cartKey = userId ? `nutriflow_cart_${userId}` : `nutriflow_cart_guest`;

    // 1. Immediately populate from user-scoped localStorage so UI is instant
    let localItems: CartItem[] = [];
    try {
      const raw = localStorage.getItem(cartKey);
      if (raw) {
        localItems = JSON.parse(raw);
        setItems(localItems);
      }
    } catch {
      // ignore
    }

    // 2. Merge guest items if present (when transitioning from guest to logged-in)
    if (userId) {
      try {
        const guestRaw = localStorage.getItem("nutriflow_cart_guest");
        if (guestRaw) {
          const guestItems: CartItem[] = JSON.parse(guestRaw);
          if (guestItems.length > 0) {
            // Merge guest items into localItems
            const merged = [...localItems];
            for (const gi of guestItems) {
              const existingIndex = merged.findIndex(i => String(i.id) === String(gi.id));
              if (existingIndex > -1) {
                merged[existingIndex].quantity += gi.quantity;
              } else {
                merged.push(gi);
              }
            }
            localItems = merged;
            setItems(localItems);
            localStorage.setItem(cartKey, JSON.stringify(localItems));

            // Clear guest cart
            localStorage.removeItem("nutriflow_cart_guest");
          }
        }
      } catch (e) {
        console.warn("[useCart] Merging guest cart failed (non-critical):", e);
      }
    }

    // 3. Background: fetch from NutriFlow backend API and merge
    try {
      const res = await fetch("/api/cart", {
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      if (res.ok) {
        const dbItems = await res.json();
        if (Array.isArray(dbItems) && dbItems.length > 0) {
          const mapped: CartItem[] = dbItems.map((row: any) => ({
            id: row.itemId || row.id,
            itemId: String(row.id),
            name: row.name,
            price: row.price,
            quantity: row.quantity,
            type: row.type,
            calories: row.calories,
            protein: row.protein,
            carbs: row.carbs,
            fat: row.fat,
            healthScore: row.healthScore,
            imageUrl: row.imageUrl,
            cuisine: row.cuisine,
            category: row.category,
            unit: row.unit,
            description: row.description,
          }));

          const dbIds = new Set(mapped.map(m => String(m.id)));
          const localOnly = localItems.filter(li => !dbIds.has(String(li.id)));
          const merged = [...mapped, ...localOnly];
          setItems(merged);
          localStorage.setItem(cartKey, JSON.stringify(merged));
          console.log("[useCart] Cart loaded from NutriFlow backend:", dbItems.length, "items");
        }
      }
    } catch (e) {
      console.warn("[useCart] Background API cart load failed (non-critical):", e);
    }
  };

  const addToCart = async (newItem: Omit<CartItem, 'quantity'>, qty = 1) => {
    const itemIdStr = String(newItem.id);
    const existingIndex = items.findIndex(item => String(item.id) === itemIdStr);
    let updated: CartItem[];

    if (existingIndex > -1) {
      updated = [...items];
      updated[existingIndex].quantity += qty;
    } else {
      updated = [...items, { ...newItem, quantity: qty }];
    }

    setItems(updated);
    localStorage.setItem(getCartKey(), JSON.stringify(updated));

    // Persist to NutriFlow backend if logged in
    if (user) {
      try {
        await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            itemId: itemIdStr,
            name: newItem.name,
            price: newItem.price,
            quantity: qty,
            type: newItem.type,
            calories: newItem.calories,
            protein: newItem.protein,
            carbs: newItem.carbs,
            fat: newItem.fat,
            healthScore: newItem.healthScore,
            imageUrl: newItem.imageUrl,
            cuisine: newItem.cuisine,
            category: newItem.category,
            unit: newItem.unit,
            description: newItem.description,
          }),
        });
      } catch (e) {
        console.warn("[useCart] Failed to save added item to backend:", e);
      }
    }
  };

  const removeFromCart = async (id: string | number) => {
    const idStr = String(id);
    const updated = items.filter(item => String(item.id) !== idStr);
    setItems(updated);
    localStorage.setItem(getCartKey(), JSON.stringify(updated));

    if (user) {
      try {
        await fetch(`/api/cart/${encodeURIComponent(idStr)}`, {
          method: "DELETE",
          credentials: "include",
        });
      } catch (e) {
        console.warn("[useCart] Failed to remove item from backend:", e);
      }
    }
  };

  const updateQuantity = async (id: string | number, quantity: number) => {
    const idStr = String(id);
    if (quantity <= 0) {
      await removeFromCart(id);
      return;
    }

    const updated = items.map(item => String(item.id) === idStr ? { ...item, quantity } : item);
    setItems(updated);
    localStorage.setItem(getCartKey(), JSON.stringify(updated));

    if (user) {
      try {
        await fetch(`/api/cart/${encodeURIComponent(idStr)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ quantity }),
        });
      } catch (e) {
        console.warn("[useCart] Failed to update item quantity in backend:", e);
      }
    }
  };

  const clearCart = async () => {
    setItems([]);
    localStorage.removeItem(getCartKey());

    if (user) {
      try {
        await fetch("/api/cart", {
          method: "DELETE",
          credentials: "include",
        });
      } catch (e) {
        console.warn("[useCart] Failed to clear cart in backend:", e);
      }
    }
  };

  // Derive counts and sums
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const totalCalories = items.reduce((sum, item) => sum + ((item.calories || 0) * item.quantity), 0);
  const totalProtein = items.reduce((sum, item) => sum + ((item.protein || 0) * item.quantity), 0);
  const totalCarbs = items.reduce((sum, item) => sum + ((item.carbs || 0) * item.quantity), 0);
  const totalFat = items.reduce((sum, item) => sum + ((item.fat || 0) * item.quantity), 0);

  // Swiggy-like pricing metrics
  const deliveryFee = subtotal > 499 ? 0 : 35; // Free delivery for high orders
  const platformFee = 5;
  const discount = subtotal > 300 ? Math.round(subtotal * 0.1) : 0; // 10% wellness discount
  const totalAmount = Math.max(0, subtotal + deliveryFee + platformFee - discount);

  // Delivery time estimate based on items
  const deliveryEstimate = items.length === 0 
    ? "25-35 min" 
    : items.some(item => item.type === 'meal') 
      ? "30-40 min" 
      : "45-60 min";

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        isCartOpen,
        setIsCartOpen,
        addresses,
        selectedAddress,
        setSelectedAddress,
        deliveryEstimate,
        deliveryFee,
        platformFee,
        discount,
        totalAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
