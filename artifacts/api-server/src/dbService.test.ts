import { DbService } from "./services/dbService";
import {
  saveSwiggyConnection,
  getSwiggyConnectionForUser,
  disconnectSwiggyUser,
} from "./mcp/swiggyAuthService";

async function runDbServiceIntegrationTests() {
  console.log("▶ Running Supabase Data API Integration & User Isolation Tests...\n");

  const testEmailA = `test_user_a_${Date.now()}@example.com`;
  const testEmailB = `test_user_b_${Date.now()}@example.com`;

  try {
    // 1. Insert / Auto-provision User A & User B
    console.log("1. Testing User Profile Creation / Insert...");
    const userA = await DbService.createUserProfile({
      name: "User A",
      email: testEmailA,
      goal: "Weight Loss",
      dietaryPreferences: ["vegan"],
      allergies: ["nuts"],
    });

    const userB = await DbService.createUserProfile({
      name: "User B",
      email: testEmailB,
      goal: "Muscle Gain",
      dietaryPreferences: ["high-protein"],
      allergies: [],
    });

    if (!userA?.id || !userB?.id) {
      throw new Error("Failed to insert test user profiles.");
    }
    console.log(`✔ User A created with ID ${userA.id}, User B created with ID ${userB.id}.`);

    // 2. Read queries
    console.log("\n2. Testing Read Queries...");
    const fetchedA = await DbService.getUserByEmail(testEmailA);
    if (!fetchedA || fetchedA.id !== userA.id) {
      throw new Error("getUserByEmail failed for User A.");
    }
    console.log("✔ Read query (getUserByEmail) succeeded.");

    // 3. Updates
    console.log("\n3. Testing Update Operations...");
    const updatedA = await DbService.updateUserProfile(userA.id, {
      streak: 5,
      wellnessScore: 88,
    });
    if (updatedA.streak !== 5 || updatedA.wellnessScore !== 88) {
      throw new Error("updateUserProfile failed to update fields.");
    }
    console.log("✔ Update operation (updateUserProfile) succeeded.");

    // 4. Cart Operations & User Isolation
    console.log("\n4. Testing Cart Operations & User Isolation...");
    await DbService.addCartItem({
      userId: userA.id,
      itemId: "item_a_101",
      name: "Vegan Salad Bowl",
      price: 250,
      quantity: 2,
      type: "meal",
    });

    await DbService.addCartItem({
      userId: userB.id,
      itemId: "item_b_202",
      name: "Steak & Eggs",
      price: 450,
      quantity: 1,
      type: "meal",
    });

    const cartA = await DbService.getCartItems(userA.id);
    const cartB = await DbService.getCartItems(userB.id);

    if (cartA.some((i) => i.itemId === "item_b_202")) {
      throw new Error("SECURITY FAILURE: User A can see User B's cart item!");
    }
    if (cartB.some((i) => i.itemId === "item_a_101")) {
      throw new Error("SECURITY FAILURE: User B can see User A's cart item!");
    }
    console.log("✔ User isolation verified for Cart operations.");

    // 5. Saved Meals CRUD & Isolation
    console.log("\n5. Testing Saved Meals CRUD...");
    const savedMealA = await DbService.saveMeal({
      userId: userA.id,
      name: "Avocado Toast",
      calories: 320,
      protein: 12,
      price: 180,
    });

    const savedMealsA = await DbService.getSavedMeals(userA.id);
    const savedMealsB = await DbService.getSavedMeals(userB.id);

    if (savedMealsB.some((m) => m.id === savedMealA.id)) {
      throw new Error("SECURITY FAILURE: User B can see User A's saved meal!");
    }

    await DbService.deleteSavedMeal(savedMealA.id, userA.id);
    const afterDeleteA = await DbService.getSavedMeals(userA.id);
    if (afterDeleteA.some((m) => m.id === savedMealA.id)) {
      throw new Error("Delete operation failed for saved meal.");
    }
    console.log("✔ Saved meals CRUD & Isolation verified.");

    // 6. Grocery Plan Creation & Item Toggle
    console.log("\n6. Testing Grocery Plan Creation & Item Toggle...");
    const listA = await DbService.createGroceryList(userA.id, "2026-09-16");
    const itemsA = await DbService.createGroceryItems([
      {
        listId: listA.id,
        name: "Almond Milk",
        category: "Dairy",
        quantity: "1",
        unit: "liter",
        isChecked: false,
      },
    ]);

    const toggledItem = await DbService.toggleGroceryItem(itemsA[0].id, true);
    if (!toggledItem.isChecked) {
      throw new Error("Grocery item toggle failed.");
    }
    console.log("✔ Grocery plan creation & item toggle verified.");

    // 7. Swiggy Connection Storage & Isolation
    console.log("\n7. Testing Swiggy Connection Isolation...");
    const tokenA: string = "swiggy_token_user_A_secret";
    const tokenB: string = "swiggy_token_user_B_secret";
    await saveSwiggyConnection(userA.id, tokenA, 3600);
    await saveSwiggyConnection(userB.id, tokenB, 3600);

    const swiggyConnA = await getSwiggyConnectionForUser(userA.id);
    const swiggyConnB = await getSwiggyConnectionForUser(userB.id);

    if (swiggyConnA?.accessToken !== tokenA || swiggyConnB?.accessToken !== tokenB) {
      throw new Error("Swiggy connection isolation mismatch!");
    }
    if ((swiggyConnA?.accessToken as string) === (swiggyConnB?.accessToken as string)) {
      throw new Error("Cross-user Swiggy token leakage detected!");
    }

    await disconnectSwiggyUser(userA.id);
    await disconnectSwiggyUser(userB.id);
    console.log("✔ Swiggy connection storage and isolation verified.");

    // Cleanup test cart items & grocery lists
    await DbService.clearCart(userA.id);
    await DbService.clearCart(userB.id);

    console.log("\n🎉 ALL SUPABASE DATA API INTEGRATION TESTS PASSED SUCCESSFULLY!\n");
  } catch (error) {
    console.error("❌ Integration test error:", error);
    process.exit(1);
  }
}

runDbServiceIntegrationTests();
