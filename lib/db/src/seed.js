import pg from "pg";
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/postgres";

const restaurants = [
  { name: "Green & Lean Cafe", cuisine: "Salads & Bowls", rating: 4.8, deliveryTime: "15-25 min", imageUrl: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=500&auto=format&fit=crop&q=60", tags: ["salads", "organic", "fresh"] },
  { name: "Protein Powerhouse", cuisine: "Gym Meals & Shakes", rating: 4.6, deliveryTime: "20-30 min", imageUrl: "https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=500&auto=format&fit=crop&q=60", tags: ["high-protein", "fitness", "keto"] },
  { name: "Keto Kitchen", cuisine: "Low Carb & Keto", rating: 4.5, deliveryTime: "25-35 min", imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60", tags: ["keto", "low-carb", "healthy-fats"] },
  { name: "Vegan Vibe", cuisine: "Vegan & Plant-Based", rating: 4.7, deliveryTime: "20-30 min", imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=60", tags: ["vegan", "vegetarian", "organic"] },
  { name: "Millet Marvels", cuisine: "South Indian Healthy", rating: 4.4, deliveryTime: "15-25 min", imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=60", tags: ["millets", "diabetic-friendly", "south-indian"] },
  { name: "Whole Wheat Wonders", cuisine: "Healthy Bakery & Wraps", rating: 4.3, deliveryTime: "25-35 min", imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=60", tags: ["whole-wheat", "wraps", "bakery"] },
  { name: "Sugarfree Sensations", cuisine: "Diabetic-Friendly Desserts", rating: 4.5, deliveryTime: "30-40 min", imageUrl: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500&auto=format&fit=crop&q=60", tags: ["diabetic-friendly", "sugar-free", "desserts"] },
  { name: "Simply Soups & Broths", cuisine: "Soups & Salads", rating: 4.2, deliveryTime: "20-30 min", imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?w=500&auto=format&fit=crop&q=60", tags: ["soups", "light", "warm"] },
  { name: "The Avocado Club", cuisine: "Healthy Breakfast", rating: 4.6, deliveryTime: "15-25 min", imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=60", tags: ["avocado", "breakfast", "eggs"] },
  { name: "Purely Organic", cuisine: "Farm to Table", rating: 4.7, deliveryTime: "35-45 min", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=60", tags: ["organic", "bowls", "fresh"] },
  { name: "Raw & Refreshing", cuisine: "Juices & Superfoods", rating: 4.5, deliveryTime: "10-20 min", imageUrl: "https://images.unsplash.com/photo-1610970881699-44a5587caaec?w=500&auto=format&fit=crop&q=60", tags: ["juices", "smoothies", "refreshing"] },
  { name: "Balanced Bowls", cuisine: "Healthy Main Course", rating: 4.6, deliveryTime: "20-30 min", imageUrl: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=500&auto=format&fit=crop&q=60", tags: ["balanced", "macro-friendly", "bowls"] },
  { name: "Fit Bites", cuisine: "Healthy Snacks & Sides", rating: 4.4, deliveryTime: "15-25 min", imageUrl: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=500&auto=format&fit=crop&q=60", tags: ["snacks", "energy-bites", "nuts"] },
  { name: "Mediterranean Medley", cuisine: "Greek & Mediterranean", rating: 4.7, deliveryTime: "25-35 min", imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=60", tags: ["mediterranean", "greek", "olive-oil"] },
  { name: "Healthy Hearth", cuisine: "Balanced Meal Kits", rating: 4.5, deliveryTime: "30-40 min", imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&auto=format&fit=crop&q=60", tags: ["meal-kits", "balanced", "home-style"] },
];

const meals = [
  // Green & Lean Cafe (1)
  { name: "Superfood Avocado Salad", description: "Fresh kale, sliced avocados, cherry tomatoes, quinoa, and sunflower seeds with zesty lemon vinaigrette.", calories: 340, protein: 8, carbs: 22, fat: 26, healthScore: 9.2, cuisine: "Salads", price: 280, isAiRecommended: true, tags: ["low-carb", "budget", "vegetarian"] },
  { name: "Tofu Quinoa Crunch Bowl", description: "Steamed quinoa topped with organic crispy tofu, shredded carrots, purple cabbage, edamame, and peanut drizzle.", calories: 420, protein: 18, carbs: 45, fat: 19, healthScore: 8.8, cuisine: "Bowls", price: 320, isAiRecommended: false, tags: ["vegetarian", "low-carb"] },
  { name: "Zucchini Pesto Noodles", description: "Spiralized zucchini tossed in homemade basil-walnut pesto, roasted chickpeas, and cherry tomatoes.", calories: 290, protein: 7, carbs: 14, fat: 24, healthScore: 9.0, cuisine: "Italian", price: 290, isAiRecommended: true, tags: ["low-carb", "diabetic-friendly", "vegetarian"] },

  // Protein Powerhouse (2)
  { name: "Grilled Chicken & Broccoli Feast", description: "Tender double chicken breast grilled to perfection, served with steamed broccoli and herbed brown rice.", calories: 510, protein: 48, carbs: 32, fat: 8, healthScore: 9.5, cuisine: "Gym Meals", price: 380, isAiRecommended: true, tags: ["high-protein", "gym-meals"] },
  { name: "Lean Beef Steak Rice Bowl", description: "Seared lean beef steak medallions, brown rice, peppers, and onions in a high-protein savory glaze.", calories: 590, protein: 42, carbs: 48, fat: 12, healthScore: 8.9, cuisine: "Gym Meals", price: 490, isAiRecommended: false, tags: ["high-protein", "gym-meals"] },
  { name: "Whey Protein Berry Shake", description: "Premium isolate vanilla whey protein, mixed berries, almond milk, and a dash of chia seeds.", calories: 260, protein: 26, carbs: 12, fat: 4, healthScore: 8.7, cuisine: "Beverages", price: 210, isAiRecommended: true, tags: ["high-protein", "gym-meals", "budget"] },

  // Keto Kitchen (3)
  { name: "Keto Cheesy Bacon Omelette", description: "Three organic eggs, cheddar cheese, crispy smoked bacon, and fresh spinach. Perfect keto start.", calories: 490, protein: 28, carbs: 3, fat: 41, healthScore: 8.3, cuisine: "Keto", price: 240, isAiRecommended: true, tags: ["keto", "low-carb", "budget"] },
  { name: "Creamy Garlic Butter Salmon", description: "Pan-seared Atlantic salmon fillet in a rich garlic butter cream sauce with asparagus spears.", calories: 540, protein: 34, carbs: 4, fat: 44, healthScore: 9.1, cuisine: "Keto", price: 580, isAiRecommended: true, tags: ["keto", "low-carb", "high-protein"] },
  { name: "Bacon Avocado Keto Salad", description: "Crisp romaine, smoked bacon bits, ripe avocado slices, blue cheese crumbles, and olive oil dressing.", calories: 460, protein: 12, carbs: 5, fat: 43, healthScore: 8.5, cuisine: "Salads", price: 310, isAiRecommended: false, tags: ["keto", "low-carb"] },

  // Vegan Vibe (4)
  { name: "Tempeh Buddha Bowl", description: "Marinated grilled organic tempeh, brown rice, sweet potato cubes, roasted broccoli, and tahini dressing.", calories: 480, protein: 22, carbs: 56, fat: 16, healthScore: 9.3, cuisine: "Vegan", price: 340, isAiRecommended: true, tags: ["vegan", "vegetarian"] },
  { name: "Spicy Chickpea Coconut Curry", description: "Simmered chickpeas in a creamy coconut curry sauce with bell peppers, spinach, and brown basmati rice.", calories: 450, protein: 14, carbs: 58, fat: 15, healthScore: 8.9, cuisine: "Indian", price: 260, isAiRecommended: false, tags: ["vegan", "vegetarian", "budget"] },
  { name: "Vegan Jackfruit Pulled Wrap", description: "Slow-cooked shredded jackfruit, vegan slaw, and barbecue sauce wrapped in a spinach tortilla.", calories: 380, protein: 10, carbs: 48, fat: 12, healthScore: 8.4, cuisine: "Wraps", price: 280, isAiRecommended: true, tags: ["vegan", "vegetarian", "budget"] },

  // Millet Marvels (5)
  { name: "Ragi Millet Idli (4 pcs)", description: "Steamed finger millet cakes, soft and loaded with fiber. Served with organic tomato chutney and sambar.", calories: 240, protein: 8, carbs: 42, fat: 2, healthScore: 9.2, cuisine: "South Indian", price: 120, isAiRecommended: true, tags: ["diabetic-friendly", "budget", "vegetarian"] },
  { name: "Foxtail Millet Khichdi", description: "Comforting slow-cooked foxtail millet and yellow lentils, tempered with clarified butter (ghee) and cumin.", calories: 320, protein: 10, carbs: 46, fat: 8, healthScore: 9.0, cuisine: "South Indian", price: 160, isAiRecommended: true, tags: ["diabetic-friendly", "budget", "vegetarian"] },
  { name: "Millet Onion Uttapam", description: "Thick savory pancake made of fermented millet batter, topped with diced onions and fresh green chilies.", calories: 290, protein: 7, carbs: 44, fat: 6, healthScore: 8.6, cuisine: "South Indian", price: 140, isAiRecommended: false, tags: ["diabetic-friendly", "budget", "vegetarian"] },

  // Whole Wheat Wonders (6)
  { name: "Mediterranean Hummus Wrap", description: "Whole wheat tortilla stuffed with roasted red pepper hummus, cucumbers, olives, feta cheese, and mixed greens.", calories: 360, protein: 11, carbs: 42, fat: 14, healthScore: 8.7, cuisine: "Wraps", price: 220, isAiRecommended: true, tags: ["budget", "vegetarian"] },
  { name: "Grilled Veggie Whole Wheat Pizza", description: "Thin-crust whole wheat pizza crust topped with marinara sauce, low-fat mozzarella, mushrooms, olives, and onions.", calories: 440, protein: 18, carbs: 54, fat: 13, healthScore: 8.3, cuisine: "Italian", price: 340, isAiRecommended: false, tags: ["vegetarian"] },

  // Sugarfree Sensations (7)
  { name: "Sugar-Free Oats & Berry Parfait", description: "Greek yogurt layers, sugar-free mixed berry compote, toasted oats, and a splash of stevia.", calories: 220, protein: 14, carbs: 24, fat: 5, healthScore: 9.0, cuisine: "Desserts", price: 190, isAiRecommended: true, tags: ["diabetic-friendly", "budget", "vegetarian"] },
  { name: "Almond Flour Keto Brownie", description: "Decadent dark chocolate brownie made with almond flour and erythritol. Rich in flavor, zero added sugar.", calories: 180, protein: 5, carbs: 6, fat: 16, healthScore: 8.1, cuisine: "Desserts", price: 150, isAiRecommended: true, tags: ["diabetic-friendly", "keto", "low-carb", "budget"] },

  // Simply Soups & Broths (8)
  { name: "Clear Chicken Vegetable Soup", description: "Slow-simmered organic chicken broth, shredded chicken breast, celery, carrots, and garden herbs.", calories: 190, protein: 22, carbs: 8, fat: 4, healthScore: 9.4, cuisine: "Soups", price: 180, isAiRecommended: true, tags: ["high-protein", "budget", "diabetic-friendly"] },
  { name: "Spiced Red Lentil Soup", description: "Hearty pureed red lentils, carrots, tomatoes, and warm Mediterranean spices. Super high fiber.", calories: 230, protein: 12, carbs: 32, fat: 3, healthScore: 9.2, cuisine: "Soups", price: 160, isAiRecommended: true, tags: ["budget", "vegetarian", "diabetic-friendly"] },

  // The Avocado Club (9)
  { name: "Classic Avocado Sourdough Toast", description: "Toasted artisanal sourdough spread with mashed avocado, cherry tomatoes, microgreens, and red pepper flakes.", calories: 280, protein: 7, carbs: 32, fat: 12, healthScore: 8.9, cuisine: "Breakfast", price: 260, isAiRecommended: true, tags: ["vegetarian", "budget"] },
  { name: "Avocado Poached Eggs Toast", description: "Our classic avocado toast topped with two organic poached eggs and a sprinkle of dynamic black sesame.", calories: 410, protein: 19, carbs: 33, fat: 19, healthScore: 9.2, cuisine: "Breakfast", price: 320, isAiRecommended: true, tags: ["high-protein", "gym-meals"] },

  // Purely Organic (10)
  { name: "Harvest Quinoa Buddha Bowl", description: "Warm quinoa, roasted butternut squash, raw beets, roasted brussels sprouts, organic tofu, and maple tahini.", calories: 460, protein: 16, carbs: 62, fat: 14, healthScore: 9.4, cuisine: "Bowls", price: 390, isAiRecommended: true, tags: ["vegan", "vegetarian"] },
  { name: "Teriyaki Organic Salmon Bowl", description: "Grilled organic wild salmon, brown rice, broccoli, carrots, and sweet teriyaki sauce made from honey.", calories: 520, protein: 36, carbs: 44, fat: 16, healthScore: 9.2, cuisine: "Bowls", price: 540, isAiRecommended: false, tags: ["high-protein"] },

  // Raw & Refreshing (11)
  { name: "Detox Green Cold-Pressed Juice", description: "Freshly pressed cucumber, celery, green apple, kale, ginger, and lemon. Nutritional energy booster.", calories: 90, protein: 2, carbs: 18, fat: 0, healthScore: 9.8, cuisine: "Beverages", price: 160, isAiRecommended: true, tags: ["diabetic-friendly", "budget", "vegan", "low-carb"] },
  { name: "Acai Anti-Oxidant Smoothie Bowl", description: "Thick acai berry blend topped with sliced strawberries, blueberries, chia seeds, and gluten-free granola.", calories: 310, protein: 6, carbs: 48, fat: 8, healthScore: 8.8, cuisine: "Bowls", price: 340, isAiRecommended: false, tags: ["vegan", "vegetarian"] },

  // Balanced Bowls (12)
  { name: "Tender Lean Chicken Breast Bowl", description: "Grilled diced chicken breast, brown rice, stir-fried mushrooms, spinach, and house soy-ginger reduction.", calories: 460, protein: 38, carbs: 38, fat: 9, healthScore: 9.3, cuisine: "Bowls", price: 320, isAiRecommended: true, tags: ["high-protein", "gym-meals"] },
  { name: "High-Protein Lentil & Egg Salad Bowl", description: "Black lentils, hard-boiled organic eggs, red onions, tomatoes, spinach, and light herb yoghurt dressing.", calories: 380, protein: 24, carbs: 28, fat: 13, healthScore: 9.1, cuisine: "Salads", price: 240, isAiRecommended: true, tags: ["high-protein", "budget"] },

  // Fit Bites (13)
  { name: "Organic Roasted Almonds (100g)", description: "Slow-roasted sea salted raw Californian almonds. Rich in Vitamin E and heart-healthy fats.", calories: 580, protein: 21, carbs: 22, fat: 49, healthScore: 8.7, cuisine: "Snacks", price: 180, isAiRecommended: true, tags: ["keto", "low-carb", "budget"] },
  { name: "Protein Peanut Butter Oats Bars", description: "Handmade energy bars containing rolled oats, peanut butter, raw honey, and organic whey protein isolate.", calories: 290, protein: 12, carbs: 28, fat: 11, healthScore: 8.2, cuisine: "Snacks", price: 110, isAiRecommended: false, tags: ["high-protein", "budget"] },

  // Mediterranean Medley (14)
  { name: "Mediterranean Greek Salad", description: "Crisp cucumbers, vine-ripened tomatoes, red onions, kalamata olives, real Greek feta cheese, and extra virgin olive oil.", calories: 270, protein: 7, carbs: 12, fat: 22, healthScore: 9.1, cuisine: "Greek", price: 290, isAiRecommended: true, tags: ["low-carb", "diabetic-friendly", "vegetarian"] },
  { name: "Herbed Chicken Souvlaki Skewers", description: "Three grilled skewers of tender garlic-herb chicken breast, served with tzatziki yoghurt sauce and a side salad.", calories: 390, protein: 35, carbs: 8, fat: 15, healthScore: 9.4, cuisine: "Greek", price: 380, isAiRecommended: true, tags: ["high-protein", "gym-meals", "low-carb"] },

  // Healthy Hearth (15)
  { name: "Homestyle Healthy Chicken Curry", description: "Chicken cooked in a light home-style onion-tomato gravy with minimal oil, served with 2 whole wheat rotis.", calories: 430, protein: 32, carbs: 42, fat: 10, healthScore: 8.9, cuisine: "Indian", price: 260, isAiRecommended: true, tags: ["budget", "high-protein"] },
  { name: "Paneer Bhurji & Multigrain Rotis", description: "Scrambled fresh cottage cheese cooked with onions, tomatoes, and green peas, served with 2 multigrain flatbreads.", calories: 470, protein: 24, carbs: 46, fat: 14, healthScore: 8.8, cuisine: "Indian", price: 240, isAiRecommended: false, tags: ["vegetarian", "budget"] },
  { name: "Low-Calorie Chicken Biryani", description: "Aromatic basmati rice cooked with chicken breast cubes, saffron, mint, and yoghurt. Made with 80% less oil.", calories: 490, protein: 34, carbs: 52, fat: 11, healthScore: 8.6, cuisine: "Indian", price: 360, isAiRecommended: true, tags: ["high-protein"] },
  { name: "Keto Grilled Tofu Salad", description: "Grilled extra-firm tofu over organic spinach, avocado chunks, cucumbers, and keto garlic-herb dressing.", calories: 310, protein: 16, carbs: 6, fat: 26, healthScore: 8.9, cuisine: "Keto", price: 250, isAiRecommended: true, tags: ["keto", "low-carb", "vegetarian"] },
  { name: "Oats Banana Whey Protein Pancakes", description: "High-protein pancakes made of blended organic oats, banana, egg whites, and vanilla protein isolate.", calories: 380, protein: 28, carbs: 42, fat: 6, healthScore: 9.1, cuisine: "Breakfast", price: 220, isAiRecommended: true, tags: ["high-protein", "gym-meals"] },
  { name: "Low-Carb Turkey Lettuce Wraps", description: "Lean minced turkey sauteed with water chestnuts and onions, wrapped in fresh iceberg lettuce leaves.", calories: 290, protein: 24, carbs: 12, fat: 8, healthScore: 9.3, cuisine: "Gym Meals", price: 270, isAiRecommended: true, tags: ["low-carb", "gym-meals", "budget"] },
  { name: "Diabetic-Friendly Quinoa Idli", description: "Light and fluffy idli prepared from quinoa and white lentils batter. Rich in protein and low glycemic index.", calories: 210, protein: 9, carbs: 32, fat: 2, healthScore: 9.4, cuisine: "South Indian", price: 130, isAiRecommended: true, tags: ["diabetic-friendly", "vegetarian", "budget"] },
  { name: "Vegan Lentil Bolognese Pasta", description: "Red lentil and tomato bolognese sauce served over high-fiber gluten-free brown rice spaghetti.", calories: 410, protein: 16, carbs: 68, fat: 6, healthScore: 8.9, cuisine: "Italian", price: 310, isAiRecommended: false, tags: ["vegan", "vegetarian"] },
  { name: "Keto Almond Butter Cups", description: "Decadent low-carb sugar-free cups made from organic cocoa, grass-fed butter, stevia, and raw almond butter.", calories: 220, protein: 6, carbs: 4, fat: 21, healthScore: 8.2, cuisine: "Desserts", price: 160, isAiRecommended: true, tags: ["keto", "low-carb", "diabetic-friendly"] },
];

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log("Connected to PostgreSQL for seeding...");

    // 1. Clear old data
    await client.query("TRUNCATE TABLE meals, restaurants CASCADE;");
    console.log("Cleared old meals and restaurants...");

    // 2. Insert restaurants
    const restaurantIds = [];
    for (const rest of restaurants) {
      const res = await client.query(
        `INSERT INTO restaurants (name, cuisine, rating, delivery_time, image_url, is_healthy, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;`,
        [rest.name, rest.cuisine, rest.rating, rest.deliveryTime, rest.imageUrl, rest.isHealthy !== false, rest.tags]
      );
      restaurantIds.push(res.rows[0].id);
    }
    console.log(`Successfully seeded ${restaurantIds.length} restaurants.`);

    // 3. Insert meals (referencing restaurantIds sequentially/randomly)
    let mealsSeededCount = 0;
    for (let i = 0; i < meals.length; i++) {
      const meal = meals[i];
      // distribute meals across restaurants:
      const rId = restaurantIds[i % restaurantIds.length];
      
      await client.query(
        `INSERT INTO meals (name, description, image_url, calories, protein, carbs, fat, health_score, cuisine, tags, price, is_ai_recommended, restaurant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
        [
          meal.name,
          meal.description,
          meal.name.includes("Salad") ? "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=60" :
          meal.name.includes("Bowl") ? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60" :
          meal.name.includes("Salmon") ? "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&auto=format&fit=crop&q=60" :
          meal.name.includes("Chicken") ? "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=500&auto=format&fit=crop&q=60" :
          meal.name.includes("Shake") ? "https://images.unsplash.com/photo-1502741224143-90386d7c8c82?w=500&auto=format&fit=crop&q=60" :
          meal.name.includes("Oats") ? "https://images.unsplash.com/photo-1517881917430-e70dfb3610aa?w=500&auto=format&fit=crop&q=60" :
          meal.name.includes("Toast") ? "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=60" :
          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60",
          meal.calories,
          meal.protein,
          meal.carbs,
          meal.fat,
          meal.healthScore,
          meal.cuisine,
          meal.tags,
          meal.price,
          meal.isAiRecommended,
          rId
        ]
      );
      mealsSeededCount++;
    }
    
    console.log(`Successfully seeded ${mealsSeededCount} meals.`);
    console.log("Seeding complete!");

  } catch (err) {
    console.error("Error during database seeding:", err);
  } finally {
    await client.end();
  }
}

seed();
