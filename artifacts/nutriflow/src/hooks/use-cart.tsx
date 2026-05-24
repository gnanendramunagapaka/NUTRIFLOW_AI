import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
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

const DEFAULT_ADDRESSES: Address[] = [
  { id: "home", label: "Home", address: "Flat 402, Block A, Green Meadows Apartments, HSR Layout, Bengaluru", icon: "Home" },
  { id: "work", label: "Work", address: "7th Floor, Tower B, Prestige Tech Park, Marathahalli, Bengaluru", icon: "Briefcase" },
];

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
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address>(DEFAULT_ADDRESSES[0]);

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

            // Sync merged guest items to Supabase
            const { data: sbUser } = await supabase.auth.getUser();
            if (sbUser?.user) {
              for (const item of guestItems) {
                const itemIdStr = String(item.id);
                // Check if already in DB
                const { data: existing } = await supabase
                  .from("cart_items")
                  .select("*")
                  .eq("item_id", itemIdStr)
                  .eq("user_id", sbUser.user.id)
                  .maybeSingle();

                if (existing) {
                  await supabase
                    .from("cart_items")
                    .update({ quantity: existing.quantity + item.quantity })
                    .eq("id", existing.id);
                } else {
                  await supabase
                    .from("cart_items")
                    .insert({
                      user_id: sbUser.user.id,
                      item_id: itemIdStr,
                      name: item.name,
                      price: item.price,
                      quantity: item.quantity,
                      type: item.type,
                      calories: item.calories,
                      protein: item.protein,
                      carbs: item.carbs,
                      fat: item.fat,
                      health_score: item.healthScore,
                      image_url: item.imageUrl,
                      cuisine: item.cuisine,
                      category: item.category,
                      unit: item.unit,
                      description: item.description,
                    });
                }
              }
            }
            // Clear guest cart
            localStorage.removeItem("nutriflow_cart_guest");
          }
        }
      } catch (e) {
        console.warn("[useCart] Merging guest cart failed (non-critical):", e);
      }
    }

    // 3. Background: fetch from Supabase and merge
    try {
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (!sbUser) return;

      const { data: dbItems, error } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", sbUser.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("[useCart] Supabase cart fetch error (non-critical):", error.message);
        return;
      }

      if (dbItems && dbItems.length > 0) {
        // Map DB rows to CartItem shape
        const mapped: CartItem[] = dbItems.map((row: any) => ({
          id: row.item_id || row.id,
          itemId: row.id,
          name: row.name,
          price: row.price,
          quantity: row.quantity,
          type: row.type,
          calories: row.calories,
          protein: row.protein,
          carbs: row.carbs,
          fat: row.fat,
          healthScore: row.health_score,
          imageUrl: row.image_url,
          cuisine: row.cuisine,
          category: row.category,
          unit: row.unit,
          description: row.description,
        }));

        // Merge: DB is source of truth; keep local items that aren't in DB
        const dbIds = new Set(mapped.map(m => String(m.id)));
        const localOnly = localItems.filter(li => !dbIds.has(String(li.id)));
        const merged = [...mapped, ...localOnly];
        setItems(merged);
        localStorage.setItem(cartKey, JSON.stringify(merged));
      }

      console.log("[useCart] Cart loaded from Supabase:", dbItems?.length ?? 0, "items");
    } catch (e) {
      console.warn("[useCart] Background DB cart load failed (non-critical):", e);
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

    // Persist to Supabase if logged in
    if (user) {
      try {
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (sbUser) {
          const { data: existing, error: fetchErr } = await supabase
            .from("cart_items")
            .select("*")
            .eq("item_id", itemIdStr)
            .eq("user_id", sbUser.id)
            .maybeSingle();

          if (fetchErr) throw fetchErr;

          if (existing) {
            const { error: updateErr } = await supabase
              .from("cart_items")
              .update({ quantity: existing.quantity + qty })
              .eq("id", existing.id);
            if (updateErr) throw updateErr;
          } else {
            const { error: insertErr } = await supabase
              .from("cart_items")
              .insert({
                user_id: sbUser.id,
                item_id: itemIdStr,
                name: newItem.name,
                price: newItem.price,
                quantity: qty,
                type: newItem.type,
                calories: newItem.calories,
                protein: newItem.protein,
                carbs: newItem.carbs,
                fat: newItem.fat,
                health_score: newItem.healthScore,
                image_url: newItem.imageUrl,
                cuisine: newItem.cuisine,
                category: newItem.category,
                unit: newItem.unit,
                description: newItem.description,
              });
            if (insertErr) throw insertErr;
          }
        }
      } catch (e) {
        console.error("[useCart] Failed to save added item to Supabase:", e);
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
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (!sbUser) return;
        const { error } = await supabase
          .from("cart_items")
          .delete()
          .eq("item_id", idStr)
          .eq("user_id", sbUser.id);
        if (error) console.warn("[useCart] removeFromCart DB error (non-critical):", error.message);
      } catch (e) {
        console.warn("[useCart] Failed to remove item from Supabase (non-critical):", e);
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
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (!sbUser) return;
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity })
          .eq("item_id", idStr)
          .eq("user_id", sbUser.id);
        if (error) console.warn("[useCart] updateQuantity DB error (non-critical):", error.message);
      } catch (e) {
        console.warn("[useCart] Failed to update item quantity in Supabase (non-critical):", e);
      }
    }
  };

  const clearCart = async () => {
    setItems([]);
    localStorage.removeItem(getCartKey());

    if (user) {
      try {
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (sbUser) {
          const { error } = await supabase
            .from("cart_items")
            .delete()
            .eq("user_id", sbUser.id);
          if (error) throw error;
        }
      } catch (e) {
        console.error("[useCart] Failed to clear Supabase cart:", e);
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
        addresses: DEFAULT_ADDRESSES,
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
