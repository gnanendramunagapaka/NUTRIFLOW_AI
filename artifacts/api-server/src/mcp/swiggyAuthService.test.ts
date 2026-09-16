import {
  startSwiggyAuth,
  handleSwiggyOAuthCallback,
} from "./swiggyAuthService";

async function runSwiggyAuthServiceTests() {
  console.log("▶ Running Swiggy Auth Service Tests (TASK-008, TASK-009)...\n");

  // TEST 1: startSwiggyAuth generates authorization URL with state and challenge
  const userId = 77;
  const authStart = await startSwiggyAuth(userId);
  if (!authStart.authorizationUrl.includes("client_id=")) throw new Error("Missing client_id in start URL");
  if (!authStart.authorizationUrl.includes("code_challenge_method=S256")) throw new Error("Missing S256 in start URL");
  if (!authStart.state) throw new Error("Missing state in authStart");
  console.log("✔ TASK-008 PASS: startSwiggyAuth created valid OAuth 2.1 + PKCE start payload.");

  // TEST 2: OAuth callback with invalid state fails gracefully
  const invalidResult = await handleSwiggyOAuthCallback("mock_code_123", "invalid_state_value", undefined);
  if (invalidResult.success) throw new Error("Callback with invalid state should fail");
  if (!invalidResult.error?.includes("Invalid or expired")) throw new Error("Unexpected error message");
  console.log("✔ TASK-009 PASS: Callback rejects invalid or non-existent OAuth state.");

  // TEST 3: OAuth callback with missing code fails gracefully
  const tx = await startSwiggyAuth(123);
  const missingCodeResult = await handleSwiggyOAuthCallback(undefined, tx.state, undefined);
  if (missingCodeResult.success) throw new Error("Callback with missing code should fail");
  console.log("✔ TASK-009 PASS: Callback rejects missing authorization code.");

  // TEST 4: OAuth error parameter handled cleanly
  const oauthErrResult = await handleSwiggyOAuthCallback(undefined, undefined, "access_denied", "User canceled request");
  if (oauthErrResult.success) throw new Error("OAuth error callback should fail");
  if (!oauthErrResult.error?.includes("User canceled")) throw new Error("OAuth error description not preserved");
  console.log("✔ TASK-009 PASS: OAuth error responses handled cleanly.");

  console.log("\n🎉 Swiggy Auth Service Tests PASSED!\n");
}

runSwiggyAuthServiceTests();
