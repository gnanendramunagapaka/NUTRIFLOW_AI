import { useState, useEffect, useMemo } from "react";
import {
  SectionHeader,
  AppCard,
  PrimaryButton,
  SecondaryButton,
  Pill,
} from "@/components/layout/primitives";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  X,
  ShoppingBag,
  CheckCircle2,
  RefreshCw,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useRecommendations, type InstamartRecommendationResponse } from "@/hooks/use-recommendations";
import { AddressSelectionPrompt } from "@/components/address/AddressSelectionPrompt";
import { MOCK_INSTAMART_GROCERIES } from "@/lib/mockData";
import {
  InstamartProductCard,
  InstamartProductData,
} from "@/components/instamart/InstamartProductCard";
import { InstamartProductDetailSheet } from "@/components/instamart/InstamartProductDetailSheet";

const INSTAMART_CATEGORIES = [
  { label: "All", value: "all" },
  { label: "Dairy", value: "Dairy" },
  { label: "Fruits & Vegetables", value: "Produce" },
  { label: "Staples", value: "Grains" },
  { label: "Snacks", value: "Snacks" },
  { label: "Beverages", value: "Beverages" },
  { label: "Breakfast", value: "Breakfast" },
  { label: "Pantry", value: "Pantry" },
];

export function InstamartDomainView() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<InstamartProductData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"catalog" | "checklist">("catalog");

  const { addToCart, setIsCartOpen, items: cartItems, addresses, selectedAddress, setSelectedAddress } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  const [dbChecklist, setDbChecklist] = useState<any[]>([]);
  const [loadingChecklist, setLoadingChecklist] = useState(true);

  // Effective query combining search input and category shortcut
  const effectiveQuery = search.trim() || (activeCategory !== "all" ? activeCategory : undefined);

  // Live Swiggy Instamart recommendations
  const {
    data: instamartData,
    isLoading: loadingCatalog,
    error: catalogError,
    refetch: refetchCatalog,
  } = useRecommendations<InstamartRecommendationResponse>("instamart", {
    query: effectiveQuery,
    enabled: activeTab === "catalog",
  });

  // Load database grocery checklist
  const loadChecklist = async () => {
    try {
      if (!user) {
        setDbChecklist([]);
        return;
      }

      const res = await fetch("/api/grocery/list", {
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        setDbChecklist([]);
        return;
      }

      const data = await res.json();
      setDbChecklist(data?.items || []);
    } catch (e) {
      console.warn("[InstamartDomainView] loadChecklist non-critical:", e);
      setDbChecklist([]);
    } finally {
      setLoadingChecklist(false);
    }
  };

  useEffect(() => {
    loadChecklist();
  }, [user]);

  // Toggle checklist item
  const handleToggleChecklist = async (item: any) => {
    const updated = dbChecklist.map((i) =>
      i.id === item.id ? { ...i, isChecked: !i.isChecked } : i
    );
    setDbChecklist(updated);

    try {
      await fetch(`/api/grocery/item/${encodeURIComponent(String(item.id))}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isChecked: !item.isChecked }),
      });
    } catch (e) {
      console.error("Failed to toggle grocery item:", e);
    }
  };

  // Map Live Instamart Recommendations to InstamartProductData
  const liveProducts: InstamartProductData[] = useMemo(() => {
    if (!instamartData?.recommendations) return [];

    return instamartData.recommendations.map((rec) => {
      const c = rec.candidate;
      const meta = c.sourceMetadata;
      const mrp = meta?.mrp;
      const price = c.price ?? mrp ?? 0;
      const discountText =
        mrp && price && mrp > price
          ? `${Math.round(((mrp - price) / mrp) * 100)}% OFF`
          : undefined;

      return {
        id: meta?.productId || c.id,
        name: c.name || "Grocery Item",
        category: c.categoryTags?.[0] || "Grocery",
        quantity: meta?.quantity || "",
        unit: "",
        price: mrp || price,
        discountPrice: price < (mrp || price) ? price : undefined,
        discountText,
        inStock: c.availability !== "unavailable",
        rating: meta?.rating,
        imageUrl: undefined, // Do not fabricate images
        deliveryTime: undefined,
        description: rec.explanation || "Fresh grocery item delivered via Swiggy Instamart",
      };
    });
  }, [instamartData]);

  const isNoSavedAddress =
    (!selectedAddress && addresses.length === 0) ||
    Boolean(catalogError?.message?.includes("No saved delivery addresses"));

  const isClarificationNeeded =
    Boolean(instamartData?.clarificationNeeded) ||
    (!selectedAddress && (instamartData?.availableAddresses?.length ?? addresses.length) > 1);

  // If live API strictly fails with network/server error (and not zero-address/clarification flow), allow fallback to MOCK_INSTAMART_GROCERIES
  const isUsingFallback = Boolean(
    catalogError &&
    !isNoSavedAddress &&
    !isClarificationNeeded &&
    (!instamartData || !instamartData.recommendations)
  );
  const filteredProducts = isUsingFallback
    ? MOCK_INSTAMART_GROCERIES.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        quantity: p.quantity,
        unit: p.unit,
        price: p.price,
        discountPrice: p.discountPrice,
        discountText: p.discountText,
        inStock: p.inStock,
        imageUrl: p.imageUrl,
        deliveryTime: p.deliveryTime || undefined,
        description: p.nutritionNote || "Fresh grocery item delivered via Swiggy Instamart",
      })).filter((p) => {
        const matchesCategory =
          activeCategory === "all" ||
          p.category.toLowerCase().includes(activeCategory.toLowerCase());
        const matchesSearch =
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.category.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
      })
    : liveProducts;

  const handleAddToCart = (product: InstamartProductData) => {
    addToCart({
      id: `grocery-${product.id}`,
      name: product.name,
      price: product.discountPrice || product.price,
      type: "grocery",
      category: product.category,
      unit: product.unit,
      description: product.description,
      imageUrl: product.imageUrl,
    });

    toast({
      title: "Added to Grocery Basket 🛒",
      description: `"${product.name}" added to Swiggy Instamart basket.`,
    });
    setIsCartOpen(true);
  };

  const handleOpenProduct = (product: InstamartProductData) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ─── 1. View Switcher (Catalog vs Checklist) ─── */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("catalog")}
          className={cn(
            "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
            activeTab === "catalog"
              ? "bg-emerald-600 text-white shadow-2xs"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          <span>All Essentials</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("checklist")}
          className={cn(
            "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
            activeTab === "checklist"
              ? "bg-emerald-600 text-white shadow-2xs"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <ListChecks className="h-3.5 w-3.5" />
          <span>Weekly Checklist</span>
          {dbChecklist.length > 0 && (
            <span className="ml-1 text-[10px] bg-background/25 px-1.5 py-0.2 rounded-full font-bold">
              {dbChecklist.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "checklist" ? (
        /* ─── Checklist View ─── */
        <div className="space-y-4">
          <SectionHeader
            title="Smart Grocery Checklist"
            subtitle="Pantry and staple items aligned with your nutrition goals"
          />

          {loadingChecklist ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
          ) : dbChecklist.length === 0 ? (
            <AppCard className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-foreground">Your checklist is up to date</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Items recommended by your wellness profile or added from Instamart will appear here.
              </p>
            </AppCard>
          ) : (
            <div className="space-y-2">
              {dbChecklist.map((item) => (
                <AppCard
                  key={item.id}
                  className={cn(
                    "p-3.5 flex items-center justify-between gap-3 transition-all",
                    item.isChecked && "opacity-60 bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Checkbox
                      id={`check-${item.id}`}
                      checked={item.isChecked}
                      onCheckedChange={() => handleToggleChecklist(item)}
                      className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 cursor-pointer"
                    />
                    <label
                      htmlFor={`check-${item.id}`}
                      className={cn(
                        "text-xs font-semibold text-foreground cursor-pointer truncate",
                        item.isChecked && "line-through text-muted-foreground"
                      )}
                    >
                      {item.name}
                      {item.quantity && (
                        <span className="text-[10px] text-muted-foreground font-normal ml-1.5">
                          ({item.quantity} {item.unit})
                        </span>
                      )}
                    </label>
                  </div>

                  <span className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-0.5 bg-muted rounded-md shrink-0">
                    {item.category || "General"}
                  </span>
                </AppCard>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ─── Catalog View ─── */
        <div className="space-y-6">
          {/* Search & Category Pills */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Instamart groceries, oats, chia seeds, vegetables..."
                className="pl-10 pr-9 h-11 rounded-2xl bg-card border-border/80 focus-visible:ring-emerald-500 text-xs sm:text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Category horizontal scroll */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
              {INSTAMART_CATEGORIES.map((cat) => {
                const isSelected = activeCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setActiveCategory(cat.value)}
                    className={cn(
                      "whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border cursor-pointer shrink-0 shadow-2xs",
                      isSelected
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                        : "bg-card border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Catalog State / Products */}
          {loadingCatalog ? (
            <div className="space-y-4">
              <Skeleton className="h-5 w-48 rounded-lg" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton key={i} className="h-56 rounded-2xl" />
                ))}
              </div>
            </div>
          ) : isNoSavedAddress ? (
            <AddressSelectionPrompt
              domain="instamart"
              availableAddresses={[]}
              onSelectAddress={(addr) => setSelectedAddress(addr)}
            />
          ) : isClarificationNeeded ? (
            <AddressSelectionPrompt
              domain="instamart"
              availableAddresses={instamartData?.availableAddresses || addresses}
              selectedAddressId={selectedAddress?.id}
              onSelectAddress={(addr) => setSelectedAddress(addr)}
            />
          ) : catalogError && !isUsingFallback ? (
            <AppCard className="p-8 sm:p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Unable to load Instamart groceries</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {catalogError.message || "Failed to reach Swiggy Instamart recommendations. Please try again."}
              </p>
              <SecondaryButton
                size="sm"
                onClick={() => refetchCatalog()}
                className="text-xs gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </SecondaryButton>
            </AppCard>
          ) : filteredProducts.length === 0 ? (
            <AppCard className="p-8 sm:p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">No groceries found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No items match your query. Try a different search term or reset filters.
              </p>
              <SecondaryButton
                size="sm"
                onClick={() => {
                  setSearch("");
                  setActiveCategory("all");
                }}
                className="text-xs gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </SecondaryButton>
            </AppCard>
          ) : (
            /* Product Grid */
            <div className="space-y-4">
              <SectionHeader
                title="Popular Everyday Essentials"
                subtitle="Groceries & everyday essentials from Swiggy Instamart."
              />

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filteredProducts.map((product) => {
                  const isAdded = cartItems.some(
                    (i) => i.id === `grocery-${product.id}`
                  );
                  return (
                    <InstamartProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={() => handleAddToCart(product)}
                      onClick={() => handleOpenProduct(product)}
                      isAddedToCart={isAdded}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instamart Product Detail Modal Sheet */}
      <InstamartProductDetailSheet
        product={selectedProduct}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedProduct(null);
        }}
        isAddedToCart={selectedProduct ? cartItems.some((i) => i.id === `grocery-${selectedProduct.id}`) : false}
      />
    </div>
  );
}
