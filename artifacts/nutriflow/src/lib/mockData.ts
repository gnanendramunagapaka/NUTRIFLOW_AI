export interface MockMeal {
  id: string | number;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  healthScore: number;
  cuisine: string;
  price: number;
  isAiRecommended: boolean;
  imageUrl: string;
  rating: number;
  deliveryTime: string;
  discount?: string;
  restaurantName: string;
  tags: string[];
}

export interface MockGrocery {
  id: string | number;
  name: string;
  category: string;
  quantity: string;
  unit: string;
  price: number;
  discountPrice?: number;
  discountText?: string;
  inStock: boolean;
  nutritionNote: string;
  imageUrl: string;
  deliveryTime: string;
}

export interface MockAddress {
  id: string;
  type: "Home" | "Work" | "Gym" | "Other";
  addressLine1: string;
  addressLine2: string;
  city: string;
  icon: string;
}

export const MOCK_WELLNESS_SUMMARY = {
  proteinIntake: 72,
  proteinGoal: 120,
  waterIntake: 2.2,
  waterGoal: 3.5,
  caloriesConsumed: 1420,
  caloriesGoal: 2000,
  streak: 5,
  wellnessScore: 84,
  aiInsight: "Excellent progress! You've met 70% of your daily protein target. Consider a Greek Yogurt or Protein Shake post-workout to hit your 120g goal. Hydration is slightly behind schedule.",
};

export const MOCK_WEEKLY_STATS = [
  { day: "Mon", Calories: 1850, Protein: 110, Water: 3.1 },
  { day: "Tue", Calories: 1980, Protein: 115, Water: 3.4 },
  { day: "Wed", Calories: 1540, Protein: 95, Water: 2.8 },
  { day: "Thu", Calories: 2100, Protein: 122, Water: 3.6 },
  { day: "Fri", Calories: 1720, Protein: 105, Water: 3.0 },
  { day: "Sat", Calories: 1900, Protein: 118, Water: 3.2 },
  { day: "Sun", Calories: 1420, Protein: 72, Water: 2.2 },
];

export const MOCK_TRENDING_MEALS: MockMeal[] = [
  {
    id: "m-1",
    name: "Keto Paneer Tikka Salad Bowl",
    description: "Grilled cottage cheese cubes in spices, fresh baby spinach, organic cucumbers, red peppers, olives, and olive oil mint dressing.",
    calories: 380,
    protein: 22,
    carbs: 8,
    fat: 28,
    healthScore: 9.1,
    cuisine: "Indian/Salads",
    price: 260,
    isAiRecommended: true,
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60",
    rating: 4.8,
    deliveryTime: "18-25 min",
    discount: "₹50 OFF with code FIT50",
    restaurantName: "The Green & Lean Cafe",
    tags: ["low-carb", "keto", "vegetarian"],
  },
  {
    id: "m-2",
    name: "Fit-Fuel Grilled Chicken & Broccoli",
    description: "Lean rosemary-marinated double chicken breast served with steamed broccoli and fiber-rich organic red rice.",
    calories: 520,
    protein: 48,
    carbs: 34,
    fat: 9,
    healthScore: 9.6,
    cuisine: "Gym Meals",
    price: 380,
    isAiRecommended: true,
    imageUrl: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=500&auto=format&fit=crop&q=60",
    rating: 4.9,
    deliveryTime: "20-30 min",
    discount: "Free Delivery",
    restaurantName: "Protein Powerhouse",
    tags: ["high-protein", "gym-meals"],
  },
  {
    id: "m-3",
    name: "Foxtail Millet Masala Dosa",
    description: "Crispy high-fiber foxtail millet crepe served with spiced potato filing, fresh coconut chutney, and roasted lentil sambar.",
    calories: 310,
    protein: 9,
    carbs: 48,
    fat: 6,
    healthScore: 8.8,
    cuisine: "South Indian",
    price: 160,
    isAiRecommended: false,
    imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=60",
    rating: 4.6,
    deliveryTime: "12-20 min",
    restaurantName: "Millet Marvels",
    tags: ["diabetic-friendly", "budget", "vegetarian"],
  },
  {
    id: "m-4",
    name: "Steamed Quinoa Harvest Buddha Bowl",
    description: "Tri-color quinoa, roasted sweet potatoes, organic chickpeas, sliced avocados, and sesame-tahini dressing.",
    calories: 440,
    protein: 15,
    carbs: 58,
    fat: 14,
    healthScore: 9.3,
    cuisine: "Bowls/Vegan",
    price: 340,
    isAiRecommended: true,
    imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=60",
    rating: 4.7,
    deliveryTime: "25-35 min",
    discount: "10% OFF",
    restaurantName: "Vegan Vibe Co.",
    tags: ["vegan", "vegetarian"],
  },
  {
    id: "m-5",
    name: "Gluten-Free Oats Idli Plate",
    description: "Light and fluffy steamed rolled oats idlis (3 pcs) fortified with grated carrots. Served with mint chutney.",
    calories: 220,
    protein: 8,
    carbs: 36,
    fat: 2,
    healthScore: 9.4,
    cuisine: "South Indian",
    price: 110,
    isAiRecommended: true,
    imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=60",
    rating: 4.5,
    deliveryTime: "10-15 min",
    restaurantName: "Millet Marvels",
    tags: ["diabetic-friendly", "budget", "vegetarian"],
  },
  {
    id: "m-6",
    name: "Sugar-Free Almond Flour Brownie",
    description: "Ultra-fudgy cocoa brownie sweetened with erythritol and made with 100% fine almond flour. Zero flour or sugar.",
    calories: 170,
    protein: 6,
    carbs: 5,
    fat: 15,
    healthScore: 8.5,
    cuisine: "Desserts",
    price: 180,
    isAiRecommended: false,
    imageUrl: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500&auto=format&fit=crop&q=60",
    rating: 4.7,
    deliveryTime: "15-25 min",
    restaurantName: "Sugarfree Sensations",
    tags: ["keto", "low-carb", "diabetic-friendly", "desserts"],
  },
];

