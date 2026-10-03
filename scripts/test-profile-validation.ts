import {
  GetProfileResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
} from "../lib/api-zod/src/generated/api.ts";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log("=== Running Profile Schema Email Validation Tests ===\n");

const baseProfile = {
  id: "c4b31a89-2908-410d-a342-99d821213421",
  name: "Gnanendra Munagapaka",
  isEmailVerified: false,
  onboardingCompleted: true,
  age: 26,
  weight: 74.5,
  height: 178,
  goal: "Stay Healthy",
  dietaryPreferences: ["Vegetarian"],
  allergies: ["Peanuts"],
  workoutFrequency: "Moderate",
  waterIntake: "2L",
  mealHabits: "3 Meals",
  budget: "Medium",
  wellnessScore: 80,
  streak: 5,
  avatarUrl: null,
};

// 1. Email as valid string
console.log("Test 1: Email as valid string");
{
  const withStringEmail = { ...baseProfile, email: "user@example.com" };
  const parsed = GetProfileResponse.parse(withStringEmail);
  assert(parsed.email === "user@example.com", "Preserves valid string email");

  const bodyParsed = UpdateProfileBody.parse({ name: "Updated Name", email: "user@example.com" });
  assert(bodyParsed.email === "user@example.com", "UpdateProfileBody accepts string email");

  const updateResParsed = UpdateProfileResponse.parse(withStringEmail);
  assert(updateResParsed.email === "user@example.com", "UpdateProfileResponse accepts string email");
  console.log("  ✓ Valid string email validates successfully");
}

// 2. Email as null (Swiggy OAuth production case)
console.log("Test 2: Email as null (legitimately nullable for Swiggy OAuth users)");
{
  const withNullEmail = { ...baseProfile, email: null };
  const parsed = GetProfileResponse.parse(withNullEmail);
  assert(parsed.email === null, "Preserves null email without converting to empty string");

  const bodyParsed = UpdateProfileBody.parse({ name: "Updated Name", email: null });
  assert(bodyParsed.email === null, "UpdateProfileBody accepts null email");

  const updateResParsed = UpdateProfileResponse.parse(withNullEmail);
  assert(updateResParsed.email === null, "UpdateProfileResponse accepts null email");
  console.log("  ✓ Null email validates successfully without fabrication");
}

// 3. Omitted email (undefined)
console.log("Test 3: Omitted email (undefined)");
{
  const { email, ...withoutEmail } = baseProfile as any;
  const parsed = GetProfileResponse.parse(withoutEmail);
  assert(parsed.email === undefined || parsed.email === null, "Allows omitted email");

  const bodyParsed = UpdateProfileBody.parse({ onboardingCompleted: true });
  assert(bodyParsed.onboardingCompleted === true, "UpdateProfileBody works with omitted email");
  assert(!("email" in bodyParsed) || bodyParsed.email === undefined, "Omitted email remains undefined");
  console.log("  ✓ Omitted email validates successfully");
}

// 4. Invalid non-string email value (should fail validation)
console.log("Test 4: Invalid non-string email value");
{
  const testInvalid = (val: any, label: string) => {
    let failed = false;
    try {
      GetProfileResponse.parse({ ...baseProfile, email: val });
    } catch (err: any) {
      failed = true;
      assert(err.name === "ZodError", `Threw ZodError for ${label}`);
    }
    assert(failed, `Non-string email (${label}) must be rejected`);

    let bodyFailed = false;
    try {
      UpdateProfileBody.parse({ email: val });
    } catch (err: any) {
      bodyFailed = true;
      assert(err.name === "ZodError", `UpdateProfileBody threw ZodError for ${label}`);
    }
    assert(bodyFailed, `UpdateProfileBody must reject non-string email (${label})`);
  };

  testInvalid(12345, "number");
  testInvalid(true, "boolean");
  testInvalid({ address: "test" }, "object");
  testInvalid(["email@test.com"], "array");
  console.log("  ✓ Non-string email types correctly rejected");
}

// 5. Existing profile fields continue to validate correctly
console.log("Test 5: Existing profile fields validation integrity");
{
  const parsed = GetProfileResponse.parse({ ...baseProfile, email: null });
  assert(parsed.id === baseProfile.id, "ID preserved");
  assert(parsed.name === "Gnanendra Munagapaka", "Name preserved");
  assert(parsed.goal === "Stay Healthy", "Goal preserved");
  assert(parsed.dietaryPreferences.length === 1 && parsed.dietaryPreferences[0] === "Vegetarian", "Dietary preserved");
  assert(parsed.allergies.length === 1 && parsed.allergies[0] === "Peanuts", "Allergies preserved");
  assert(parsed.wellnessScore === 80, "Wellness score preserved");
  assert(parsed.streak === 5, "Streak preserved");
  assert(parsed.onboardingCompleted === true, "Onboarding completed preserved");
  console.log("  ✓ All existing profile fields continue to validate with 100% integrity");
}

console.log("\n==================================================================");
console.log("🎉 ALL 5 PROFILE VALIDATION REGRESSION TESTS PASSED SUCCESSFULLY!");
console.log("==================================================================\n");
