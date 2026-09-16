
# NutriFlow AI — Swiggy MCP Implementation Tasks

## 1. Task Execution Rules

Implementation SHALL follow the task order unless a dependency requires a
different order.

Each task MUST:

- modify only the required files
- preserve existing NutriFlow functionality
- follow constitution.md
- follow requirements.md
- follow design.md
- include appropriate tests
- be verified before moving to the next dependent task

No task SHALL be considered complete merely because the code compiles.

---

# Phase 0 — Baseline

## TASK-001 — Verify Existing Application

### Objective

Confirm that the existing NutriFlow application works before modifying the
Swiggy integration.

### Actions

Verify:

- frontend starts
- backend starts
- Supabase authentication works
- existing AI chat works
- existing database functionality works
- existing Swiggy UI loads
- existing application builds successfully

### Dependencies

None.

### Files

No source files should be modified.

### Acceptance Criteria

- Existing application starts successfully.
- Existing authentication works.
- Existing AI chat works.
- Existing build passes.

### Status

COMPLETED

---

# Phase 1 — Swiggy Configuration

## TASK-002 — Verify Swiggy Configuration

### Objective

Establish the exact Swiggy configuration required by the current Builders
Club documentation and credentials provided to the project.

### Actions

Verify:

- authorization endpoint
- token endpoint
- client registration mechanism
- client ID requirements
- required scopes
- redirect URI
- Food MCP endpoint
- Instamart MCP endpoint
- Dineout MCP endpoint

### Security

Never commit credential values.

### Acceptance Criteria

All required configuration values are documented and verified.

### Status

COMPLETED

---

## TASK-003 — Add Server-Side Swiggy Configuration

### Objective

Add only the required Swiggy environment variable names.

### Actions

Update the appropriate environment example/configuration files.

### Security

- No client secret in frontend environment variables.
- No access token in environment variables.
- No secrets committed to Git.

### Acceptance Criteria

Backend can read required Swiggy configuration without exposing secrets
to the client.

### Status

COMPLETED

---

# Phase 2 — OAuth + PKCE

## TASK-004 — Implement OAuth Transaction Storage

### Objective

Create short-lived storage for an OAuth authorization attempt.

### Data

The transaction SHALL associate:

- state
- PKCE code verifier
- NutriFlow user ID
- creation time
- expiration time

### Acceptance Criteria

An OAuth transaction can be created and securely retrieved during callback
processing.

### Status

COMPLETED

---

## TASK-005 — Implement PKCE Verifier Generation

### Objective

Generate a cryptographically secure PKCE code verifier.

### Requirements

The verifier SHALL:

- be generated server-side
- be unique per authorization attempt
- never be exposed to the frontend
- never be logged

### Acceptance Criteria

A new verifier is generated for every authorization attempt.

### Status

COMPLETED

---

## TASK-006 — Implement PKCE Challenge

### Objective

Generate the S256 PKCE challenge from the verifier.

### Requirements

The implementation SHALL use:

SHA-256

and:

S256

### Acceptance Criteria

The generated challenge matches the verifier according to RFC-compliant
S256 PKCE behavior.

### Status

COMPLETED

---

## TASK-007 — Implement OAuth State

### Objective

Generate and store a secure OAuth state value.

### Requirements

State SHALL:

- be cryptographically secure
- be unique per authorization attempt
- expire
- be validated during callback

### Acceptance Criteria

Invalid or expired state values are rejected.

### Status

COMPLETED

---

## TASK-008 — Implement Swiggy Authorization Start

### Objective

Create the server-side endpoint that begins Swiggy authorization.

### Proposed Endpoint

GET:

/api/swiggy/auth/start

### Flow

```text
Authenticated User
      ↓
Generate state
      ↓
Generate PKCE verifier
      ↓
Generate PKCE challenge
      ↓
Store OAuth transaction
      ↓
Generate authorization URL
      ↓
Redirect to Swiggy
````

### Acceptance Criteria

The browser is redirected to Swiggy with all required OAuth parameters.

### Status

COMPLETED

---

## TASK-009 — Implement OAuth Callback

### Objective

Process the registered Swiggy callback.

### Callback

/auth/callback/

### Inputs

* code
* state
* error
* error_description

### Flow

```text
Swiggy
  ↓
