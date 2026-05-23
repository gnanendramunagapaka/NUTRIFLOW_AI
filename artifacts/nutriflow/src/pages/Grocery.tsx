import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Calendar, CheckCircle2, ShoppingCart } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/use-auth";

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
        setList({ id: null, weekOf: new Date().toISOString().split("T")[0], items: [], totalItems: 0, checkedItems: 0 });
        return;
      }

      if (!plans || plans.length === 0) {
        setList({ id: null, weekOf: new Date().toISOString().split("T")[0], items: [], totalItems: 0, checkedItems: 0 });
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

      const mappedItems = (items || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        category: row.category || "Pantry",
        quantity: row.quantity || "1",
        unit: row.unit || "unit",
        isChecked: row.is_checked || false,
        nutritionNote: row.nutrition_note || null,
      }));

      setList({
        id: plan.id,
        weekOf: plan.week_of || new Date().toISOString().split("T")[0],
        items: mappedItems,
        totalItems: mappedItems.length,
        checkedItems: mappedItems.filter((i: any) => i.isChecked).length,
      });

      console.log("[Grocery] Loaded plan", plan.id, "with", mappedItems.length, "items");
    } catch (e) {
      console.warn("[Grocery] loadGroceryList failed (non-critical):", e);
      setList({ id: null, weekOf: new Date().toISOString().split("T")[0], items: [], totalItems: 0, checkedItems: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroceryList();
  }, []);


  const handleToggle = async (id: string | number) => {
    if (!list) return;
    const targetItem = list.items.find((i: any) => i.id === id);
    if (!targetItem) return;

    try {
      // Optimistic update
      const updatedItems = list.items.map((i: any) =>
        i.id === id ? { ...i, isChecked: !i.isChecked } : i
      );
      setList({
        ...list,
        items: updatedItems,
        checkedItems: updatedItems.filter((i: any) => i.isChecked).length,
      });

      const { error } = await supabase
        .from("grocery_plan_items")
        .update({ is_checked: !targetItem.isChecked })
        .eq("id", id);
      
      if (error) throw error;
    } catch (e) {
      console.error("Failed to toggle grocery check state:", e);
      loadGroceryList();
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
      id: `grocery-db-${item.id}`,
      name: item.name,
      price: 49,
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
        id: `grocery-db-${item.id}`,
        name: item.name,
        price: 49,
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

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-24">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Grocery Planner</h1>
            <p className="text-muted-foreground mt-1">Your AI-generated shopping list for the week.</p>
          </div>
          <div className="flex gap-2.5">
            {list && list.items.length > 0 && (
              <Button 
                onClick={handleAddAllToCart} 
                className="gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              >
                <ShoppingCart className="h-4 w-4" />
                Order via Instamart (₹{list.items.length * 49})
              </Button>
            )}
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating}
              variant="outline"
              className="gap-2 rounded-full border-border/80 text-foreground"
            >
              <Sparkles className="h-4 w-4" />
              {isGenerating ? "Generating..." : list && list.items.length > 0 ? "Regenerate List" : "Generate List"}
            </Button>
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : list ? (
          <>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Week of {new Date(list.weekOf).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</h3>
                    <p className="text-sm text-muted-foreground">
                      {list.checkedItems} of {list.totalItems} items collected
                    </p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2 text-primary font-medium">
                  {list.checkedItems === list.totalItems && list.totalItems > 0 && (
                    <><CheckCircle2 className="h-5 w-5" /> All Done!</>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-8">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">{category}</h3>
                  <div className="grid gap-2">
                    {(items as any[]).map((item: any) => (
                      <div 
                        key={item.id} 
                        className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${item.isChecked ? 'bg-muted/50 border-transparent' : 'bg-background hover:border-primary/50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={item.isChecked} 
                            onCheckedChange={() => handleToggle(item.id)}
                            id={`item-${item.id}`}
                            className="h-5 w-5 rounded-full data-[state=checked]:bg-primary"
                          />
                          <label 
                            htmlFor={`item-${item.id}`}
                            className={`text-base font-medium cursor-pointer ${item.isChecked ? 'line-through text-muted-foreground' : ''}`}
                          >
                            {item.name}
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground bg-muted/85 px-2.5 py-1 rounded-lg font-medium">
                            {item.quantity} {item.unit}
                          </span>
                          <Button
                            onClick={() => handleAddItemToCart(item)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                            title="Add to Instamart cart"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {list.items.length === 0 && (
                <div className="text-center p-12 bg-muted/30 rounded-2xl border border-dashed">
                  <p className="text-lg font-medium text-foreground">Your list is empty</p>
                  <p className="text-muted-foreground">Generate a list using AI to get started.</p>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
