import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Calendar, CheckCircle2, ShoppingCart, Clock, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/use-auth";
import { MOCK_INSTAMART_GROCERIES } from "@/lib/mockData";

export default function Grocery() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addToCart, setIsCartOpen } = useCart();
  
  const [list, setList] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadGroceryList = async () => {
    setIsLoading(true);
    try {
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (!sbUser) {
        setList(null);
        return;
      }

      // Fetch most recent grocery plan for user
      const { data: plans, error: planErr } = await supabase
        .from("grocery_plans")
        .select("*")
        .eq("user_id", sbUser.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (planErr) {
        console.warn("[Grocery] grocery_plans fetch error (non-critical):", planErr.message);
        loadDefaultChecklist();
        return;
      }

      if (!plans || plans.length === 0) {
        loadDefaultChecklist();
        return;
      }

      const plan = plans[0];

      // Fetch grocery items for this plan
      const { data: items, error: itemsErr } = await supabase
        .from("grocery_plan_items")
        .select("*")
        .eq("plan_id", plan.id)
        .order("created_at", { ascending: true });

      if (itemsErr) {
        console.warn("[Grocery] grocery_plan_items fetch error (non-critical):", itemsErr.message);
      }

      const mappedItems = (items || []).map((row: any) => {
        const mockMatch = MOCK_INSTAMART_GROCERIES.find(m => m.name.toLowerCase().includes(row.name.toLowerCase()));
        return {
          id: row.id,
          name: row.name,
          category: row.category || "Pantry",
          quantity: row.quantity || "1",
          unit: row.unit || "unit",
          isChecked: row.is_checked || false,
          nutritionNote: row.nutrition_note || null,
          price: mockMatch ? (mockMatch.discountPrice || mockMatch.price) : 49,
        };
      });

      setList({
        id: plan.id,
        weekOf: plan.week_of || new Date().toISOString().split("T")[0],
        items: mappedItems,
        totalItems: mappedItems.length,
        checkedItems: mappedItems.filter((i: any) => i.isChecked).length,
      });
    } catch (e) {
      console.warn("[Grocery] loadGroceryList failed (non-critical):", e);
      loadDefaultChecklist();
    } finally {
      setIsLoading(false);
    }
  };

  const loadDefaultChecklist = () => {
    // Populate rich defaults if user has no DB plan
    const defaultItems = MOCK_INSTAMART_GROCERIES.slice(0, 5).map((row, idx) => ({
      id: `default-${idx}`,
      name: row.name,
      category: row.category,
      quantity: row.quantity,
      unit: row.unit,
      isChecked: false,
      nutritionNote: row.nutritionNote,
      price: row.discountPrice || row.price,
    }));
    setList({
      id: "default-plan",
      weekOf: new Date().toISOString().split("T")[0],
      items: defaultItems,
      totalItems: defaultItems.length,
      checkedItems: 0,
    });
  };

  useEffect(() => {
    loadGroceryList();
  }, []);

  const handleToggle = async (id: string | number) => {
    if (!list) return;
    const targetItem = list.items.find((i: any) => i.id === id);
    if (!targetItem) return;

    // Optimistic update
    const updatedItems = list.items.map((i: any) =>
      i.id === id ? { ...i, isChecked: !i.isChecked } : i
    );
    setList({
      ...list,
      items: updatedItems,
      checkedItems: updatedItems.filter((i: any) => i.isChecked).length,
    });

    if (String(id).startsWith("default-")) return; // skip DB write for mock defaults

    try {
      const { error } = await supabase
        .from("grocery_plan_items")
        .update({ is_checked: !targetItem.isChecked })
        .eq("id", id);
      if (error) throw error;
    } catch (e) {
      console.error("Failed to toggle grocery check state:", e);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const goal = user?.goal || "Stay Healthy";
      const dietaryPreferences = user?.dietaryPreferences || [];
      const budget = user?.budget ? String(user.budget) : undefined;

      const res = await fetch("/api/grocery/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          goal,
          dietaryPreferences,
          budget,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate plan");

      const generated = await res.json();
      
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (!sbUser) return;

      const weekOf = new Date().toISOString().split("T")[0];
      const { data: newPlan, error: planErr } = await supabase
        .from("grocery_plans")
        .insert({
          user_id: sbUser.id,
          week_of: weekOf,
        })
        .select()
        .single();

      if (planErr) throw planErr;

      const itemsToInsert = (generated.items || []).map((item: any) => ({
        plan_id: newPlan.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        is_checked: false,
        nutrition_note: item.nutritionNote || null,
      }));

      if (itemsToInsert.length > 0) {
        const { error: itemsErr } = await supabase
          .from("grocery_plan_items")
          .insert(itemsToInsert);
        if (itemsErr) throw itemsErr;
      }

      toast({ title: "Grocery list generated!" });
      await loadGroceryList();
    } catch (e: any) {
      console.error("Failed to generate grocery list:", e);
      toast({ title: "Failed to generate list", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddItemToCart = (item: any) => {
    addToCart({
      id: `grocery-${item.id}`,
      name: item.name,
      price: item.price || 49,
      type: 'grocery',
      category: item.category,
      unit: item.unit,
      description: item.nutritionNote || "Fresh grocery item",
    });
    toast({
      title: "Added to Cart! 🛒",
      description: `"${item.name}" added to Swiggy Instamart basket.`,
    });
    setIsCartOpen(true);
  };

  const handleAddAllToCart = () => {
    if (!list || list.items.length === 0) return;
    list.items.forEach((item: any) => {
      addToCart({
        id: `grocery-${item.id}`,
        name: item.name,
        price: item.price || 49,
        type: 'grocery',
        category: item.category,
        unit: item.unit,
        description: item.nutritionNote || "Fresh grocery item",
      });
    });
    toast({
      title: "All Items Added! 🛒",
      description: `${list.items.length} items added to your Swiggy Instamart basket.`,
    });
    setIsCartOpen(true);
  };

  // Group items by category
  const groupedItems = (list?.items || []).reduce((acc: Record<string, any[]>, item: any) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const totalCost = list?.items.reduce((sum: number, item: any) => sum + (item.price || 49), 0) || 0;

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-24">
        {/* Header Block */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Grocery Planner</h1>
            <p className="text-muted-foreground mt-1">Your AI-generated shopping list for the week.</p>
          </div>
          <div className="flex gap-2.5">
            {list && list.items.length > 0 && (
              <Button 
                onClick={handleAddAllToCart} 
                className="gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md hover:scale-[1.01] transition-all"
              >
                <ShoppingCart className="h-4 w-4" />
                Order checklist via Instamart (₹{totalCost})
              </Button>
            )}
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating}
              variant="outline"
              className="gap-2 rounded-full border-border/80 text-foreground font-semibold"
            >
              <Sparkles className="h-4 w-4 text-emerald-600" />
              {isGenerating ? "Generating..." : list && list.items.length > 0 ? "Regenerate List" : "Generate List"}
            </Button>
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-24 w-full rounded-2xl animate-pulse" />
            <Skeleton className="h-64 w-full rounded-2xl animate-pulse" />
          </div>
        ) : list ? (
          <>
            <Card className="bg-gradient-to-tr from-emerald-500/5 via-primary/5 to-background border-primary/20 shadow-xs rounded-2xl">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center text-primary">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Week of {new Date(list.weekOf).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</h3>
                    <p className="text-sm text-muted-foreground">
                      {list.checkedItems} of {list.totalItems} items collected
                    </p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2 text-emerald-600 font-bold">
                  {list.checkedItems === list.totalItems && list.totalItems > 0 && (
                    <><CheckCircle2 className="h-5 w-5" /> All Collected!</>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Checklist */}
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="space-y-3">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border-b pb-1.5">{category}</h3>
                  <div className="grid gap-2.5">
                    {(items as any[]).map((item: any) => (
                      <div 
                        key={item.id} 
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${item.isChecked ? 'bg-muted/50 border-transparent opacity-80' : 'bg-background hover:border-primary/40 shadow-2xs'}`}
                      >
                        <div className="flex items-center gap-3.5">
                          <Checkbox 
                            checked={item.isChecked} 
                            onCheckedChange={() => handleToggle(item.id)}
                            id={`item-${item.id}`}
                            className="h-5.5 w-5.5 rounded-full data-[state=checked]:bg-primary border-border/80"
                          />
                          <div className="flex flex-col text-left">
                            <label 
                              htmlFor={`item-${item.id}`}
                              className={`text-sm font-bold cursor-pointer leading-tight text-foreground ${item.isChecked ? 'line-through text-muted-foreground font-medium' : ''}`}
                            >
                              {item.name}
                            </label>
                            {item.nutritionNote && (
                              <span className="text-[10px] text-muted-foreground mt-0.5 max-w-lg">
                                {item.nutritionNote}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-muted-foreground bg-muted/80 px-2 py-0.5 rounded font-bold uppercase shrink-0">
                            {item.quantity} {item.unit}
                          </span>
                          <span className="text-xs font-extrabold text-emerald-600 shrink-0">₹{item.price}</span>
                          <Button
                            onClick={() => handleAddItemToCart(item)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full text-emerald-600 hover:text-emerald-75 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                            title="Add to Instamart cart"
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Instamart Shelf Selection */}
            <div className="space-y-5 pt-8">
              <div className="border-t border-border/50 pt-8">
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Sparkles className="text-emerald-600 h-5.5 w-5.5" />
                  Instamart Healthy Essentials
                </h2>
                <p className="text-xs text-muted-foreground mt-1">Superfoods, organic produce, and health items delivered in 15 mins.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
                {MOCK_INSTAMART_GROCERIES.map((item) => (
                  <Card key={item.id} className="overflow-hidden border-border/50 rounded-2xl flex flex-col justify-between group hover:shadow-md transition-all duration-200">
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      />
                      {item.discountText && (
                        <div className="absolute top-2 left-2 bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm">
                          {item.discountText}
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {item.deliveryTime}
                      </div>
                    </div>

                    <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider">{item.category}</span>
                        <h4 className="text-xs font-extrabold text-foreground leading-tight line-clamp-1">{item.name}</h4>
                        <p className="text-[9px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {item.nutritionNote}
                        </p>
                      </div>

                      <div className="space-y-2 pt-1 border-t border-muted/50">
                        <div className="flex items-baseline gap-1.5 justify-between">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs font-black text-emerald-600">
                              ₹{item.discountPrice || item.price}
                            </span>
                            {item.discountPrice && (
                              <span className="text-[10px] text-muted-foreground line-through">
                                ₹{item.price}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-muted-foreground font-semibold">
                            {item.quantity} {item.unit}
                          </span>
                        </div>

                        {item.inStock ? (
                          <Button
                            onClick={() => handleAddItemToCart(item)}
                            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-[10px] gap-1"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            Add
                          </Button>
                        ) : (
                          <Button
                            disabled
                            variant="secondary"
                            className="w-full rounded-lg h-8 text-[10px] gap-1 bg-muted text-muted-foreground"
                          >
                            <ShieldAlert className="h-3 w-3" />
                            Out of Stock
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
