import { Layout } from "@/components/layout/Layout";
import { useGetGroceryList, useToggleGroceryItem, getGetGroceryListQueryKey, useCreateGroceryPlan } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Calendar, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Grocery() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: list, isLoading } = useGetGroceryList();
  const toggleItem = useToggleGroceryItem();
  const createPlan = useCreateGroceryPlan();
  
  const [isGenerating, setIsGenerating] = useState(false);

  const handleToggle = (id: number) => {
    toggleItem.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGroceryListQueryKey() });
      }
    });
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    createPlan.mutate({ data: { goal: "balanced diet for this week" } }, {
      onSuccess: () => {
        toast({ title: "Grocery list generated!" });
        queryClient.invalidateQueries({ queryKey: getGetGroceryListQueryKey() });
        setIsGenerating(false);
      },
      onError: () => {
        toast({ title: "Failed to generate list", variant: "destructive" });
        setIsGenerating(false);
      }
    });
  };

  // Group items by category
  const groupedItems = list?.items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof list.items>) || {};

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-24">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Grocery Planner</h1>
            <p className="text-muted-foreground mt-1">Your AI-generated shopping list for the week.</p>
          </div>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="gap-2 rounded-full"
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate List"}
          </Button>
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
                    {items.map(item => (
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
                        <div className="text-sm text-muted-foreground">
                          {item.quantity} {item.unit}
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
