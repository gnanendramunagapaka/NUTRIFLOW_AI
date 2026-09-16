
# NutriFlow AI — Swiggy MCP Test Specification

## 1. Testing Strategy

Testing SHALL verify the Swiggy integration incrementally.

The test sequence is:

```text
Existing Application
        ↓
OAuth
        ↓
PKCE
        ↓
Callback
        ↓
Token Exchange
        ↓
Secure Storage
        ↓
MCP Connection
        ↓
MCP Initialization
        ↓
Tool Discovery
        ↓
Food
        ↓
AI Agent
        ↓
Instamart
        ↓
Dineout
        ↓
Production
````

No later stage SHALL be considered valid until its required earlier stages
pass.

---

# 2. Test Classification

Tests SHALL be divided into:

* Unit Tests
* Integration Tests
* Security Tests
* MCP Protocol Tests
* AI Agent Tests
* End-to-End Tests
* Regression Tests
* Production Smoke Tests

---

# 3. Test Environment

Tests SHALL be executable against:

```text
Local Development
        ↓
Test/Staging
        ↓
Production Smoke Test
```

Production tests MUST NOT use fake credentials or fake Swiggy responses.

---

# 4. Baseline Tests

## TEST-BASE-001 — Frontend Starts

### Action

Start the existing NutriFlow frontend.

### Expected

Frontend loads without build/runtime errors.

### Pass Criteria

NutriFlow UI is accessible.

---

## TEST-BASE-002 — Backend Starts

### Action

Start the existing NutriFlow backend.

### Expected

Backend starts successfully.

### Pass Criteria

Health/API endpoint responds successfully.

---

## TEST-BASE-003 — Existing Authentication

### Action

Log in using an existing supported NutriFlow authentication method.

### Expected

Authenticated session is created.

### Pass Criteria

Protected NutriFlow API requests succeed.

---

## TEST-BASE-004 — Existing AI

### Action

Send a normal NutriFlow AI request.

Example:

```text
Suggest a healthy dinner.
```

### Expected

Gemini returns a valid response.

### Pass Criteria

Existing AI chat works without Swiggy.

---

## TEST-BASE-005 — Existing Application Build

### Action

Run the repository's production build.

### Expected

Build completes successfully.

### Pass Criteria

No new or existing build errors.

---

# 5. OAuth Configuration Tests

## TEST-OAUTH-001 — Authorization URL

### Action

Start Swiggy authorization.

### Expected

The generated URL points to:

```text
https://mcp.swiggy.com/auth/authorize
```

### Required Parameters

The authorization request SHALL contain the required:

```text
client_id
redirect_uri
response_type=code
scope
state
code_challenge
code_challenge_method=S256
```

### Pass Criteria

All required values are present and correctly encoded.

---

## TEST-OAUTH-002 — Redirect URI

### Expected

The redirect URI is exactly:

```text
https://nutriflow-ai.vercel.app/auth/callback/
```

### Pass Criteria

No trailing-slash or hostname mismatch exists.

---

## TEST-OAUTH-003 — State Generation

### Action

Start authorization twice.

### Expected

Two different state values are generated.

### Pass Criteria

State is unique and cryptographically secure.

---

## TEST-OAUTH-004 — PKCE Verifier Generation

### Action

Start authorization twice.

### Expected

Two different PKCE verifiers are generated.

### Pass Criteria

The verifier is generated securely and is not reused.

---

## TEST-OAUTH-005 — PKCE Challenge

### Action

Generate verifier and challenge.

### Expected

Challenge corresponds to:

```text
BASE64URL(SHA256(code_verifier))
```

using:

```text
S256
```

### Pass Criteria

Challenge matches the verifier.

---

## TEST-OAUTH-006 — Verifier Never Exposed

### Action

Inspect browser URL, localStorage, sessionStorage, network responses, and
frontend state.

### Expected

PKCE verifier is not exposed.

### Pass Criteria

Verifier exists only where required for secure callback processing.

---

# 6. OAuth Callback Tests

## TEST-CALLBACK-001 — Valid Callback

### Input

```text
code=<valid-code>
state=<valid-state>
```

### Expected

Callback validates state and continues to token exchange.

### Pass Criteria

Authorization code exchange begins.

---

## TEST-CALLBACK-002 — Missing Code

### Input

```text
state=<valid-state>
```

### Expected

Request is rejected.

### Pass Criteria

No token exchange occurs.

---

## TEST-CALLBACK-003 — Missing State

### Input

```text
code=<valid-code>
```

### Expected

Request is rejected.

### Pass Criteria

No token exchange occurs.

---

## TEST-CALLBACK-004 — Invalid State

### Input

```text
code=<valid-code>
state=<invalid-state>
```

### Expected

Request is rejected.

### Pass Criteria

No token exchange occurs.

---

## TEST-CALLBACK-005 — Expired State

### Input

Expired OAuth transaction.

### Expected

Callback is rejected.

### Pass Criteria

No token exchange occurs.

---

## TEST-CALLBACK-006 — OAuth Error

### Input

```text
error=access_denied
```

### Expected

The user receives a clear authorization failure.

### Pass Criteria

No fake connection is created.

---

# 7. Token Exchange Tests

## TEST-TOKEN-001 — Valid Exchange

### Action

Complete a valid OAuth authorization.

### Expected

Backend sends authorization code to:

```text
https://mcp.swiggy.com/auth/token
```

### Pass Criteria

A real access token is returned.

---

## TEST-TOKEN-002 — PKCE Verifier Sent

### Action

Inspect the token exchange request in a safe test environment.

### Expected

The original PKCE verifier is included.

### Pass Criteria

Token exchange uses the verifier corresponding to the authorization
attempt.

---

## TEST-TOKEN-003 — Invalid Code

### Action

Attempt exchange with an invalid authorization code.

### Expected

Swiggy rejects the request.

### Pass Criteria

NutriFlow reports authentication failure.

---

## TEST-TOKEN-004 — No Fake Token

### Action

Force token exchange failure.

### Expected

No token is generated locally.

### Pass Criteria

Connection state becomes failed.

---

# 8. Credential Security Tests

## TEST-SEC-001 — No localStorage Token

### Action

Complete Swiggy authentication.

### Expected

No Swiggy access token exists in localStorage.

### Pass Criteria

Search localStorage for Swiggy credential values.

---

## TEST-SEC-002 — No sessionStorage Token

### Action

Complete Swiggy authentication.

### Expected

No Swiggy access token exists in sessionStorage.

---

## TEST-SEC-003 — No Browser API Token

### Action

Inspect frontend API responses.

### Expected

Swiggy access token is not returned to the browser.

---

## TEST-SEC-004 — No URL Token

### Action

Complete callback.

### Expected

Access token is never placed in the browser URL.

---

## TEST-SEC-005 — No Client Secret Exposure

### Action

Inspect built frontend assets.

### Expected

Swiggy client secret does not appear.

---

## TEST-SEC-006 — No Credential Logging

### Action

Inspect application logs during OAuth/MCP requests.

### Expected

No:

* access token
* authorization code
* PKCE verifier
* client secret

appears in logs.

---

# 9. Multi-User Security Tests

## TEST-USER-001 — User A Credential

### Action

Authenticate User A with Swiggy.

### Expected

Credential belongs to User A.

---

## TEST-USER-002 — User B Credential

### Action

Authenticate User B with Swiggy.

### Expected

Credential belongs to User B.

---

## TEST-USER-003 — Cross-User Access

### Action

Attempt to use User A's session to access User B's Swiggy connection.

### Expected

Request is rejected.

### Pass Criteria

User A cannot access User B's credential.

---

## TEST-USER-004 — Cross-User MCP Call

### Action

Attempt MCP invocation using another user's credential.

### Expected

Backend prevents the operation.

---

# 10. MCP Client Tests

## TEST-MCP-001 — MCP Client Creation

### Expected

A valid MCP client can be created using the selected SDK.

---

## TEST-MCP-002 — Streamable HTTP

### Action

Connect to a Swiggy MCP endpoint.

### Expected

Connection uses Streamable HTTP.

---

## TEST-MCP-003 — MCP Authentication

### Action

Connect using a valid Swiggy access token.

### Expected

MCP server accepts authenticated connection.

---

## TEST-MCP-004 — MCP Initialization

### Action

Initialize the MCP client.

### Expected

MCP initialization succeeds.

### Pass Criteria

Client reaches ready state.

---

## TEST-MCP-005 — MCP Initialization Failure

### Action

Force invalid MCP connection.

### Expected

Initialization failure is detected.

### Pass Criteria

Application does not report MCP as connected.

---

# 11. MCP Tool Discovery Tests

## TEST-DISCOVERY-001 — tools/list

### Action

Call the MCP tool discovery operation.

### Expected

Actual Swiggy tools are returned.

---

## TEST-DISCOVERY-002 — Tool Schema

### Expected

Each discovered tool includes the information required by the MCP protocol,
including its input schema.

---

## TEST-DISCOVERY-003 — Dynamic Tool Names

### Action

Compare discovered tools with application assumptions.

### Expected

Application uses actual discovered tools.

### Pass Criteria

No tool is assumed to exist without discovery.

---

# 12. Food MCP Tests

## TEST-FOOD-001 — Food Connection

### Endpoint

```text
https://mcp.swiggy.com/food
```

### Expected

Authenticated MCP connection succeeds.

---

## TEST-FOOD-002 — Food Discovery

### Expected

Food tools are successfully discovered.

---

## TEST-FOOD-003 — Address Retrieval

### Action

Invoke the appropriate discovered address-related tool.

### Expected

Real Swiggy address information is returned.

### Pass Criteria

No hard-coded mock address is returned as real data.

---

## TEST-FOOD-004 — Restaurant Search

### Example

```text
Find vegetarian restaurants near me.
```

### Expected

AI selects an appropriate Food MCP tool.

### Pass Criteria

Real restaurant results are returned.

---

## TEST-FOOD-005 — Menu Retrieval

### Example

```text
Show me the menu for this restaurant.
```

### Expected

Appropriate Food MCP tool is invoked.

---

# 13. Instamart MCP Tests

## TEST-IM-001 — Instamart Connection

### Endpoint

```text
https://mcp.swiggy.com/im
```

### Expected

Authenticated MCP connection succeeds.

---

## TEST-IM-002 — Instamart Discovery

### Expected

Actual Instamart tools are discovered.

---

## TEST-IM-003 — Product Search

### Example

```text
Find whole wheat pasta.
```

### Expected

Real Instamart MCP product results are returned.

---

## TEST-IM-004 — No Mock Product Substitution

### Action

Force MCP product search failure.

### Expected

System reports failure/no results.

### Pass Criteria

Mock products are not silently returned as real Swiggy results.

---

# 14. Dineout MCP Tests

## TEST-DINE-001 — Dineout Connection

### Endpoint

```text
https://mcp.swiggy.com/dineout
```

### Expected

Authenticated MCP connection succeeds.

---

## TEST-DINE-002 — Dineout Discovery

### Expected

Actual Dineout tools are discovered.

---

## TEST-DINE-003 — Restaurant Search

### Example

```text
Find restaurants for four people.
```

### Expected

Real Dineout results are returned.

---

## TEST-DINE-004 — Availability

### Example

```text
Check availability for dinner.
```

### Expected

The appropriate discovered Dineout availability tool is invoked.

### Pass Criteria

Availability comes from a successful MCP response.

---

# 15. AI Agent Tests

## TEST-AI-001 — Tool Awareness

### Action

Provide Gemini with discovered MCP tools.

### Expected

Gemini can identify available Swiggy capabilities.

---

## TEST-AI-002 — Food Tool Selection

### Input

```text
Find healthy restaurants.
```

### Expected

Gemini selects an appropriate Food MCP tool.

---

## TEST-AI-003 — Instamart Tool Selection

### Input

```text
Find ingredients for pasta.
```

### Expected

Gemini selects an appropriate Instamart tool.

---

## TEST-AI-004 — Dineout Tool Selection

### Input

```text
Find a restaurant for dinner.
```

### Expected

Gemini selects an appropriate Dineout tool.

---

## TEST-AI-005 — Tool Arguments

### Action

Provide a request with constraints.

Example:

```text
Find vegetarian food under ₹300.
```

### Expected

Generated arguments conform to the discovered tool schema.

---

## TEST-AI-006 — Tool Result Interpretation

### Action

Return a valid MCP result to Gemini.

### Expected

Gemini correctly interprets the result.

---

## TEST-AI-007 — No Fabrication

### Action

Make the MCP tool return no results.

### Expected

Gemini reports no results.

### Pass Criteria

Gemini does not invent restaurants, products, prices, or availability.

---

# 16. Confirmation Tests

## TEST-CONFIRM-001 — Read Operation

### Action

Perform restaurant search.

### Expected

No transaction confirmation is required.

---

## TEST-CONFIRM-002 — Cart Modification

### Action

Request an external cart modification.

### Expected

Confirmation is requested before execution.

---

## TEST-CONFIRM-003 — Booking

### Action

Request a Dineout booking.

### Expected

Confirmation is requested before booking.

---

## TEST-CONFIRM-004 — Order

### Action

Request an external order.

### Expected

The order cannot execute without required confirmation.

---

# 17. Expiration Tests

## TEST-EXP-001 — Expired Token

### Action

Use an expired Swiggy access token.

### Expected

MCP returns authentication failure.

---

## TEST-EXP-002 — Expired Connection Status

### Expected

NutriFlow marks the Swiggy connection as invalid/expired.

---

## TEST-EXP-003 — Reauthorization

### Action

Attempt to use an expired connection.

### Expected

User is directed through Swiggy reauthorization.

---

## TEST-EXP-004 — No False Success

### Expected

Expired credentials never produce a successful Swiggy response.

---

# 18. Disconnect Tests

## TEST-DISCONNECT-001 — Disconnect

### Action

User selects:

```text
Disconnect Swiggy
```

### Expected

Stored credential is removed/inactivated.

---

## TEST-DISCONNECT-002 — Post-Disconnect MCP

### Action

Attempt authenticated Swiggy MCP operation after disconnect.

### Expected

Operation fails until the user reconnects.

---

# 19. Connection Status Tests

## TEST-STATUS-001 — Initial State

### Expected

User with no Swiggy connection sees:

```text
Disconnected
```

---

## TEST-STATUS-002 — Authorization State

### Expected

During OAuth:

```text
Authorizing
```

---

## TEST-STATUS-003 — Successful MCP Verification

### Expected

After OAuth + MCP verification:

```text
Connected
```

---

## TEST-STATUS-004 — Failed MCP Verification

### Expected

Failed MCP verification does not produce:

```text
Connected
```

---

# 20. End-to-End Food Test

## TEST-E2E-001 — Complete Food Workflow

### User

Authenticated NutriFlow user with a valid Swiggy connection.

### Input

```text
Find healthy vegetarian restaurants near me.
```

### Expected Flow

```text
User
 ↓
