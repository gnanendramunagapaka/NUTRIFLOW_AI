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
  city?: string;
  isDefault?: boolean;
}

export const DEFAULT_ADDRESSES: Address[] = [];

/**
 * Normalizes live Swiggy addresses from raw API/MCP responses.
 * Strict rules:
 * 1. Prefer top-level response.structuredContent.addresses when it is a non-empty array.
 * 2. Also support result.structuredContent.addresses if that shape is used elsewhere.
 * 3. Preserve existing supported response shapes (result.addresses, data.addresses, direct array, etc.).
 * 4. Normalize each address using real fields: id, addressLine, addressCategory, addressTag.
 * 5. Never parse prose text as the primary source when structuredContent.addresses is available.
 * 6. Never hardcode address IDs or use placeholder IDs ('home', 'work', 'mock').
 */
export function extractFrontendSwiggyAddresses(data: unknown): Address[] {
  if (!data || typeof data !== "object") return [];

  const obj = data as Record<string, unknown>;
  let incoming: any[] = [];

  // 1. Prefer top-level response.structuredContent.addresses when it is a non-empty array
  if (
    obj.structuredContent &&
    typeof obj.structuredContent === "object" &&
    Array.isArray((obj.structuredContent as any).addresses) &&
    (obj.structuredContent as any).addresses.length > 0
  ) {
    incoming = (obj.structuredContent as any).addresses;
  }
  // 2. Also support result.structuredContent.addresses if that shape is used elsewhere
  else if (
    obj.result &&
    typeof obj.result === "object" &&
    (obj.result as any).structuredContent &&
    typeof (obj.result as any).structuredContent === "object" &&
    Array.isArray((obj.result as any).structuredContent.addresses) &&
    (obj.result as any).structuredContent.addresses.length > 0
  ) {
    incoming = (obj.result as any).structuredContent.addresses;
  }
  // 3. Preserve existing supported response shapes that are already intentionally handled
  else if (obj.result && typeof obj.result === "object" && Array.isArray((obj.result as any).addresses) && (obj.result as any).addresses.length > 0) {
    incoming = (obj.result as any).addresses;
  } else if (obj.data && typeof obj.data === "object" && Array.isArray((obj.data as any).addresses) && (obj.data as any).addresses.length > 0) {
    incoming = (obj.data as any).addresses;
  } else if (Array.isArray(obj.addresses) && obj.addresses.length > 0) {
    incoming = obj.addresses;
  } else if (Array.isArray(data) && (data as any[]).length > 0) {
    incoming = data as any[];
  } else if (obj.data && Array.isArray(obj.data) && (obj.data as any[]).length > 0) {
    incoming = obj.data as any[];
  }
  // 5. Fallback: only if no structured addresses found anywhere, check for JSON content text (never parse prose)
  else if (Array.isArray(obj.content) && obj.content.length > 0) {
    const first = obj.content[0];
    if (first && typeof first === "object" && typeof (first as any).text === "string") {
      try {
        const parsed = JSON.parse((first as any).text);
        if (parsed && typeof parsed === "object") {
          if (Array.isArray(parsed.addresses) && parsed.addresses.length > 0) {
            incoming = parsed.addresses;
          } else if (Array.isArray(parsed) && parsed.length > 0) {
            incoming = parsed;
          }
        }
      } catch {
        // Content text is prose markdown (e.g. "Found 4 saved addresses..."), ignore it.
      }
    }
  }

  if (!Array.isArray(incoming) || incoming.length === 0) return [];

  // Resolution handling:
  // Check top-level or result resolution
  const resolution =
    (obj.structuredContent as any)?.resolution ??
    (obj.result as any)?.structuredContent?.resolution ??
    obj.resolution ??
    (obj.result as any)?.resolution;
  const needsClarification = Boolean(resolution?.needsUserClarification);
  const defaultAddressId = typeof resolution?.defaultAddressId === "string" ? resolution.defaultAddressId.trim() : undefined;

  // Normalize each address using real fields: id, addressLine, addressCategory, addressTag
  const normalized: Address[] = [];
  for (let idx = 0; idx < incoming.length; idx++) {
    const a = incoming[idx];
    if (!a || typeof a !== "object") continue;

    const rawId = a.id ?? a.address_id ?? a._id;
    if (rawId == null) continue;
    const id = String(rawId).trim();
    if (!id) continue;

    // Never accept dummy placeholder IDs
    const lowerId = id.toLowerCase();
    if (lowerId === "home" || lowerId === "work" || lowerId === "mock") continue;

    const rawCategory = typeof a.addressCategory === "string" ? a.addressCategory.trim() : "";
    const rawTag = typeof a.addressTag === "string" ? a.addressTag.trim() : "";
    const rawLabel = typeof a.label === "string" ? a.label.trim() : "";
    const rawName = typeof a.name === "string" ? a.name.trim() : "";

    // Label preference: addressTag > addressCategory > label > name
    const label = rawTag || rawCategory || rawLabel || rawName || `Address ${idx + 1}`;

    const rawAddressLine =
      (typeof a.addressLine === "string" && a.addressLine.trim()) ||
      (typeof a.address_line === "string" && a.address_line.trim()) ||
      (typeof a.address === "string" && a.address.trim()) ||
      (typeof a.formatted_address === "string" && a.formatted_address.trim()) ||
      (typeof a.city === "string" && a.city.trim() ? a.city.trim() : "");
    const addressText = rawAddressLine || label || "Address on file";

    // Icon derivation from addressCategory and addressTag
    const lowerCategory = rawCategory.toLowerCase();
    const lowerTag = rawTag.toLowerCase();
    const lowerLabel = label.toLowerCase();
    const icon =
      lowerTag.includes("work") || lowerCategory.includes("work") || lowerLabel.includes("work")
        ? "Briefcase"
        : lowerTag.includes("home") || lowerCategory.includes("home") || lowerLabel.includes("home")
        ? "Home"
        : "MapPin";

    const isExplicitDefault = Boolean(
      a.isDefault === true ||
      a.is_default === true ||
      a.default === true ||
      a.is_default === 1 ||
      a.default === 1
    );
    const isEnvelopeDefault = !needsClarification && defaultAddressId ? id === defaultAddressId : false;
    const isDefault = isExplicitDefault || isEnvelopeDefault;

    normalized.push({
      id,
      label,
      address: addressText,
      icon,
      city: typeof a.city === "string" ? a.city.trim() : undefined,
      isDefault,
    });
  }

  return normalized;
}

