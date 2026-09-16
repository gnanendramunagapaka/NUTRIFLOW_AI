import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateOAuthState,
  createOAuthTransaction,
  getAndConsumeOAuthTransaction,
  buildAuthorizationUrl,
  getPendingTransactionCount,
} from "./oauthStore";
import crypto from "node:crypto";

function testOAuthStoreAndPKCE() {
  console.log("▶ Running OAuth & PKCE Unit Tests (TASK-004 to TASK-007)...\n");

  // TEST-OAUTH-004: PKCE Verifier Generation
  const verifier1 = generateCodeVerifier();
  const verifier2 = generateCodeVerifier();
  if (!verifier1 || verifier1.length < 43) throw new Error("Verifier 1 too short");
  if (verifier1 === verifier2) throw new Error("Verifiers must be unique per attempt");
  console.log("✔ TEST-OAUTH-004 PASS: PKCE Code Verifier generated securely and uniquely.");

  // TEST-OAUTH-005: PKCE Challenge Calculation (S256)
  const testVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  const expectedChallenge = crypto
    .createHash("sha256")
    .update(testVerifier, "utf8")
    .digest("base64url");
  const computedChallenge = generateCodeChallenge(testVerifier);
  if (computedChallenge !== expectedChallenge) {
    throw new Error(`Challenge mismatch: got ${computedChallenge}, expected ${expectedChallenge}`);
  }
  console.log("✔ TEST-OAUTH-005 PASS: S256 PKCE Code Challenge derived correctly.");

  // TEST-OAUTH-003: State Generation
  const state1 = generateOAuthState();
  const state2 = generateOAuthState();
  if (!state1 || state1.length < 32) throw new Error("State 1 invalid");
  if (state1 === state2) throw new Error("State must be unique per attempt");
  console.log("✔ TEST-OAUTH-003 PASS: OAuth State generated uniquely.");

  // TASK-004 & TASK-007: Transaction Creation and Consumption
  const userId = 42;
  const tx = createOAuthTransaction(userId);
  if (tx.userId !== userId) throw new Error("UserId mismatch in transaction");
  if (!tx.state || !tx.codeVerifier || !tx.codeChallenge) throw new Error("Transaction fields missing");

  // Retrieve valid transaction
  const retrieved = getAndConsumeOAuthTransaction(tx.state);
  if (!retrieved) throw new Error("Failed to retrieve valid transaction");
  if (retrieved.userId !== userId) throw new Error("Retrieved userId mismatch");
  if (retrieved.codeVerifier !== tx.codeVerifier) throw new Error("Retrieved verifier mismatch");

  // Single-use check: second retrieval must return null
  const secondAttempt = getAndConsumeOAuthTransaction(tx.state);
  if (secondAttempt !== null) throw new Error("Transaction state must be consumed on first use");
  console.log("✔ TASK-004 & TASK-007 PASS: OAuth Transaction created, verified, and consumed single-use.");

  // TEST-CALLBACK-004: Invalid state rejection
  const invalidResult = getAndConsumeOAuthTransaction("non-existent-state-value");
  if (invalidResult !== null) throw new Error("Invalid state should be rejected");
  console.log("✔ TEST-CALLBACK-004 PASS: Invalid OAuth state rejected.");

  // TEST-OAUTH-001: Authorization URL building
  const tx2 = createOAuthTransaction(101);
  const authUrl = buildAuthorizationUrl(tx2);
  const parsedUrl = new URL(authUrl);

  if (parsedUrl.origin + parsedUrl.pathname !== "https://mcp.swiggy.com/auth/authorize") {
    throw new Error(`Invalid authorization URL endpoint: ${authUrl}`);
  }
  if (parsedUrl.searchParams.get("response_type") !== "code") throw new Error("Missing response_type=code");
  if (parsedUrl.searchParams.get("client_id") !== "nutriflow-ai") throw new Error("Missing client_id");
  if (parsedUrl.searchParams.get("redirect_uri") !== "https://nutriflow-ai.vercel.app/auth/callback/") throw new Error("Missing redirect_uri");
  if (parsedUrl.searchParams.get("scope") !== "mcp:tools") throw new Error("Missing scope");
  if (parsedUrl.searchParams.get("code_challenge_method") !== "S256") throw new Error("Missing code_challenge_method=S256");
  if (parsedUrl.searchParams.get("state") !== tx2.state) throw new Error("State parameter mismatch");
  if (parsedUrl.searchParams.get("code_challenge") !== tx2.codeChallenge) throw new Error("Challenge parameter mismatch");
  console.log("✔ TEST-OAUTH-001 & TEST-OAUTH-002 PASS: Authorization URL contains all required OAuth 2.1 + PKCE parameters.");

  console.log("\n🎉 All Phase 2 OAuth & PKCE Storage Tests PASSED!\n");
}

testOAuthStoreAndPKCE();