NutriFlow UI
 ↓
Backend
 ↓
Gemini
 ↓
Food MCP Tool Selection
 ↓
MCP Client
 ↓
Food MCP
 ↓
Restaurant Results
 ↓
Gemini
 ↓
NutriFlow UI
```

### Pass Criteria

Real Swiggy data reaches the user.

---

# 21. End-to-End Instamart Test

## TEST-E2E-002 — Complete Instamart Workflow

### Input

```text
I need ingredients for chicken pasta for two people.
```

### Expected Flow

```text
User
 ↓
Gemini
 ↓
Instamart MCP
 ↓
Product Search
 ↓
Results
 ↓
Gemini
 ↓
NutriFlow Grocery UI
```

### Pass Criteria

Real Instamart MCP results are displayed.

---

# 22. End-to-End Dineout Test

## TEST-E2E-003 — Complete Dineout Workflow

### Input

```text
Find a good restaurant for four people for dinner.
```

### Expected Flow

```text
User
 ↓
Gemini
 ↓
Dineout MCP
 ↓
Restaurant Search
 ↓
Availability
 ↓
Gemini
 ↓
NutriFlow UI
```

### Pass Criteria

Results and availability come from real MCP responses.

---

# 23. Full AI Commerce Copilot Test

## TEST-E2E-004 — Unified Swiggy Workflow

### Input

```text
I'm planning dinner for four.
Find a healthy restaurant under my budget,
and if cooking at home is cheaper, find the ingredients on Instamart.
```

### Expected

The AI can reason across:

```text
Food
+
Instamart
```

and select the appropriate MCP tools.

### Pass Criteria

The AI does not call unrelated tools and does not fabricate unavailable data.

---

# 24. Regression Tests

## TEST-REG-001 — Existing Login

Existing login continues working.

---

## TEST-REG-002 — Existing Google Login

Existing Google authentication continues working.

---

## TEST-REG-003 — Existing AI Chat

Existing AI chat continues working when Swiggy is disconnected.

---

## TEST-REG-004 — Existing Nutrition Features

Existing nutrition functionality continues working.

---

## TEST-REG-005 — Existing Grocery Features

Existing grocery/cart functionality continues working.

---

# 25. Security Regression

## TEST-SEC-007 — Frontend Bundle Scan

Search production frontend bundle for:

```text
SWIGGY_CLIENT_SECRET
SWIGGY_ACCESS_TOKEN
SWIGGY_REFRESH_TOKEN
```

### Expected

No secret values are present.

---

## TEST-SEC-008 — Git History Scan

Verify no real credentials have been committed.

---

## TEST-SEC-009 — Log Scan

Verify authentication and MCP logs contain no credentials.

---

# 26. API Tests

## TEST-API-001 — Protected Swiggy Endpoint

### Action

Call a protected Swiggy API without NutriFlow authentication.

### Expected

401/unauthorized response.

---

## TEST-API-002 — Authenticated Swiggy Endpoint

### Action

Call with valid NutriFlow authentication.

### Expected

Request proceeds using the authenticated user's Swiggy connection.

---

## TEST-API-003 — Arbitrary Token Rejection

### Action

Attempt to provide another user's Swiggy access token as a request parameter.

### Expected

Backend ignores/rejects the supplied credential.

---

# 27. Production Smoke Tests

## TEST-PROD-001 — Production Callback

Verify:

```text
https://nutriflow-ai.vercel.app/auth/callback/
```

is reachable and correctly processes the OAuth callback.

---

## TEST-PROD-002 — Production OAuth

Complete a real Swiggy authorization flow.

---

## TEST-PROD-003 — Production MCP

Verify authenticated MCP initialization.

---

## TEST-PROD-004 — Production Food

Execute one verified Food read operation.

---

## TEST-PROD-005 — Production Instamart

Execute one verified Instamart read operation.

---

## TEST-PROD-006 — Production Dineout

Execute one verified Dineout read operation.

---

# 28. Test Evidence

Every integration test SHOULD record:

* test ID
* date/time
* environment
* result
* relevant request type
* relevant response type
* error message if failed
* screenshot/log reference where appropriate

Secrets MUST NOT be included in evidence.

---

# 29. Test Status

Use:

```text
PASS
FAIL
BLOCKED
NOT RUN
```

Do not use PASS when a test was not actually executed.

---

# 30. Milestone Gates

## GATE-001 — OAuth

Required:

```text
TEST-OAUTH-001
TEST-OAUTH-002
TEST-OAUTH-003
TEST-OAUTH-004
TEST-OAUTH-005
TEST-CALLBACK-001
TEST-CALLBACK-004
TEST-TOKEN-001
TEST-TOKEN-002
TEST-TOKEN-004
```

All mandatory tests MUST PASS.

---

## GATE-002 — Credential Security

Required:

```text
TEST-SEC-001
TEST-SEC-002
TEST-SEC-003
TEST-SEC-004
TEST-SEC-005
TEST-SEC-006
TEST-USER-003
TEST-USER-004
```

All MUST PASS.

---

## GATE-003 — MCP

Required:

```text
TEST-MCP-002
TEST-MCP-003
TEST-MCP-004
TEST-DISCOVERY-001
TEST-DISCOVERY-002
```

All MUST PASS.

---

## GATE-004 — Food

Required:

```text
TEST-FOOD-001
TEST-FOOD-002
TEST-FOOD-003
TEST-FOOD-004
TEST-E2E-001
```

All MUST PASS.

---

## GATE-005 — AI

Required:

```text
TEST-AI-001
TEST-AI-002
TEST-AI-005
TEST-AI-006
TEST-AI-007
```

All MUST PASS.

---

## GATE-006 — Commerce Expansion

Required:

```text
TEST-IM-001
TEST-IM-002
TEST-IM-003
TEST-DINE-001
TEST-DINE-002
TEST-DINE-003
TEST-DINE-004
TEST-E2E-002
TEST-E2E-003
```

All applicable tests MUST PASS.

---

# 31. Final Acceptance

The Swiggy MCP integration is considered production-ready only when:

```text
OAuth
  PASS
   ↓
PKCE
  PASS
   ↓
Secure Credential Storage
  PASS
   ↓
MCP Initialization
  PASS
   ↓
Tool Discovery
  PASS
   ↓
Food
  PASS
   ↓
AI Agent
  PASS
   ↓
Instamart
  PASS
   ↓
Dineout
  PASS
   ↓
Security
  PASS
   ↓
Regression
  PASS
   ↓
Production Smoke Tests
  PASS
```

No mandatory security test may remain failed.

No fake Swiggy response may be used to satisfy a production acceptance test.

````
