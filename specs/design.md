
# NutriFlow AI — Swiggy MCP Technical Design

## 1. Design Goal

The goal is to integrate Swiggy Builders Club MCP into the existing NutriFlow
AI architecture without replacing the existing authentication, AI, database,
or frontend systems.

The integration SHALL add:

- Swiggy OAuth 2.1
- PKCE
- secure per-user Swiggy credential handling
- MCP Streamable HTTP client
- MCP tool discovery
- Food MCP
- Instamart MCP
- Dineout MCP
- AI-driven MCP tool usage

The implementation SHALL be incremental and testable.

---

# 2. Existing Architecture

NutriFlow currently consists of:

```text
React/Vite Frontend
        |
        v
Express API Server
        |
        +------------------+
        |                  |
        v                  v
   Supabase Auth        Gemini AI
        |
        v
PostgreSQL / Supabase
````

The existing architecture SHALL remain the foundation of the integration.

---

# 3. Proposed Architecture

```text
                           USER
                             |
                             v
                  +---------------------+
                  |   NutriFlow UI      |
                  |   React / Vite      |
                  +----------+----------+
                             |
                             | Authenticated API Request
                             v
                  +---------------------+
                  |  NutriFlow Backend  |
                  |      Express        |
                  +----------+----------+
                             |
              +--------------+--------------+
              |                             |
              v                             v
      +---------------+             +---------------+
      | Swiggy OAuth  |             |   Gemini AI   |
      |  OAuth 2.1    |             |  AI / Agent   |
      |    + PKCE     |             +-------+-------+
      +-------+-------+                     |
              |                             |
              v                             v
      +---------------+             +---------------+
      | Secure Swiggy |             |  MCP Tool    |
      | Credentials   |             |   Router     |
      +-------+-------+             +-------+-------+
              |                             |
              +--------------+--------------+
                             |
                             v
                     +---------------+
                     |   MCP Client  |
                     | Streamable HTTP|
                     +-------+-------+
                             |
              +--------------+--------------+
              |              |              |
              v              v              v
          Food MCP      Instamart MCP   Dineout MCP
              |              |              |
              +--------------+--------------+
                             |
                             v
                       Swiggy Services
```

---

# 4. Frontend Responsibilities

The React frontend SHALL be responsible for:

* displaying Swiggy connection status
* providing a "Connect Swiggy" action
* redirecting the user to the backend OAuth-start endpoint
* displaying OAuth success/failure
* displaying MCP connection status
* sending normal authenticated AI requests
* displaying AI-generated results

The frontend SHALL NOT:

* generate or store Swiggy access tokens
* store Swiggy refresh tokens
* store Swiggy client secrets
* perform the server-side token exchange
* directly manage MCP credentials

---

# 5. Existing Authentication Boundary

NutriFlow authentication remains handled by Supabase.

The architecture contains two authentication layers:

```text
NutriFlow Authentication
        |
        v
Supabase Auth
        |
        v
Authenticated NutriFlow User
        |
        +------------------------+
                                 |
                                 v
                         Swiggy OAuth
                                 |
                                 v
                       Swiggy User Authorization
```

The NutriFlow user identity SHALL determine which Swiggy credential is used.

---

# 6. Swiggy OAuth Flow

## 6.1 Authorization Start

The user selects:

```text
Connect Swiggy
```

The frontend calls a backend endpoint.

Example:

```text
GET /api/swiggy/auth/start
```

The backend SHALL:

1. Verify the NutriFlow user is authenticated.
2. Generate a secure PKCE code verifier.
3. Generate the S256 code challenge.
4. Generate a secure OAuth state.
5. Associate the OAuth transaction with the NutriFlow user.
6. Preserve the PKCE verifier securely.
7. Generate the Swiggy authorization URL.
8. Redirect the browser to Swiggy.

---

# 7. OAuth State Storage

The OAuth transaction needs to survive the browser redirect.

The server SHALL maintain:

```text
OAuth State
PKCE Code Verifier
NutriFlow User ID
Created Timestamp
Expiration
```

The implementation MAY use a secure short-lived server-side session/store.

The implementation MUST NOT expose the PKCE verifier through the browser.

The state SHALL have a short lifetime.

Expired state values SHALL be rejected.

---

# 8. Swiggy Authorization Request

The authorization request SHALL target:

```text
https://mcp.swiggy.com/auth/authorize
```

The request SHALL contain the required values:

```text
response_type=code
client_id=<client id>
redirect_uri=<registered redirect URI>
scope=<required scopes>
state=<generated state>
code_challenge=<generated challenge>
code_challenge_method=S256
```

The production redirect URI is:

```text
https://nutriflow-ai.vercel.app/auth/callback/
```

---

# 9. OAuth Callback

The registered callback is:

```text
/auth/callback/
```

The callback SHALL ultimately be processed by the server-side OAuth
implementation.

Expected parameters include:

```text
code
state
error
error_description
```

The callback flow SHALL be:

```text
Swiggy
  |
  | code + state
  v