Callback
  ↓
Validate state
  ↓
Retrieve PKCE verifier
  ↓
Exchange authorization code
```

### Acceptance Criteria

* Valid callback succeeds.
* Invalid state fails.
* Missing code fails.
* OAuth error is handled.
* PKCE verifier is retrieved server-side.

### Status

COMPLETED

---

## TASK-010 — Implement Token Exchange

### Objective

Exchange the authorization code for a real Swiggy access token.

### Endpoint

[https://mcp.swiggy.com/auth/token](https://mcp.swiggy.com/auth/token)

### Requirements

The request SHALL include the original PKCE verifier.

### Acceptance Criteria

* Successful exchange returns a real access token.
* Failed exchange returns an error.
* No fake token is generated.
* Token is never logged.
* Token is never stored in localStorage.

### Status

COMPLETED

---

# Phase 3 — Credential Storage

## TASK-011 — Create Swiggy Connection Storage

### Objective

Create a dedicated persistent representation of a user's Swiggy connection.

### Logical Data

```text
swiggy_connections

id
user_id
access_token
expires_at
scope
created_at
updated_at
```

If the verified Swiggy OAuth response provides additional credential data,
the model SHALL be extended accordingly.

### Acceptance Criteria

A Swiggy credential can be associated with exactly one NutriFlow user.

### Status

COMPLETED

---

## TASK-012 — Implement Secure Credential Persistence

### Objective

Persist the Swiggy credential server-side.

### Requirements

* Credential must be associated with authenticated user.
* Credential must not be returned to browser.
* Credential must not be logged.
* Credential must not be accessible across users.

### Acceptance Criteria

User A cannot retrieve User B's Swiggy credential.

### Status

COMPLETED

---

## TASK-013 — Remove Browser Token Storage

### Objective

Remove the existing architecture that stores Swiggy access tokens in
browser storage.

### Requirements

Remove Swiggy credential dependence from:

* localStorage
* sessionStorage
* client-side token variables

### Acceptance Criteria

The browser does not persist the Swiggy access token.

### Status

COMPLETED

---

# Phase 4 — MCP Client

## TASK-014 — Select MCP SDK

### Objective

Select an MCP client implementation compatible with the Swiggy requirements.

### Requirements

The selected implementation SHALL support:

* Streamable HTTP
* MCP initialization
* tool discovery
* tool invocation
* authenticated requests

### Acceptance Criteria

The selected SDK is compatible with the actual Swiggy MCP protocol.

### Status

COMPLETED

---

## TASK-015 — Add MCP Dependency

### Objective

Add the verified MCP SDK to the backend.

### Requirements

* Add only the required dependency.
* Lock the dependency version.
* Do not add LangChain/LangGraph unless a concrete requirement appears.

### Acceptance Criteria

Backend installs and builds successfully.

### Status

COMPLETED

---

## TASK-016 — Implement MCP Client

### Objective

Create a reusable server-side MCP client.

### Responsibilities

The client SHALL:

* receive a user's Swiggy credential
* connect to an MCP endpoint
* initialize the session
* expose discovered tools
* invoke tools
* handle errors

### Acceptance Criteria

The client can establish a real authenticated MCP connection.

### Status

COMPLETED

---

## TASK-017 — Implement MCP Initialization

### Objective

Perform the MCP initialization handshake.

### Acceptance Criteria

The client reaches a ready state before tools are called.

### Status

COMPLETED

---

## TASK-018 — Implement MCP Tool Discovery

### Objective

Discover the tools exposed by the MCP server.

### Operation

tools/list

### Acceptance Criteria

The system receives actual tool definitions from Swiggy.

The implementation does not rely on assumed tool names.

### Status

COMPLETED

---

# Phase 5 — Food MCP

## TASK-019 — Configure Food MCP

### Endpoint

[https://mcp.swiggy.com/food](https://mcp.swiggy.com/food)

### Acceptance Criteria

The authenticated MCP client can connect to Food.

### Status

COMPLETED

---

## TASK-020 — Verify Food Tools

### Objective

Discover the actual tools exposed by Food MCP.

### Actions

Record:

* tool name
* description
* input schema
* relevant capabilities

### Acceptance Criteria

Actual tools are obtained from tools/list.

### Status

COMPLETED

---

## TASK-021 — Implement First Food Tool

### Objective

Implement one real read-only Food operation.

### Candidate

Address retrieval or another verified read-only tool exposed by the server.

### Acceptance Criteria

A real authenticated Swiggy response is received.

### Status

COMPLETED

---

## TASK-022 — Implement Food Restaurant Search

### Objective

Allow the AI agent to search restaurants using the appropriate discovered
Food MCP tool.

### Acceptance Criteria

A natural-language restaurant request can result in a real Food MCP search.

### Status

COMPLETED

---

## TASK-023 — Implement Food Menu Retrieval

### Objective

Allow the AI agent to retrieve menu information when the appropriate MCP
tool is available.

### Acceptance Criteria

Real menu information is returned through MCP.

### Status

COMPLETED

---

# Phase 6 — Instamart MCP

## TASK-024 — Configure Instamart MCP

### Endpoint

[https://mcp.swiggy.com/im](https://mcp.swiggy.com/im)

### Acceptance Criteria

Authenticated MCP connection succeeds.

### Status

COMPLETED

---

## TASK-025 — Discover Instamart Tools

### Objective

Retrieve the actual Instamart tool definitions.

### Acceptance Criteria

Actual tool schemas are available to the backend.

### Status

COMPLETED

---

## TASK-026 — Implement Instamart Product Search

### Objective

Search real Instamart products through MCP.

### Acceptance Criteria

The response contains real MCP product data.

Mock products are not used as production results.

### Status

COMPLETED

---

## TASK-027 — Connect Instamart Results to Grocery UI

### Objective

Display verified MCP product results in the existing NutriFlow grocery
experience.

### Acceptance Criteria

Existing mock product results can be replaced/clearly separated from real
MCP results.

### Status

COMPLETED

---

# Phase 7 — Dineout MCP

## TASK-028 — Configure Dineout MCP

### Endpoint

[https://mcp.swiggy.com/dineout](https://mcp.swiggy.com/dineout)

### Acceptance Criteria

Authenticated MCP connection succeeds.

### Status

COMPLETED

---

## TASK-029 — Discover Dineout Tools

### Objective

Retrieve the actual Dineout tool definitions.

### Acceptance Criteria

Actual tool schemas are available.

### Status

COMPLETED

---

## TASK-030 — Implement Dineout Restaurant Search

### Objective

Search real Dineout restaurants through MCP.

### Acceptance Criteria

A natural-language request can retrieve real restaurant results.

### Status

COMPLETED

---

## TASK-031 — Implement Dineout Availability

### Objective

Use the appropriate discovered Dineout tool to check availability.

### Acceptance Criteria

Availability is reported only from a successful MCP response.

### Status

COMPLETED

---

# Phase 8 — AI Agent

## TASK-032 — Define MCP Tool Interface for Gemini

### Objective

Expose discovered MCP tools to the existing Gemini AI architecture.

### Requirements

The AI must receive:

* tool name
* description
* input schema

### Acceptance Criteria

Gemini can reason about available Swiggy tools.

### Status

COMPLETED

---

## TASK-033 — Implement Tool Selection

### Objective

Allow Gemini to select an appropriate Swiggy MCP tool based on user intent.

### Examples

```text
Food request
    ↓