export function useSwiggyAddresses() {
  const { user } = useAuth();

  return useQuery<Address[]>({
    queryKey: ["swiggy", "addresses"],
    queryFn: async () => {
      // Must have active NutriFlow Swiggy session
      if (!user) {
        return [];
      }

      // Try primary production tool route first, fallback to legacy proxy route if needed
      let res = await fetch("/api/swiggy/mcp/food/get_addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({}),
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch("/api/swiggy/mcp/get_addresses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({}),
        }).catch(() => null);
      }

      if (!res || !res.ok) {
        console.warn("Failed to fetch live Swiggy addresses.");
        return [];
      }

      const data = await res.json().catch(() => null);
      return extractFrontendSwiggyAddresses(data);
    },
    enabled: Boolean(user),
    staleTime: 10 * 60 * 1000, 
  });
}

interface CartContextType {
  items: CartItem[];
  mealItems: CartItem[];
  groceryItems: CartItem[];
  mealSubtotal: number;
  grocerySubtotal: number;
  addToCart: (item: Omit<CartItem, 'quantity'>, qty?: number) => Promise<void>;
  removeFromCart: (id: string | number) => Promise<void>;
  updateQuantity: (id: string | number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  clearDomainCart: (type: 'meal' | 'grocery') => Promise<void>;
  itemCount: number;
  subtotal: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addresses: Address[];
  selectedAddress: Address | null;
  setSelectedAddress: (address: Address | null) => void;
  isLoadingAddresses: boolean;
  deliveryEstimate: string;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  totalAmount: number;
}

/**
 * Pure address resolution algorithm for NutriFlow explicit address selection.
 * - Zero addresses -> null
 * - Exactly 1 address -> auto-select (zero ambiguity)
 * - Multiple addresses -> preserve existing valid selection or restore from session; otherwise null (explicit user selection required)
 */
export function resolveInitialAddress(
  liveAddresses: Address[] | undefined | null,
  currentSelected: Address | null,
  savedId?: string | null
): Address | null {
  if (!liveAddresses || liveAddresses.length === 0) {
    return null;
  }

  if (liveAddresses.length === 1) {
    return liveAddresses[0];
  }

  // Multiple addresses:
  // 1. If currently selected address exists in live addresses, keep it
  if (currentSelected?.id) {
    const matched = liveAddresses.find((a) => a.id === currentSelected.id);
    if (matched) return matched;
  }

  // 2. If stored in session, restore it
  if (savedId) {
    const isDummy = savedId.toLowerCase() === "home" || savedId.toLowerCase() === "work" || savedId.toLowerCase() === "mock";
    if (!isDummy) {
      const matched = liveAddresses.find((a) => a.id === savedId);
      if (matched) return matched;
    }
  }

  // 3. Otherwise: do NOT silently pick one; require explicit user selection
  return null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: liveAddresses, isLoading: isLoadingAddresses } = useSwiggyAddresses();
  const addresses = liveAddresses ?? [];
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedAddress, setSelectedAddressState] = useState<Address | null>(() => {
    if (typeof window !== "undefined") {
      const savedId = sessionStorage.getItem("nutriflow_selected_address_id");
      if (savedId && savedId !== "home" && savedId !== "work" && savedId !== "mock") {
        return { id: savedId, label: "Saved Location", address: "", icon: "MapPin" };
      }
    }
    return null;
  });

  const setSelectedAddress = (addr: Address | null) => {
    const isDummy = !addr?.id || addr.id === "home" || addr.id === "work" || addr.id === "mock";
    const sanitized = isDummy ? null : addr;
    setSelectedAddressState(sanitized);
    if (typeof window !== "undefined") {
      if (sanitized?.id) {
        sessionStorage.setItem("nutriflow_selected_address_id", sanitized.id);
      } else {
        sessionStorage.removeItem("nutriflow_selected_address_id");
      }
    }
  };

  useEffect(() => {
    if (!liveAddresses || liveAddresses.length === 0) {
      setSelectedAddressState(null);
      return;
    }

    if (liveAddresses.length === 1) {
      setSelectedAddress(liveAddresses[0]);
      return;
    }

    setSelectedAddressState((current) => {
      const savedId = typeof window !== "undefined" ? sessionStorage.getItem("nutriflow_selected_address_id") : null;
      return resolveInitialAddress(liveAddresses, current, savedId);
    });
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

  const clearDomainCart = async (type: 'meal' | 'grocery') => {
    const updated = items.filter(item => item.type !== type);
    setItems(updated);
    localStorage.setItem(getCartKey(), JSON.stringify(updated));

    if (user) {
      const removedItems = items.filter(item => item.type === type);
      for (const item of removedItems) {
        try {
          await fetch(`/api/cart/${encodeURIComponent(String(item.id))}`, {
            method: "DELETE",
            credentials: "include",
          });
        } catch (e) {
          // ignore
        }
      }
    }
  };

  // Derive counts and sums
  const mealItems = items.filter(item => item.type === 'meal');
  const groceryItems = items.filter(item => item.type === 'grocery');
  const mealSubtotal = mealItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const grocerySubtotal = groceryItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const totalCalories = items.reduce((sum, item) => sum + ((item.calories || 0) * item.quantity), 0);
  const totalProtein = items.reduce((sum, item) => sum + ((item.protein || 0) * item.quantity), 0);
  const totalCarbs = items.reduce((sum, item) => sum + ((item.carbs || 0) * item.quantity), 0);
  const totalFat = items.reduce((sum, item) => sum + ((item.fat || 0) * item.quantity), 0);

  // Real cart item totals only; fees and live delivery estimates are calculated at checkout
  const deliveryFee = 0;
  const platformFee = 0;
  const discount = 0;
  const totalAmount = subtotal;

  // Delivery time estimate neutral placeholder
  const deliveryEstimate = "Delivery estimate shown at checkout";

  return (
    <CartContext.Provider
      value={{
        items,
        mealItems,
        groceryItems,
        mealSubtotal,
        grocerySubtotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        clearDomainCart,
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
        isLoadingAddresses,
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