NutriFlow Callback
  |
  v
Validate state
  |
  v
Retrieve PKCE verifier
  |
  v
Exchange authorization code
```

The callback MUST NOT treat the presence of `code` as proof of success.

---

# 10. Token Exchange

The backend SHALL exchange the authorization code with:

```text
https://mcp.swiggy.com/auth/token
```

The request SHALL include the original PKCE verifier.

Conceptually:

```text
authorization_code
        +
client_id
        +
redirect_uri
        +
code_verifier
        |
        v
Swiggy Token Endpoint
        |
        v
access_token
```

The token response SHALL be validated.

If the exchange fails:

```text
DO NOT
generate fake token
DO NOT
mark Swiggy as connected
```

---

# 11. Credential Storage

After a successful token exchange:

```text
Swiggy Access Token
        |
        v
Server-side credential storage
        |
        v
NutriFlow User ID
```

Recommended logical model:

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

If refresh tokens are provided by the actual Swiggy flow in a future version,
the model MAY additionally contain:

```text
refresh_token
```

Credentials SHOULD be encrypted at rest where appropriate.

---

# 12. Credential Retrieval

When a user makes a Swiggy request:

```text
Authenticated NutriFlow User
          |
          v
Find Swiggy Connection
          |
          v
Retrieve that user's credential
          |
          v
MCP Client
```

The MCP layer SHALL never accept an arbitrary user-supplied access token.

The authenticated NutriFlow user identity SHALL determine the credential.

---

# 13. MCP Client Architecture

Create a dedicated MCP integration layer in the backend.

Recommended structure:

```text
artifacts/api-server/src/
│
├── mcp/
│   ├── client.ts
│   ├── connection.ts
│   ├── discovery.ts
│   ├── tools.ts
│   └── errors.ts
│
└── routes/
    └── swiggy.ts
```

The exact names MAY change if the existing project structure provides a better
location.

---

# 14. MCP Client Responsibilities

The MCP client SHALL:

1. Receive a validated Swiggy credential.
2. Connect to the selected Swiggy MCP server.
3. Establish the MCP session.
4. Initialize the MCP connection.
5. Discover available tools.
6. Validate tool schemas.
7. Invoke requested tools.
8. Return tool results.
9. Handle MCP errors.
10. Handle authentication failures.

---

# 15. MCP Transport

Swiggy MCP SHALL be accessed using:

```text
Streamable HTTP
```

The implementation SHALL use an MCP-compatible client/SDK rather than
manually constructing MCP JSON-RPC requests wherever the SDK supports the
required functionality.

---

# 16. Swiggy MCP Servers

The integration SHALL maintain separate server configurations.

```text
Food
https://mcp.swiggy.com/food

Instamart
https://mcp.swiggy.com/im

Dineout
https://mcp.swiggy.com/dineout
```

Logical configuration:

```text
SwiggyMCPServers
│
├── food
│   └── https://mcp.swiggy.com/food
│
├── instamart
│   └── https://mcp.swiggy.com/im
│
└── dineout
    └── https://mcp.swiggy.com/dineout
```

---

# 17. MCP Initialization

Each MCP connection SHALL perform initialization before tool use.

Conceptually:

```text
Connect
   |
   v
initialize
   |
   v
MCP capabilities
   |
   v
Ready
```

An uninitialized MCP connection SHALL NOT be used for normal tool execution.

---

# 18. Tool Discovery

The system SHALL discover tools dynamically.

Conceptually:

```text
MCP Server
    |
    v
tools/list
    |
    v
Available Tools
    |
    +-- name
    +-- description
    +-- input schema
    +-- metadata
