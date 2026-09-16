import { supabaseAdmin } from "../lib/supabaseAdmin";

// Types matching schema definitions
export interface UserProfileRow {
  id: number;
  name: string;
  email: string;
  password: string;
  is_email_verified: boolean;
  verification_code?: string | null;
  session_token?: string | null;
  onboarding_completed: boolean;
  age?: number | null;
  weight?: number | null;
  height?: number | null;
  goal: string;
  dietary_preferences: string[];
  allergies: string[];
  workout_frequency?: string | null;
  water_intake?: string | null;
  meal_habits?: string | null;
  budget?: string | null;
  wellness_score: number;
  streak: number;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfileModel {
  id: number;
  name: string;
  email: string;
  password: string;
  isEmailVerified: boolean;
  verificationCode?: string | null;
  sessionToken?: string | null;
  onboardingCompleted: boolean;
  age?: number | null;
  weight?: number | null;
  height?: number | null;
  goal: string;
  dietaryPreferences: string[];
  allergies: string[];
  workoutFrequency?: string | null;
  waterIntake?: string | null;
  mealHabits?: string | null;
  budget?: string | null;
  wellnessScore: number;
  streak: number;
  avatarUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function mapProfileRowToModel(row: UserProfileRow): UserProfileModel {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    isEmailVerified: row.is_email_verified,
    verificationCode: row.verification_code,
    sessionToken: row.session_token,
    onboardingCompleted: row.onboarding_completed,
    age: row.age,
    weight: row.weight,
    height: row.height,
    goal: row.goal,
    dietaryPreferences: row.dietary_preferences ?? [],
    allergies: row.allergies ?? [],
    workoutFrequency: row.workout_frequency,
    waterIntake: row.water_intake,
    mealHabits: row.meal_habits,
    budget: row.budget,
    wellnessScore: row.wellness_score ?? 72,
    streak: row.streak ?? 0,
    avatarUrl: row.avatar_url,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export interface RestaurantModel {
  id: number;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  imageUrl?: string | null;
  isHealthy: boolean;
  tags: string[];
  createdAt: Date;
}

export interface MealModel {
  id: number;
  name: string;
  description: string;
  imageUrl?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  healthScore: number;
  cuisine: string;
  tags: string[];
  price: number;
  isAiRecommended: boolean;
  restaurantId?: number | null;
  createdAt: Date;
}

export interface SavedMealModel {
  id: number;
  userId: number;
  mealId?: number | null;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  healthScore?: number | null;
  price?: number | null;
  createdAt: Date;
}

export interface CartItemModel {
  id: number;
  userId: number;
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  type: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  healthScore?: number | null;
  imageUrl?: string | null;
  cuisine?: string | null;
  category?: string | null;
  unit?: string | null;
  description?: string | null;
  createdAt: Date;
}

export interface GroceryListModel {
  id: number;
  userId?: number | null;
  weekOf: string;
  createdAt: Date;
}

export interface GroceryItemModel {
  id: number;
  listId: number;
  name: string;
  category: string;
  quantity: string;
  unit: string;
  isChecked: boolean;
  nutritionNote?: string | null;
  createdAt: Date;
}

export interface ConversationModel {
  id: number;
  userId?: number | null;
  title: string;
  createdAt: Date;
}

export interface MessageModel {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: Date;
}

export interface SwiggyConnectionModel {
  id: number;
  userId: number;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: Date;
  scope: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── DB SERVICE CLASS ──────────────────────────────────────────────────

export class DbService {
  // --- USER PROFILES ---

  static async getUserByEmail(email: string): Promise<UserProfileModel | null> {
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      console.error("[DbService] getUserByEmail error:", error);
      throw error;
    }
    return data ? mapProfileRowToModel(data) : null;
  }

  static async createUserProfile(profile: {
    name: string;
    email: string;
    password?: string;
    isEmailVerified?: boolean;
    onboardingCompleted?: boolean;
    goal?: string;
    dietaryPreferences?: string[];
    allergies?: string[];
    wellnessScore?: number;
    streak?: number;
  }): Promise<UserProfileModel> {
    const rowToInsert = {
      name: profile.name,
      email: profile.email.toLowerCase().trim(),
      password: profile.password || "supabase_auth",
      is_email_verified: profile.isEmailVerified ?? false,
      onboarding_completed: profile.onboardingCompleted ?? false,
      goal: profile.goal || "Stay Healthy",
      dietary_preferences: profile.dietaryPreferences ?? [],
      allergies: profile.allergies ?? [],
      wellness_score: profile.wellnessScore ?? 72,
      streak: profile.streak ?? 0,
    };

    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .insert(rowToInsert)
      .select()
      .single();

    if (error) {
      console.error("[DbService] createUserProfile error:", error);
      throw error;
    }
    return mapProfileRowToModel(data);
  }

  static async updateUserProfile(
    id: number,
    updates: Partial<{
      isEmailVerified: boolean;
      name: string;
      age: number;
      weight: number;
      height: number;
      goal: string;
      dietaryPreferences: string[];
      allergies: string[];
      workoutFrequency: string;
      waterIntake: string;
      mealHabits: string;
      budget: string;
      wellnessScore: number;
      streak: number;
      avatarUrl: string;
      onboardingCompleted: boolean;
    }>
  ): Promise<UserProfileModel> {
    const rowUpdates: Record<string, any> = {};
    if (updates.isEmailVerified !== undefined) rowUpdates.is_email_verified = updates.isEmailVerified;
    if (updates.name !== undefined) rowUpdates.name = updates.name;
    if (updates.age !== undefined) rowUpdates.age = updates.age;
    if (updates.weight !== undefined) rowUpdates.weight = updates.weight;
    if (updates.height !== undefined) rowUpdates.height = updates.height;
    if (updates.goal !== undefined) rowUpdates.goal = updates.goal;
    if (updates.dietaryPreferences !== undefined) rowUpdates.dietary_preferences = updates.dietaryPreferences;
    if (updates.allergies !== undefined) rowUpdates.allergies = updates.allergies;
    if (updates.workoutFrequency !== undefined) rowUpdates.workout_frequency = updates.workoutFrequency;
    if (updates.waterIntake !== undefined) rowUpdates.water_intake = updates.waterIntake;
    if (updates.mealHabits !== undefined) rowUpdates.meal_habits = updates.mealHabits;
    if (updates.budget !== undefined) rowUpdates.budget = updates.budget;
    if (updates.wellnessScore !== undefined) rowUpdates.wellness_score = updates.wellnessScore;
    if (updates.streak !== undefined) rowUpdates.streak = updates.streak;
    if (updates.avatarUrl !== undefined) rowUpdates.avatar_url = updates.avatarUrl;
    if (updates.onboardingCompleted !== undefined) rowUpdates.onboarding_completed = updates.onboardingCompleted;

    rowUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .update(rowUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[DbService] updateUserProfile error:", error);
      throw error;
    }
    return mapProfileRowToModel(data);
  }

  // --- ONBOARDING PREFERENCES ---

  static async syncOnboardingPreferences(
    userId: number,
    pref: {
      goal?: string;
      dietaryPreferences?: string[];
      allergies?: string[];
      workoutFrequency?: string;
      waterIntake?: string;
      mealHabits?: string;
      budget?: string;
    }
  ): Promise<void> {
    try {
      const { data: existing } = await supabaseAdmin
        .from("onboarding_preferences")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      const prefPayload = {
        user_id: userId,
        goal: pref.goal,
        dietary_preferences: pref.dietaryPreferences ?? [],
        allergies: pref.allergies ?? [],
        workout_frequency: pref.workoutFrequency,
        water_intake: pref.waterIntake,
        meal_habits: pref.mealHabits,
        budget: pref.budget,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        await supabaseAdmin
          .from("onboarding_preferences")
          .update(prefPayload)
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("onboarding_preferences").insert(prefPayload);
      }
    } catch (err) {
      console.error("[DbService] syncOnboardingPreferences error:", err);
    }
  }

  // --- WELLNESS TRACKING ---

  static async getWellnessTracking(userId: number, date: string) {
    const { data, error } = await supabaseAdmin
      .from("wellness_tracking")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();

    if (error) {
      console.error("[DbService] getWellnessTracking error:", error);
      return null;
    }
    if (!data) return null;
    return {
      id: data.id,
      userId: data.user_id,
      date: data.date,
      proteinIntake: data.protein_intake ?? 0,
      waterIntake: data.water_intake ?? 0,
      caloriesConsumed: data.calories_consumed ?? 0,
      createdAt: new Date(data.created_at),
    };
  }

  // --- MEALS & RESTAURANTS ---

  static async listMeals(filter?: string, search?: string, limit = 30): Promise<MealModel[]> {
    let query = supabaseAdmin.from("meals").select("*");

    if (filter) {
      query = query.contains("tags", [filter]);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,cuisine.ilike.%${search}%`);
    }

    const { data, error } = await query.limit(limit);

    if (error) {
      console.error("[DbService] listMeals error:", error);
      throw error;
    }

    return (data || []).map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      imageUrl: m.image_url,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      healthScore: m.health_score,
      cuisine: m.cuisine,
      tags: m.tags ?? [],
      price: m.price,
      isAiRecommended: m.is_ai_recommended,
      restaurantId: m.restaurant_id,
      createdAt: new Date(m.created_at),
    }));
  }

  static async getMealById(id: number): Promise<MealModel | null> {
    const { data, error } = await supabaseAdmin
      .from("meals")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      imageUrl: data.image_url,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      healthScore: data.health_score,
      cuisine: data.cuisine,
      tags: data.tags ?? [],
      price: data.price,
      isAiRecommended: data.is_ai_recommended,
      restaurantId: data.restaurant_id,
      createdAt: new Date(data.created_at),
    };
  }

  static async getMealsByTag(tag: string, limit = 21): Promise<MealModel[]> {
    const { data, error } = await supabaseAdmin
      .from("meals")
      .select("*")
      .contains("tags", [tag])
      .limit(limit);

    if (error) {
      console.error("[DbService] getMealsByTag error:", error);
      return [];
    }

    return (data || []).map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      imageUrl: m.image_url,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      healthScore: m.health_score,
      cuisine: m.cuisine,
      tags: m.tags ?? [],
      price: m.price,
      isAiRecommended: m.is_ai_recommended,
      restaurantId: m.restaurant_id,
      createdAt: new Date(m.created_at),
    }));
  }

  static async getTopRecommendedMeals(limit = 3): Promise<MealModel[]> {
    const { data, error } = await supabaseAdmin
      .from("meals")
      .select("*")
      .eq("is_ai_recommended", true)
      .limit(limit);

    if (error) return [];

    return (data || []).map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      imageUrl: m.image_url,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      healthScore: m.health_score,
      cuisine: m.cuisine,
      tags: m.tags ?? [],
      price: m.price,
      isAiRecommended: m.is_ai_recommended,
      restaurantId: m.restaurant_id,
      createdAt: new Date(m.created_at),
    }));
  }

  static async listRestaurants(limit = 20): Promise<RestaurantModel[]> {
    const { data, error } = await supabaseAdmin
      .from("restaurants")
      .select("*")
      .limit(limit);

    if (error) throw error;

    return (data || []).map((r) => ({
      id: r.id,
      name: r.name,
      cuisine: r.cuisine,
      rating: r.rating,
      deliveryTime: r.delivery_time,
      imageUrl: r.image_url,
      isHealthy: r.is_healthy,
      tags: r.tags ?? [],
      createdAt: new Date(r.created_at),
    }));
  }

  // --- SAVED MEALS ---

  static async getSavedMeals(userId: number): Promise<SavedMealModel[]> {
    const { data, error } = await supabaseAdmin
      .from("saved_meals")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    return (data || []).map((s) => ({
      id: s.id,
      userId: s.user_id,
      mealId: s.meal_id,
      name: s.name,
      description: s.description,
      imageUrl: s.image_url,
      calories: s.calories,
      protein: s.protein,
      carbs: s.carbs,
      fat: s.fat,
      healthScore: s.health_score,
      price: s.price,
      createdAt: new Date(s.created_at),
    }));
  }

  static async findSavedMeal(userId: number, mealId: number): Promise<SavedMealModel | null> {
    const { data, error } = await supabaseAdmin
      .from("saved_meals")
      .select("*")
      .eq("user_id", userId)
      .eq("meal_id", mealId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      mealId: data.meal_id,
      name: data.name,
      description: data.description,
      imageUrl: data.image_url,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      healthScore: data.health_score,
      price: data.price,
      createdAt: new Date(data.created_at),
    };
  }

  static async saveMeal(meal: {
    userId: number;
    mealId?: number | null;
    name: string;
    description?: string;
    imageUrl?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    healthScore?: number;
    price?: number;
  }): Promise<SavedMealModel> {
    const payload = {
      user_id: meal.userId,
      meal_id: meal.mealId || null,
      name: meal.name,
      description: meal.description,
      image_url: meal.imageUrl,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      health_score: meal.healthScore,
      price: meal.price,
    };

    const { data, error } = await supabaseAdmin
      .from("saved_meals")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.user_id,
      mealId: data.meal_id,
      name: data.name,
      description: data.description,
      imageUrl: data.image_url,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      healthScore: data.health_score,
      price: data.price,
      createdAt: new Date(data.created_at),
    };
  }

  static async deleteSavedMeal(id: number, userId: number): Promise<void> {
    const { error } = await supabaseAdmin
      .from("saved_meals")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;
  }

  // --- CART ---

  static async getCartItems(userId: number): Promise<CartItemModel[]> {
    const { data, error } = await supabaseAdmin
      .from("cart_items")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    return (data || []).map((c) => ({
      id: c.id,
      userId: c.user_id,
      itemId: c.item_id,
      name: c.name,
      price: c.price,
      quantity: c.quantity,
      type: c.type,
      calories: c.calories,
      protein: c.protein,
      carbs: c.carbs,
      fat: c.fat,
      healthScore: c.health_score,
      imageUrl: c.image_url,
      cuisine: c.cuisine,
      category: c.category,
      unit: c.unit,
      description: c.description,
      createdAt: new Date(c.created_at),
    }));
  }

  static async findCartItem(userId: number, itemId: string): Promise<CartItemModel | null> {
    const { data, error } = await supabaseAdmin
      .from("cart_items")
      .select("*")
      .eq("user_id", userId)
      .eq("item_id", itemId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      itemId: data.item_id,
      name: data.name,
      price: data.price,
      quantity: data.quantity,
      type: data.type,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      healthScore: data.health_score,
      imageUrl: data.image_url,
      cuisine: data.cuisine,
      category: data.category,
      unit: data.unit,
      description: data.description,
      createdAt: new Date(data.created_at),
    };
  }

  static async addCartItem(item: {
    userId: number;
    itemId: string;
    name: string;
    price: number;
    quantity: number;
    type: string;
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
  }): Promise<CartItemModel> {
    const payload = {
      user_id: item.userId,
      item_id: item.itemId,
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
    };

    const { data, error } = await supabaseAdmin
      .from("cart_items")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.user_id,
      itemId: data.item_id,
      name: data.name,
      price: data.price,
      quantity: data.quantity,
      type: data.type,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      healthScore: data.health_score,
      imageUrl: data.image_url,
      cuisine: data.cuisine,
      category: data.category,
      unit: data.unit,
      description: data.description,
      createdAt: new Date(data.created_at),
    };
  }

  static async updateCartItemQuantity(id: number, quantity: number): Promise<CartItemModel | null> {
    const { data, error } = await supabaseAdmin
      .from("cart_items")
      .update({ quantity })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      itemId: data.item_id,
      name: data.name,
      price: data.price,
      quantity: data.quantity,
      type: data.type,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      healthScore: data.health_score,
      imageUrl: data.image_url,
      cuisine: data.cuisine,
      category: data.category,
      unit: data.unit,
      description: data.description,
      createdAt: new Date(data.created_at),
    };
  }

  static async deleteCartItem(userId: number, itemId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("user_id", userId)
      .eq("item_id", itemId);

    if (error) throw error;
  }

  static async clearCart(userId: number): Promise<void> {
    const { error } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;
  }

  // --- GROCERY ---

  static async getLatestGroceryList(userId: number): Promise<GroceryListModel | null> {
    const { data, error } = await supabaseAdmin
      .from("grocery_lists")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      weekOf: data.week_of,
      createdAt: new Date(data.created_at),
    };
  }

  static async getGroceryItemsByListId(listId: number): Promise<GroceryItemModel[]> {
    const { data, error } = await supabaseAdmin
      .from("grocery_items")
      .select("*")
      .eq("list_id", listId);

    if (error) throw error;

    return (data || []).map((i) => ({
      id: i.id,
      listId: i.list_id,
      name: i.name,
      category: i.category,
      quantity: i.quantity,
      unit: i.unit,
      isChecked: i.is_checked,
      nutritionNote: i.nutrition_note,
      createdAt: new Date(i.created_at),
    }));
  }

  static async createGroceryList(userId: number, weekOf: string): Promise<GroceryListModel> {
    const { data, error } = await supabaseAdmin
      .from("grocery_lists")
      .insert({ user_id: userId, week_of: weekOf })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.user_id,
      weekOf: data.week_of,
      createdAt: new Date(data.created_at),
    };
  }

  static async createGroceryItems(
    items: Array<{
      listId: number;
      name: string;
      category: string;
      quantity: string;
      unit: string;
      isChecked?: boolean;
      nutritionNote?: string | null;
    }>
  ): Promise<GroceryItemModel[]> {
    const payload = items.map((i) => ({
      list_id: i.listId,
      name: i.name,
      category: i.category,
      quantity: i.quantity,
      unit: i.unit,
      is_checked: i.isChecked ?? false,
      nutrition_note: i.nutritionNote || null,
    }));

    const { data, error } = await supabaseAdmin
      .from("grocery_items")
      .insert(payload)
      .select();

    if (error) throw error;

    return (data || []).map((i) => ({
      id: i.id,
      listId: i.list_id,
      name: i.name,
      category: i.category,
      quantity: i.quantity,
      unit: i.unit,
      isChecked: i.is_checked,
      nutritionNote: i.nutrition_note,
      createdAt: new Date(i.created_at),
    }));
  }

  static async getGroceryItemById(id: number): Promise<GroceryItemModel | null> {
    const { data, error } = await supabaseAdmin
      .from("grocery_items")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      listId: data.list_id,
      name: data.name,
      category: data.category,
      quantity: data.quantity,
      unit: data.unit,
      isChecked: data.is_checked,
      nutritionNote: data.nutrition_note,
      createdAt: new Date(data.created_at),
    };
  }

  static async getGroceryListByIdAndUserId(listId: number, userId: number): Promise<GroceryListModel | null> {
    const { data, error } = await supabaseAdmin
      .from("grocery_lists")
      .select("*")
      .eq("id", listId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      weekOf: data.week_of,
      createdAt: new Date(data.created_at),
    };
  }

  static async toggleGroceryItem(id: number, isChecked: boolean): Promise<GroceryItemModel> {
    const { data, error } = await supabaseAdmin
      .from("grocery_items")
      .update({ is_checked: isChecked })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      listId: data.list_id,
      name: data.name,
      category: data.category,
      quantity: data.quantity,
      unit: data.unit,
      isChecked: data.is_checked,
      nutritionNote: data.nutrition_note,
      createdAt: new Date(data.created_at),
    };
  }

  // --- CONVERSATIONS & MESSAGES ---

  static async listConversations(userId: number): Promise<ConversationModel[]> {
    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    return (data || []).map((c) => ({
      id: c.id,
      userId: c.user_id,
      title: c.title,
      createdAt: new Date(c.created_at),
    }));
  }

  static async createConversation(userId: number, title: string): Promise<ConversationModel> {
    const { data, error } = await supabaseAdmin
      .from("conversations")
      .insert({ user_id: userId, title })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      createdAt: new Date(data.created_at),
    };
  }

  static async getConversationByIdAndUserId(id: number, userId: number): Promise<ConversationModel | null> {
    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      createdAt: new Date(data.created_at),
    };
  }

  static async deleteConversationAndMessages(id: number, userId: number): Promise<void> {
    const conv = await this.getConversationByIdAndUserId(id, userId);
    if (!conv) return;

    await supabaseAdmin.from("messages").delete().eq("conversation_id", id);
    await supabaseAdmin.from("conversations").delete().eq("id", id).eq("user_id", userId);
  }

  static async getMessagesByConversationId(conversationId: number, limit?: number): Promise<MessageModel[]> {
    let query = supabaseAdmin
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      role: m.role,
      content: m.content,
      createdAt: new Date(m.created_at),
    }));
  }

  static async createMessage(conversationId: number, role: string, content: string): Promise<MessageModel> {
    const { data, error } = await supabaseAdmin
      .from("messages")
      .insert({ conversation_id: conversationId, role, content })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      conversationId: data.conversation_id,
      role: data.role,
      content: data.content,
      createdAt: new Date(data.created_at),
    };
  }

  // --- SWIGGY CONNECTIONS ---

  static async getSwiggyConnectionByUserId(userId: number): Promise<SwiggyConnectionModel | null> {
    const { data, error } = await supabaseAdmin
      .from("swiggy_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at),
      scope: data.scope,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  static async saveSwiggyConnection(
    userId: number,
    accessToken: string,
    expiresAt: Date,
    scope = "mcp:tools",
    refreshToken?: string
  ): Promise<SwiggyConnectionModel> {
    const existing = await this.getSwiggyConnectionByUserId(userId);

    const payload = {
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken || existing?.refreshToken || null,
      expires_at: expiresAt.toISOString(),
      scope,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from("swiggy_connections")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return {
        id: data.id,
        userId: data.user_id,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(data.expires_at),
        scope: data.scope,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    } else {
      const { data, error } = await supabaseAdmin
        .from("swiggy_connections")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return {
        id: data.id,
        userId: data.user_id,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(data.expires_at),
        scope: data.scope,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    }
  }

  static async deleteSwiggyConnection(userId: number): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from("swiggy_connections")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("[DbService] deleteSwiggyConnection error:", error);
      return false;
    }
    return true;
  }
}