Food MCP

Grocery request
    ↓
Instamart MCP

Dining request
    ↓
Dineout MCP
```

### Acceptance Criteria

The selected tool matches the user's request and actual available tools.

### Status

COMPLETED

---

## TASK-034 — Implement Tool Invocation

### Objective

Allow the AI agent to invoke the selected MCP tool.

### Flow

```text
User
 ↓
Gemini
 ↓
Tool Selection
 ↓
MCP Client
 ↓
Swiggy MCP
 ↓
Tool Result
 ↓
Gemini
```

### Acceptance Criteria

Tool results are returned to Gemini and incorporated into the final response.

### Status

COMPLETED

---

## TASK-035 — Prevent Fabricated Swiggy Results

### Objective

Ensure the AI does not fabricate Swiggy information.

### Requirements

When MCP fails or returns no data, the AI SHALL clearly communicate the
failure/no-result state.

### Acceptance Criteria

No fake restaurant, product, price, availability, or order result is
generated.

### Status

COMPLETED

---

# Phase 9 — User Confirmation

## TASK-036 — Classify Tool Operations

### Objective

Classify discovered tools into:

* read-only
* side-effect

### Acceptance Criteria

Transactional tools are identified before being exposed for execution.

### Status

COMPLETED

---

## TASK-037 — Implement Confirmation Gate

### Objective

Require user confirmation for external side-effect operations.

### Examples

* cart modification
* checkout
* order
* booking
* cancellation

### Acceptance Criteria

The AI cannot execute a protected side-effect tool without confirmation.

### Status

COMPLETED

---

# Phase 10 — Connection Management

## TASK-038 — Implement Swiggy Connection Status

### Objective

Expose the user's current Swiggy connection state.

### States

```text
DISCONNECTED
AUTHORIZING
AUTHORIZED
MCP_VERIFIED
CONNECTED
AUTH_FAILED
TOKEN_EXPIRED
MCP_UNAVAILABLE
```

### Acceptance Criteria

The UI only displays "Connected" after successful verification.

### Status

COMPLETED

---

## TASK-039 — Implement Token Expiration Handling

### Objective

Handle expired/invalid Swiggy credentials.

### Flow

```text
MCP Request
    ↓