```

The AI agent SHALL use the discovered schemas.

The implementation SHALL NOT assume that every tool exists on every server.

---

# 19. Tool Registry

The backend MAY maintain a temporary runtime representation of discovered
tools.

Example:

```text
DiscoveredTools
│
├── Food
│   ├── tool A
│   ├── tool B
│   └── ...
│
├── Instamart
│   ├── tool A
│   ├── tool B
│   └── ...
│
└── Dineout
    ├── tool A
    ├── tool B
    └── ...
```

The actual names SHALL come from the MCP server.

---

# 20. AI Agent Integration

The existing Gemini implementation SHALL remain the AI foundation.

The new architecture adds MCP tools to the AI tool layer.

```text
User Request
     |
     v
Gemini
     |
     v
Determine Intent
     |
     v
Available MCP Tools
     |
     v
Select Appropriate Tool
     |
     v
MCP Client
     |
     v
Swiggy MCP
     |
     v
Tool Result
     |
     v
Gemini
     |
     v
User Response
```

---

# 21. Tool Selection

The agent SHOULD select tools based on user intent.

Examples:

```text
"Find vegetarian food"
        |
        v
Food MCP

"Find ingredients for pasta"
        |
        v
Instamart MCP

"Find a restaurant for dinner"
        |
        v
Dineout MCP
```

The agent SHALL use the actual discovered tool description and schema.

---

# 22. Read vs Write Operations

The system SHALL distinguish read operations from side-effect operations.

### Read operations

Examples:

```text
restaurant search
menu search
product search
availability
```

These MAY execute directly.

### Side-effect operations

Examples:

```text
add to cart
checkout
order
booking
cancellation
```

These SHALL require explicit user confirmation where appropriate.

---

# 23. Food Flow

```text
User
 |
 | "Find healthy food near me"
 v
Gemini
 |
 | select Food tool
 v
MCP Client
 |
 v
Food MCP
 |
 v
Tool Result
 |
 v
Gemini
 |
 v
NutriFlow UI
```

The first Food integration SHALL use a simple verified read-only operation.

---

# 24. Instamart Flow

```text
User
 |
 | "Find ingredients for chicken pasta"
 v
Gemini
 |
 v
Instamart MCP
 |
 v
Product Search
 |
 v
Product Results
 |
 v
Gemini
 |
 v
NutriFlow Grocery UI
```

Existing mock product data SHALL NOT be presented as real MCP results.

---

# 25. Dineout Flow

```text
User
 |
 | "Find a restaurant for 4"
 v
Gemini
 |
 v
Dineout MCP
 |
 +--> Restaurant Search
 |
 +--> Availability
 |
 v
Results
 |
 v
Gemini
 |
 v
NutriFlow UI
```

Availability SHALL only be reported when supported by the discovered
Dineout MCP tools and returned successfully.

---

# 26. API Boundaries

Recommended backend API responsibilities:

```text
GET  /api/swiggy/auth/start
GET  /api/swiggy/status
POST /api/swiggy/disconnect

POST /api/swiggy/mcp/tools
POST /api/swiggy/mcp/call
```

The exact route names SHALL be finalized during implementation based on the
existing API conventions.

The OAuth callback SHALL be implemented at the architecture location required
to safely process the registered redirect URI.

---

# 27. Connection Status

Connection status SHALL be derived from server-side state.

Example:

```text
DISCONNECTED
     |
     v
AUTHORIZING
     |
     v
AUTHORIZED
     |
     v
MCP_VERIFIED
     |
     v
CONNECTED
```

Failure states:

```text
AUTH_FAILED
TOKEN_EXPIRED
MCP_UNAVAILABLE
MCP_AUTH_FAILED
```

The UI SHALL only display:

```text
Swiggy Connected
```

when the backend has verified the connection.

---

# 28. Token Expiration

Swiggy access tokens SHALL be treated as temporary credentials.

The backend SHALL track expiration.

When MCP returns an authentication failure:

```text
401
 |
 v
Mark connection invalid
 |
 v
Require Swiggy reauthorization
```

The implementation SHALL NOT assume refresh-token support unless the actual
Swiggy authorization response provides it.

---

# 29. Error Architecture

Errors SHALL be normalized at the backend boundary.

Example:

```text
OAuth Error
      |
      v
Swiggy Integration Error
      |
      v
API Error
      |
      v
Frontend Error State
```

Internal credentials and sensitive details SHALL never be exposed to the
frontend.

---

# 30. Security Boundaries

```text
================ BROWSER ================

