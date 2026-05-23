import { Layout } from "@/components/layout/Layout";
import { useGetProfile, useUpdateProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect } from "react";

export default function Profile() {
  const { data: profile, isLoading } = useGetProfile();
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: "",
      age: "",
      weight: "",
      height: "",
      goal: "",
    }
  });

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || "",
        age: profile.age?.toString() || "",
        weight: profile.weight?.toString() || "",
        height: profile.height?.toString() || "",
        goal: profile.goal || "",
      });
    }
  }, [profile, reset]);

  const onSubmit = (data: any) => {
    updateProfile.mutate({
      data: {
        name: data.name,
        age: data.age ? Number(data.age) : undefined,
        weight: data.weight ? Number(data.weight) : undefined,
        height: data.height ? Number(data.height) : undefined,
        goal: data.goal,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Profile updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
      }
    });
  };

  return (
    <Layout>
      <div className="container max-w-3xl mx-auto p-4 md:p-8 space-y-8 pb-24">
        <header>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your details and wellness goals.</p>
        </header>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        ) : profile ? (
          <>
            <Card className="overflow-hidden border-none shadow-md bg-gradient-to-r from-primary/10 to-transparent">
              <CardContent className="p-8 flex flex-col sm:flex-row items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-background shadow-sm">
                  <AvatarImage src={profile.avatarUrl || ""} />
                  <AvatarFallback className="text-2xl">{profile.name.substring(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left space-y-1">
                  <h2 className="text-2xl font-bold">{profile.name}</h2>
                  <p className="text-muted-foreground">Wellness Score: <span className="text-primary font-bold">{profile.wellnessScore}</span></p>
                </div>
                <div className="sm:ml-auto flex gap-4">
                  <div className="bg-background px-4 py-2 rounded-xl text-center shadow-sm">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Streak</p>
                    <p className="text-xl font-bold text-orange-500">{profile.streak} Days</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Personal Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" {...register("name")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goal">Primary Goal</Label>
                      <Input id="goal" {...register("goal")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input id="age" type="number" {...register("age")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input id="weight" type="number" {...register("weight")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height">Height (cm)</Label>
                      <Input id="height" type="number" {...register("height")} />
                    </div>
                  </div>
                  <Button type="submit" disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