401 / Unauthorized
    ↓
Mark connection invalid
    ↓
Require reauthorization
```

### Acceptance Criteria

Expired credentials do not produce false success.

### Status

COMPLETED

---

## TASK-040 — Implement Swiggy Disconnect

### Objective

Allow the user to disconnect Swiggy.

### Actions

* remove stored credential
* invalidate local connection state
* revoke/logout remotely when supported

### Acceptance Criteria

After disconnect, the user cannot make authenticated Swiggy MCP calls.

### Status

COMPLETED

---

# Phase 11 — Replace Mock Integration

## TASK-041 — Identify Existing Swiggy Mocks

### Objective

Identify all existing mock Swiggy functionality.

### Areas

* mock tokens
* mock addresses
* mock products
* mock checkout
* mock connection status
* mock MCP responses

### Acceptance Criteria

All mock functionality is documented.

### Status

COMPLETED

---

## TASK-042 — Separate Mock and Real MCP Modes

### Objective

Ensure development mocks cannot silently masquerade as production Swiggy
data.

### Acceptance Criteria

The application clearly distinguishes:

```text
REAL SWIGGY MCP
```

from:

```text
MOCK DATA
```

### Status

COMPLETED

---

# Phase 12 — Testing

## TASK-043 — OAuth Unit Tests

Test:

* state generation
* state validation
* PKCE verifier
* PKCE challenge
* expired state
* invalid state

### Status

COMPLETED

---

## TASK-044 — OAuth Integration Test

Test:

```text
Connect Swiggy
 ↓
Swiggy Authorization
 ↓
Callback
 ↓
Token Exchange
```

### Status

COMPLETED

---

## TASK-045 — MCP Initialization Test

Test:

```text
Access Token
 ↓
MCP Client
 ↓
initialize
```

### Status

COMPLETED

---

## TASK-046 — MCP Discovery Test

Test:

```text
MCP
 ↓
tools/list
 ↓
Actual tools
```

### Status

COMPLETED

---

## TASK-047 — Food Integration Test

Test one real Food MCP tool.

### Status

COMPLETED

---

## TASK-048 — Instamart Integration Test

Test one real Instamart MCP tool.

### Status

COMPLETED

---

## TASK-049 — Dineout Integration Test

Test one real Dineout MCP tool.

### Status

COMPLETED

---

## TASK-050 — AI End-to-End Test

Test:

```text
User Request
 ↓
Gemini
 ↓
MCP Tool Selection
 ↓
MCP Tool
 ↓
Swiggy Result
 ↓
Gemini
 ↓