export const MOCK_INSTAMART_GROCERIES: MockGrocery[] = [
  // Organic Fruits & Vegetables
  {
    id: "g-1",
    name: "Organic Avocados (2 pcs)",
    category: "Fresh Produce",
    quantity: "2",
    unit: "pcs",
    price: 240,
    discountPrice: 199,
    discountText: "17% OFF",
    inStock: true,
    nutritionNote: "Rich in Monounsaturated Fats (healthy heart & cholesterol). Good for Keto diets.",
    imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=60",
    deliveryTime: "11 mins",
  },
  {
    id: "g-2",
    name: "Fresh Hydroponic Spinach (200g)",
    category: "Fresh Produce",
    quantity: "200",
    unit: "g",
    price: 60,
    inStock: true,
    nutritionNote: "Excellent source of Iron, Lutein, and Vitamin K. Preservative-free.",
    imageUrl: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500&auto=format&fit=crop&q=60",
    deliveryTime: "9 mins",
  },
  {
    id: "g-3",
    name: "Premium English Cucumber (500g)",
    category: "Fresh Produce",
    quantity: "500",
    unit: "g",
    price: 75,
    discountPrice: 59,
    discountText: "21% OFF",
    inStock: true,
    nutritionNote: "High water content (96% hydration index). Supports digestion.",
    imageUrl: "https://images.unsplash.com/photo-1604930833640-4fc9e402fd68?w=500&auto=format&fit=crop&q=60",
    deliveryTime: "12 mins",
  },
  // Clean Protein & Dairy
  {
    id: "g-4",
    name: "High-Protein Fresh Paneer (200g)",
    category: "Proteins & Dairy",
    quantity: "200",
    unit: "g",
    price: 120,
    inStock: true,
    nutritionNote: "Contains 18g Protein per 100g. Freshly sourced from A2 cow milk.",
    imageUrl: "https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=500&auto=format&fit=crop&q=60",
    deliveryTime: "10 mins",
  },
  {
    id: "g-5",
    name: "Unsweetened Almond Milk (1L)",
    category: "Proteins & Dairy",
    quantity: "1",
    unit: "L",
    price: 320,
    discountPrice: 280,
    discountText: "12% OFF",
    inStock: true,
    nutritionNote: "Only 30 kcal per serving. 100% Lactose & Gluten-Free.",
    imageUrl: "https://images.unsplash.com/photo-1568651341772-27e163d76e73?w=500&auto=format&fit=crop&q=60",
    deliveryTime: "14 mins",
  },
  {
    id: "g-6",
    name: "Organic Farm-Fresh Eggs (12 pcs)",
    category: "Proteins & Dairy",
    quantity: "12",
    unit: "pcs",
    price: 160,
    inStock: true,
    nutritionNote: "6.5g Bioavailable Protein per egg. Omega-3 fortified.",
    imageUrl: "https://images.unsplash.com/photo-1516448424440-5db526a090b4?w=500&auto=format&fit=crop&q=60",
    deliveryTime: "11 mins",
  },
  // Superfoods & Snacks
  {
    id: "g-7",
    name: "Raw Chia Seeds (200g)",
    category: "Superfoods & Seeds",
    quantity: "200",
    unit: "g",
    price: 199,
    discountPrice: 150,
    discountText: "24% OFF",
    inStock: true,
    nutritionNote: "Rich in Omega-3 fatty acids, fiber, and calcium. Supports hydration retention.",
    imageUrl: "https://images.unsplash.com/photo-1610970881699-44a5587caaec?w=500&auto=format&fit=crop&q=60",
    deliveryTime: "15 mins",
  },
  {
    id: "g-8",
    name: "Roasted Sea Salt Almonds (150g)",
    category: "Healthy Snacks",
    quantity: "150",
    unit: "g",
    price: 249,
    inStock: false,
    nutritionNote: "High in Monounsaturated fats and Vitamin E. Perfect midday healthy snack.",
    imageUrl: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=500&auto=format&fit=crop&q=60",
    deliveryTime: "Out of Stock",
  },
];

