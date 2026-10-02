import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  PageContainer,
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
  Clock,
  CheckCircle2,
  RefreshCw,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { MOCK_INSTAMART_GROCERIES } from "@/lib/mockData";

import { ExploreDomainTabs } from "@/components/food/ExploreDomainTabs";
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

export default function Grocery() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<InstamartProductData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"catalog" | "checklist">("catalog");

  const { addToCart, setIsCartOpen, items: cartItems } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  const [dbChecklist, setDbChecklist] = useState<any[]>([]);
  const [loadingChecklist, setLoadingChecklist] = useState(true);

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
      console.warn("[Grocery] loadChecklist non-critical:", e);
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

  // Filter Instamart Products
  const filteredProducts: InstamartProductData[] = useMemo(() => {
    return MOCK_INSTAMART_GROCERIES.map((p) => ({
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
    });
  }, [activeCategory, search]);

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
    <Layout>
      <PageContainer className="space-y-6 sm:space-y-8">
        {/* ─── 1. Header ─── */}
        <header className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Instamart Groceries
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Superfast grocery delivery & everyday essentials delivered in 15–20 minutes.
              </p>
            </div>

            {/* Swiggy Attribution */}
            <div className="shrink-0 self-start sm:self-auto">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5 shadow-2xs">
                ⚡ Powered by Swiggy Instamart
              </span>
            </div>
          </div>

          {/* ─── 2. Domain Navigation ─── */}
          <div className="pt-1">
            <ExploreDomainTabs activeDomain="instamart" />
          </div>

          {/* ─── 3. View Switcher (Catalog vs Checklist) ─── */}
          <div className="flex items-center gap-2 pt-1 border-b border-border/60 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "catalog"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              )}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Instamart Catalog</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("checklist")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "checklist"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              )}
            >
              <ListChecks className="h-3.5 w-3.5" />
              <span>Weekly Checklist ({dbChecklist.length})</span>
            </button>
          </div>

          {/* ─── 4. Search Bar (Catalog mode) ─── */}
          {activeTab === "catalog" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search groceries, dairy, produce, snacks..."
                  className="pl-11 pr-10 py-5 rounded-2xl bg-card border-border/80 focus-visible:ring-emerald-500 text-xs sm:text-sm shadow-2xs"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                    aria-label="Clear search query"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Category Filter Shortcuts */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {INSTAMART_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setActiveCategory(cat.value)}
                    className={cn(
                      "whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border cursor-pointer shrink-0 shadow-2xs",
                      activeCategory === cat.value
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-card text-foreground/80 hover:bg-muted border-border/80"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* ─── 5. Main Catalog Content ─── */}
        {activeTab === "catalog" ? (
          filteredProducts.length === 0 ? (
            /* Empty State */
            <AppCard className="p-8 sm:p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-600">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  No products found for this category
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  No grocery items matching "{search || activeCategory}". Try searching for another item or resetting filters.
                </p>
              </div>
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
                subtitle="Fresh groceries delivered in 15–20 minutes by Swiggy Instamart"
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
          )
        ) : (
          /* ─── 6. Weekly Checklist View ─── */
          <div className="space-y-6">
            <AppCard className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <ListChecks className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground">
                      Weekly Grocery Checklist
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Track collected grocery items or transfer them to Instamart.
                    </p>
                  </div>
                </div>

                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                  {dbChecklist.filter((i) => i.isChecked).length} / {dbChecklist.length} checked
                </span>
              </div>

              {loadingChecklist ? (
                <div className="space-y-2 py-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 rounded-xl" />
                  ))}
                </div>
              ) : dbChecklist.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                  <p className="font-semibold text-foreground">No items on your checklist</p>
                  <p>Items added via AI Copilot or grocery planning will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50 text-xs">
                  {dbChecklist.map((item) => (
                    <div
                      key={item.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`chk-${item.id}`}
                          checked={item.isChecked}
                          onCheckedChange={() => handleToggleChecklist(item)}
                          className="data-[state=checked]:bg-emerald-600 border-border/80"
                        />
                        <label
                          htmlFor={`chk-${item.id}`}
                          className={cn(
                            "font-semibold text-foreground cursor-pointer",
                            item.isChecked && "line-through text-muted-foreground"
                          )}
                        >
                          {item.name}
                        </label>
                      </div>

                      <span className="text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                        {item.quantity || "1"} {item.unit || "unit"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </AppCard>
          </div>
        )}

        {/* ─── 7. Product Detail Sheet ─── */}
        <InstamartProductDetailSheet
          product={selectedProduct}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          isAddedToCart={
            selectedProduct
              ? cartItems.some((i) => i.id === `grocery-${selectedProduct.id}`)
              : false
          }
        />
      </PageContainer>
    </Layout>
  );
}