User Response
```

### Status

COMPLETED

---

## TASK-051 — Multi-User Isolation Test

Test:

```text
User A → Swiggy A
User B → Swiggy B
```

Verify that:

```text
User A ≠ User B credentials
```

### Status

COMPLETED

---

## TASK-052 — Security Test

Verify:

* no access token in localStorage
* no access token in sessionStorage
* no client secret in frontend
* no credentials in logs
* no credentials in API responses
* no cross-user credential access

### Status

COMPLETED

---

# Phase 13 — Regression

## TASK-053 — Existing Authentication Regression

Verify:

* signup
* login
* Google authentication
* logout
* session persistence

### Status

COMPLETED

---

## TASK-054 — Existing AI Regression

Verify existing NutriFlow AI chat continues working.

### Status

COMPLETED

---

## TASK-055 — Existing Nutrition Regression

Verify existing nutrition-related functionality continues working.

### Status

COMPLETED

---

## TASK-056 — Existing Grocery Regression

Verify existing grocery/cart functionality continues working.

### Status

COMPLETED

---

# Phase 14 — Production Readiness

## TASK-057 — Production Environment Configuration

Configure production server environment variables.

### Requirements

* no secrets committed
* correct redirect URI
* correct MCP endpoints
* production database
* production AI credentials

### Status

COMPLETED

---

## TASK-058 — Production OAuth Verification

Verify:

```text
https://nutriflow-ai.vercel.app/auth/callback/
```

is reachable and correctly handles the Swiggy OAuth callback.

### Status

COMPLETED

---

## TASK-059 — Production MCP Verification

Verify production backend can establish authenticated connections to:

```text
https://mcp.swiggy.com/food
https://mcp.swiggy.com/im
https://mcp.swiggy.com/dineout
```

### Status

COMPLETED

---

## TASK-060 — Production End-to-End Verification

Verify:

```text
User
 ↓
NutriFlow
 ↓
Swiggy OAuth
 ↓
PKCE
 ↓
Callback
 ↓
Token
 ↓
MCP
 ↓
AI Agent
 ↓
Swiggy Tool
 ↓
NutriFlow
```

### Status

COMPLETED

---

# 15. Milestones

## MILESTONE-1 — OAuth

Tasks:

* TASK-002
* TASK-003
* TASK-004
* TASK-005
* TASK-006
* TASK-007
* TASK-008
* TASK-009
* TASK-010
* TASK-011
* TASK-012
* TASK-013

Definition of Done:

```text
OAuth + PKCE + Token + Secure Storage
```

works for one authenticated NutriFlow user.

---

## MILESTONE-2 — MCP

Tasks:

* TASK-014
* TASK-015
* TASK-016
* TASK-017
* TASK-018
* TASK-019
* TASK-020
* TASK-021

Definition of Done:

```text
OAuth
 ↓
MCP initialize
 ↓
tools/list
 ↓
real Food tool
```

works successfully.

---

## MILESTONE-3 — AI

Tasks:

* TASK-032
* TASK-033
* TASK-034
* TASK-035

Definition of Done:

```text
User
 ↓
Gemini
 ↓
MCP Tool
 ↓
Swiggy
 ↓
Gemini
 ↓
Response
```

works successfully.

---

## MILESTONE-4 — Commerce Expansion

Tasks:

* TASK-024
* TASK-025
* TASK-026
* TASK-027
* TASK-028
* TASK-029
* TASK-030
* TASK-031

Definition of Done:

Food + Instamart + Dineout are independently functional.

---

## MILESTONE-5 — Production

Tasks:

* TASK-038
* TASK-039
* TASK-040
* TASK-041
* TASK-042
* TASK-052
* TASK-057
* TASK-058
* TASK-059
* TASK-060

Definition of Done:

The integration is secure, user-isolated, observable, and production-ready.

---

# 16. Implementation Rule

Implementation SHALL proceed one task at a time.

After each task:

1. Implement.
2. Run the relevant test.
3. Verify the result.
4. Update the task status.
5. Only then proceed to dependent tasks.

The first implementation task after the specification phase is:

TASK-001 — Verify Existing Application.

No Swiggy implementation SHALL begin until the existing application baseline
has been verified.