React
Supabase session
UI state

        X
        X  Swiggy access token
        X  Swiggy client secret
        X  PKCE verifier

============== SERVER ==================

Express
OAuth
PKCE verifier
Swiggy credentials
MCP client
Gemini tool orchestration

============== DATABASE ================

User
Swiggy connection
Credential metadata
```

---

# 31. Environment Variables

Server-side configuration SHALL include the required Swiggy configuration.

Potential variables include:

```text
SWIGGY_CLIENT_ID
SWIGGY_REDIRECT_URI
SWIGGY_AUTHORIZATION_URL
SWIGGY_TOKEN_URL
SWIGGY_FOOD_MCP_URL
SWIGGY_INSTAMART_MCP_URL
SWIGGY_DINEOUT_MCP_URL
```

Only variables actually required by Swiggy's verified integration flow SHALL
be added.

Client secrets, when required, SHALL remain server-side.

No secret SHALL use a VITE_ prefix.

---

# 32. Database Design

A dedicated Swiggy connection model is preferred.

Logical relationship:

```text
users
  |
  | 1
  |
  | *
  v
swiggy_connections
```

A unique constraint SHOULD prevent multiple active connections of the same
provider for one user unless multiple Swiggy accounts are explicitly
supported.

---

# 33. First Vertical Slice

The first implementation SHALL NOT attempt the complete product.

The first vertical slice is:

```text
Connect Swiggy
      |
      v
OAuth 2.1
      |
      v
PKCE
      |
      v
Callback
      |
      v
Token Exchange
      |
      v
Secure Credential Storage
      |
      v
MCP Client
      |
      v
MCP initialize
      |
      v
tools/list
      |
      v
One Food Read Operation
      |
      v
Verified Result
```

This vertical slice must pass before expanding the integration.

---

# 34. Second Vertical Slice

After the first slice passes:

```text
Gemini
   |
   v
Tool Selection
   |
   v
Food MCP
   |
   v
Tool Result
   |
   v
Gemini
   |
   v
Natural Language Response
```

---

# 35. Third Vertical Slice

Then add:

```text
Instamart MCP
```

with:

```text
Product Search
      |
      v
Real Product Results
      |
      v
NutriFlow Grocery UI
```

---

# 36. Fourth Vertical Slice

Then add:

```text
Dineout MCP
```

with:

```text
Restaurant Search
      |
      v
Availability
      |
      v
NutriFlow Dining UI
```

---

# 37. Production Deployment

Production deployment SHALL maintain the same security boundaries.

Production:

```text
Browser
   |
   v
Vercel / NutriFlow Frontend
   |
   v
NutriFlow Backend
   |
   +--> Supabase
   |
   +--> Gemini
   |
   +--> Swiggy OAuth
   |
   +--> Swiggy MCP
```

The registered redirect URI SHALL remain exactly:

```text
https://nutriflow-ai.vercel.app/auth/callback/
```

Deployment configuration SHALL provide all required server-side environment
variables.

---

# 38. Design Constraints

The implementation SHALL NOT:

* replace Supabase Auth unnecessarily
* replace Gemini unnecessarily
* create a second frontend
* create a second NutriFlow backend
* expose Swiggy tokens to the browser
* use fake production tokens
* hard-code unknown MCP tool names
* bypass MCP using undocumented REST calls
* silently execute transactional actions

---

# 39. Design Verification

Before implementation begins, the following SHALL be confirmed against
Swiggy's current documentation and actual MCP behavior:

1. OAuth authorization endpoint
2. Token endpoint
3. Client registration mechanism
4. Required scopes
5. PKCE requirements
6. Streamable HTTP requirements
7. MCP authentication mechanism
8. Food MCP tools
9. Instamart MCP tools
10. Dineout MCP tools
11. Token expiration behavior
12. Logout/revocation behavior

The implementation SHALL use verified values rather than assumptions.

---

# 40. Definition of Technical Success

The design is considered successfully implemented when:

```text
NutriFlow User
      |
      v
Connect Swiggy
      |
      v
OAuth + PKCE
      |
      v
Successful callback
      |
      v
Server-side credential
      |
      v
MCP initialization
      |
      v
Tool discovery
      |
      v
Real Swiggy tool execution
      |
      v
Gemini interpretation
      |
      v
NutriFlow response
```

works for an authenticated NutriFlow user without exposing Swiggy credentials
to the browser.
