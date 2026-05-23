import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useListMeals, ListMealsFilter } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const filters: { label: string; value: ListMealsFilter | "all" }[] = [
  { label: "All", value: "all" },
  { label: "High Protein", value: "high-protein" },
  { label: "Low Carb", value: "low-carb" },
  { label: "Gym Meals", value: "gym-meals" },
  { label: "Budget", value: "budget" },
];

export default function Discover() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ListMealsFilter | "all">("all");

  const { data: meals, isLoading } = useListMeals({
    search: search || undefined,
    filter: activeFilter === "all" ? undefined : activeFilter
  });

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8 space-y-8 pb-24">
        <header className="space-y-4">
          <h1 className="text-3xl font-bold">Discover Healthy Meals</h1>
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for meals, cuisines..." 
              className="pl-10 py-6 rounded-2xl bg-muted/50 border-transparent focus:bg-background transition-colors text-base"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={cn(
                  "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                  activeFilter === f.value 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-background text-foreground hover:bg-muted"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}
          </div>
        ) : meals && meals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {meals.map(meal => (
              <Card key={meal.id} className="overflow-hidden group hover:shadow-lg transition-all border-border/50">
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {meal.imageUrl ? (
                    <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/10">
                      <span className="text-muted-foreground">No Image</span>
                    </div>
                  )}
                  {meal.isAiRecommended && (
                    <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-md">
                      AI Pick
                    </div>
                  )}
                </div>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg leading-tight line-clamp-2">{meal.name}</CardTitle>
                    <span className="font-bold text-primary">${meal.price}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3 text-sm">
                  <p className="text-muted-foreground line-clamp-2">{meal.description}</p>
                  <div className="flex gap-4 text-xs font-medium text-foreground/70">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Calories</span>
                      <span>{meal.calories}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Protein</span>
                      <span>{meal.protein}g</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Carbs</span>
                      <span>{meal.carbs}g</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center p-12 bg-muted/30 rounded-2xl border border-dashed">
            <p className="text-lg font-medium text-foreground">No meals found</p>
            <p className="text-muted-foreground">Try adjusting your filters or search term.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