export const MOCK_PREVIOUS_CHATS = [
  {
    id: "c-1",
    title: "💪 Muscle Gain Diet Plan",
    messages: [
      { role: "user", content: "Hey! Can you recommend a high-protein vegetarian dinner under 500 calories?" },
      {
        role: "assistant",
        content: JSON.stringify({
          text: "Certainly! I recommend the **Keto Paneer Tikka Salad Bowl**. It is rich in vegetarian proteins, loaded with healthy fats from olives and cottage cheese, and keeps your carbohydrate load low to prevent energy crashes.",
          recommendation: {
            mealTitle: "Keto Paneer Tikka Salad Bowl",
            calories: 380,
            protein: 22,
            cuisine: "Indian/Salads",
            healthScore: 9.1,
            groceryItems: ["Fresh Paneer", "Baby Spinach", "English Cucumbers", "Kalamata Olives", "Mint Leaves"],
            reason: "Provides 22g of bioavailable proteins at only 380 kcal. Perfect for muscle recovery.",
          },
          wellnessInsight: "Adding 10g of pumpkin seeds to this salad will increase zinc and magnesium for optimal muscle repair.",
        }),
      },
    ],
  },
  {
    id: "c-2",
    title: "🥗 Low Glycemic Groceries",
    messages: [
      { role: "user", content: "Suggest some ingredients for a diabetic-friendly dinner." },
      {
        role: "assistant",
        content: JSON.stringify({
          text: "Here is an AI-curated shopping list of ingredients with a low glycemic index. These items will help stabilize your blood sugar levels while providing essential fiber and healthy micronutrients.",
          groceryPlan: [
            { name: "Organic Avocados", category: "Fresh Produce", quantity: "2", unit: "pcs", nutritionNote: "Healthy monounsaturated fats that slow digestion" },
            { name: "Hydroponic Spinach", category: "Fresh Produce", quantity: "200", unit: "g", nutritionNote: "High magnesium content which improves insulin sensitivity" },
            { name: "Chia Seeds", category: "Superfoods", quantity: "1", unit: "pack", nutritionNote: "High soluble fiber content" },
            { name: "Unsweetened Almond Milk", category: "Proteins & Dairy", quantity: "1", unit: "L", nutritionNote: "Low glycemic milk alternative" },
          ],
        }),
      },
    ],
  },
];

export const MOCK_ADDRESSES: MockAddress[] = [
  {
    id: "addr-1",
    type: "Home",
    addressLine1: "Flat 402, Elite Residency",
    addressLine2: "Gachibowli, Hyderabad, Telangana - 500032",
    city: "Hyderabad",
    icon: "🏠",
  },
  {
    id: "addr-2",
    type: "Work",
    addressLine1: "Building 12, Mindspace IT Park",
    addressLine2: "Madhapur, Hyderabad, Telangana - 500081",
    city: "Hyderabad",
    icon: "💼",
  },
  {
    id: "addr-3",
    type: "Gym",
    addressLine1: "Cult.fit Center, Third Floor",
    addressLine2: "Jubilee Hills, Road No. 36, Hyderabad - 500033",
    city: "Hyderabad",
    icon: "💪",
  },
];

export const MOCK_SAVINGS_OFFERS = [
  { code: "FIT50", description: "Save ₹50 on healthy orders above ₹200", discount: 50 },
  { code: "INSTAFIT", description: "Get 15% discount on Organic groceries", discountPercent: 15 },
  { code: "HEALTHEAT", description: "Free Delivery on AI Recommended dishes", discount: 30 },
];

export const MOCK_HISTORICAL_ORDERS = [
  {
    id: "order-9831",
    date: "May 22, 2026",
    status: "Delivered",
    price: 380,
    items: [
      { name: "Fit-Fuel Grilled Chicken & Broccoli", type: "meal", quantity: 1, price: 380, calories: 520, protein: 48 },
    ],
    rating: 5,
  },
  {
    id: "order-9214",
    date: "May 18, 2026",
    status: "Delivered",
    price: 459,
    items: [
      { name: "Organic Avocados (2 pcs)", type: "grocery", quantity: 1, price: 199 },
      { name: "Unsweetened Almond Milk (1L)", type: "grocery", quantity: 1, price: 280 },
    ],
    rating: 4,
  },
];
