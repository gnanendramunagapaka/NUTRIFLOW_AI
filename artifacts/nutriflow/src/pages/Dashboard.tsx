import { Layout } from "@/components/layout/Layout";
import { useGetWellnessSummary, useListMeals } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Flame, Droplets, Activity, Zap } from "lucide-react";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetWellnessSummary();
  const { data: meals, isLoading: loadingMeals } = useListMeals();

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8 space-y-8 pb-24">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Good Morning, User!</h1>
          <p className="text-muted-foreground mt-1">Here is your wellness overview for today.</p>
        </header>

        {loadingSummary ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : summary ? (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-1 space-y-4 w-full">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Zap className="text-orange-500 h-5 w-5" />
                    AI Insight
                  </h3>
                  <div className="flex items-center gap-2 bg-background px-3 py-1 rounded-full text-sm font-medium border shadow-sm">
                    <Flame className="text-orange-500 h-4 w-4" />
                    {summary.streak} Day Streak
                  </div>
                </div>
                <p className="text-foreground/80 leading-relaxed">{summary.aiInsight}</p>
              </div>
              <div className="w-full md:w-1/3 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Calories</span>
                    <span className="font-medium">{summary.caloriesConsumed} / {summary.caloriesGoal}</span>
                  </div>
                  <Progress value={(summary.caloriesConsumed / summary.caloriesGoal) * 100} className="h-2 bg-background" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Protein</span>
                    <span className="font-medium">{summary.proteinIntake}g / {summary.proteinGoal}g</span>
                  </div>
                  <Progress value={(summary.proteinIntake / summary.proteinGoal) * 100} className="h-2 bg-background" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Recommended Meals</h2>
          {loadingMeals ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
            </div>
          ) : meals && meals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meals.slice(0, 3).map(meal => (
                <Card key={meal.id} className="overflow-hidden group hover:shadow-md transition-all">
                  <div className="aspect-video bg-muted relative">
                    {meal.imageUrl ? (
                      <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary/10">
                        <span className="text-muted-foreground">No Image</span>
                      </div>
                    )}
                    {meal.isAiRecommended && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                        AI Pick
                      </div>
                    )}
                  </div>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-lg">{meal.name}</CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-1">{meal.description}</p>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 flex items-center justify-between text-sm">
                    <div className="flex gap-3 text-muted-foreground font-medium">
                      <span>{meal.calories} kcal</span>
                      <span>{meal.protein}g P</span>
                    </div>
                    <span className="font-bold text-primary">${meal.price}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-muted/50 rounded-xl border border-dashed">
              <p className="text-muted-foreground">No recommendations available.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
