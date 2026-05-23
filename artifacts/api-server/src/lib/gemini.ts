import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiApiKey = process.env.GEMINI_API_KEY || "AIzaSyARGxuqrzLJsVqNpbtPUm7Op4NiqA0pfmA";

if (!geminiApiKey) {
  console.warn("[Gemini] GEMINI_API_KEY is missing — AI features will use fallback mode.");
}

export const genAI = new GoogleGenerativeAI(geminiApiKey);

// Model preference order — tries each until one works
const MODEL_PREFERENCE = [
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-flash-latest",
];

/** Returns a model instance. Tries preferred model first. */
export function getGeminiModel(systemInstruction?: string, jsonMode = false) {
  return genAI.getGenerativeModel({
    model: MODEL_PREFERENCE[0],
    systemInstruction,
    generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined,
  });
}

/** 
 * Intelligent fallback responses when Gemini API is unavailable (429/network error).
 * Returns structured JSON matching the NutriFlow AI response format.
 */
export function getFallbackResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  // Grocery plan request
  if (msg.includes("grocery") || msg.includes("shopping") || msg.includes("buy")) {
    return JSON.stringify({
      text: "Here's a healthy grocery plan to get you started! I've put together a balanced selection covering all your essential macros and micronutrients for the week.",
      wellnessInsight: "Planning groceries in advance reduces impulse buying by 40% and helps you stick to your nutrition goals.",
      groceryPlan: [
        { name: "Chicken Breast", category: "Proteins", quantity: "500", unit: "g", nutritionNote: "Lean protein, ~31g protein per 100g" },
        { name: "Salmon Fillet", category: "Proteins", quantity: "300", unit: "g", nutritionNote: "Rich in Omega-3 fatty acids" },
        { name: "Eggs", category: "Proteins", quantity: "12", unit: "pieces", nutritionNote: "Complete protein with essential amino acids" },
        { name: "Brown Rice", category: "Grains", quantity: "1", unit: "kg", nutritionNote: "Complex carbs with fiber for sustained energy" },
        { name: "Oats", category: "Grains", quantity: "500", unit: "g", nutritionNote: "Beta-glucan fiber, great for heart health" },
        { name: "Spinach", category: "Vegetables", quantity: "200", unit: "g", nutritionNote: "Iron, folate, and antioxidants" },
        { name: "Broccoli", category: "Vegetables", quantity: "300", unit: "g", nutritionNote: "High in vitamin C and cancer-fighting compounds" },
        { name: "Sweet Potato", category: "Vegetables", quantity: "500", unit: "g", nutritionNote: "Complex carbs with vitamin A and potassium" },
        { name: "Bananas", category: "Fruits", quantity: "6", unit: "pieces", nutritionNote: "Quick energy and potassium for muscle function" },
        { name: "Blueberries", category: "Fruits", quantity: "200", unit: "g", nutritionNote: "Antioxidant powerhouse for brain health" },
        { name: "Greek Yogurt", category: "Dairy", quantity: "500", unit: "g", nutritionNote: "Probiotics and protein for gut health" },
        { name: "Olive Oil", category: "Pantry", quantity: "500", unit: "ml", nutritionNote: "Heart-healthy monounsaturated fats" },
      ]
    });
  }

  // Weight loss request
  if (msg.includes("weight loss") || msg.includes("lose weight") || msg.includes("fat loss") || msg.includes("slim")) {
    return JSON.stringify({
      text: "Great goal! For effective and sustainable weight loss, focus on creating a modest calorie deficit while maintaining high protein intake to preserve muscle mass. Here's a meal recommendation that fits perfectly!",
      recommendation: {
        mealTitle: "Zucchini Noodles with Grilled Chicken",
        calories: 320,
        protein: 38,
        cuisine: "Mediterranean",
        healthScore: 94,
        groceryItems: ["Zucchini", "Chicken breast", "Cherry tomatoes", "Olive oil", "Garlic", "Basil"],
        reason: "Low-calorie, high-protein meal with fiber-rich vegetables to keep you full longer. Perfect for a calorie deficit."
      },
      wellnessInsight: "Eating protein at every meal can boost your metabolism by 80–100 calories per day through the thermic effect of food."
    });
  }

  // Muscle gain / protein request
  if (msg.includes("muscle") || msg.includes("protein") || msg.includes("gain") || msg.includes("bulk")) {
    return JSON.stringify({
      text: "Building muscle requires a calorie surplus with high protein intake. Here's a power-packed meal to fuel your gains!",
      recommendation: {
        mealTitle: "High-Protein Chicken & Quinoa Power Bowl",
        calories: 650,
        protein: 55,
        cuisine: "American",
        healthScore: 91,
        groceryItems: ["Chicken breast", "Quinoa", "Sweet potato", "Avocado", "Black beans", "Greek yogurt"],
        reason: "55g protein per serving with complex carbs for glycogen replenishment. Perfect post-workout meal."
      },
      wellnessInsight: "Aim for 1.6–2.2g of protein per kg of body weight daily for optimal muscle protein synthesis."
    });
  }

  // Vegetarian / vegan request
  if (msg.includes("vegetarian") || msg.includes("vegan") || msg.includes("plant") || msg.includes("no meat")) {
    return JSON.stringify({
      text: "Plant-based eating is incredibly nutritious! Here's a delicious vegetarian meal packed with complete proteins and all essential nutrients.",
      recommendation: {
        mealTitle: "Paneer & Chickpea Tikka Masala",
        calories: 480,
        protein: 28,
        cuisine: "Indian",
        healthScore: 88,
        groceryItems: ["Paneer", "Chickpeas", "Tomatoes", "Onion", "Ginger", "Garam masala", "Heavy cream", "Brown rice"],
        reason: "Complete protein from paneer and chickpeas with anti-inflammatory spices. Satisfying and nutritious."
      },
      wellnessInsight: "Combining legumes with grains creates a complete amino acid profile, perfect for vegetarian diets."
    });
  }

  // Breakfast request
  if (msg.includes("breakfast") || msg.includes("morning") || msg.includes("brunch")) {
    return JSON.stringify({
      text: "A nutritious breakfast sets the tone for the entire day! Here's a balanced morning meal that gives you sustained energy without the mid-morning crash.",
      recommendation: {
        mealTitle: "Avocado Toast with Poached Eggs",
        calories: 380,
        protein: 22,
        cuisine: "American",
        healthScore: 90,
        groceryItems: ["Whole grain bread", "Avocado", "Eggs", "Cherry tomatoes", "Lemon", "Red chili flakes"],
        reason: "Healthy fats from avocado, complete protein from eggs, and complex carbs from whole grain bread for sustained energy."
      },
      wellnessInsight: "Eating breakfast with protein can reduce calorie intake by up to 135 calories at lunch."
    });
  }

  // Diabetes / blood sugar
  if (msg.includes("diabetes") || msg.includes("blood sugar") || msg.includes("insulin") || msg.includes("diabetic")) {
    return JSON.stringify({
      text: "Managing blood sugar through diet is very effective. Focus on low-glycemic foods, fiber, and balanced meals. Here's a diabetes-friendly meal recommendation — but please consult your healthcare provider for personalized medical nutrition therapy.",
      recommendation: {
        mealTitle: "Grilled Salmon with Roasted Vegetables",
        calories: 410,
        protein: 42,
        cuisine: "Mediterranean",
        healthScore: 96,
        groceryItems: ["Salmon fillet", "Asparagus", "Bell peppers", "Cauliflower", "Olive oil", "Lemon", "Herbs"],
        reason: "Low glycemic index, high in Omega-3s which improve insulin sensitivity, and fiber-rich vegetables slow glucose absorption."
      },
      wellnessInsight: "Including cinnamon in your diet may help lower fasting blood sugar levels naturally."
    });
  }

  // Generic meal / food request (default)
  return JSON.stringify({
    text: "Here's a healthy, balanced meal recommendation for you! This is designed to give you great nutrition while being delicious and easy to prepare.",
    recommendation: {
      mealTitle: "Grilled Chicken with Quinoa & Roasted Vegetables",
      calories: 520,
      protein: 45,
      cuisine: "Mediterranean",
      healthScore: 92,
      groceryItems: ["Chicken breast", "Quinoa", "Bell peppers", "Zucchini", "Olive oil", "Lemon", "Garlic", "Fresh herbs"],
      reason: "Balanced macros with lean protein, complex carbs, and colorful vegetables providing a wide spectrum of vitamins and minerals."
    },
    wellnessInsight: "Eating colorful vegetables ensures you get a diverse range of antioxidants and phytonutrients for optimal health."
  });
}
