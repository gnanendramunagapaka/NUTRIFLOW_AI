# NutriFlow AI — Project Constitution

## 1. Purpose

NutriFlow AI is a nutrition-focused AI application that provides personalized
food, grocery, and dining assistance.

The Swiggy MCP integration extends NutriFlow AI so authenticated users can
interact with Swiggy Food, Instamart, and Dineout through MCP-enabled AI
workflows.

This constitution defines the non-negotiable engineering and security
principles for the project.

---

## 2. Existing Architecture Must Be Preserved

The existing NutriFlow architecture MUST be reused wherever practical.

Current major components include:

- React/Vite frontend
- Express backend
- Supabase authentication
- Supabase/PostgreSQL database
- Existing Gemini-based AI functionality

The Swiggy integration MUST NOT require replacing working authentication,
database, frontend, or AI infrastructure without a demonstrated technical
necessity.

---

## 3. Authentication

NutriFlow authentication and Swiggy authentication are separate concerns.

NutriFlow MUST continue to use its existing authentication system.

Swiggy authentication MUST use the OAuth flow specified by Swiggy.

The Swiggy OAuth implementation MUST:

- Use OAuth 2.1 where required by Swiggy.
- Use PKCE.
- Generate a cryptographically secure code verifier.
- Generate the corresponding S256 code challenge.
- Generate and validate OAuth state.
- Validate the callback before exchanging the authorization code.
- Reject invalid or unexpected OAuth callbacks.

---

## 4. Swiggy Credentials

Swiggy access tokens and refresh tokens are sensitive credentials.

The browser MUST NOT persist Swiggy access tokens in:

- localStorage
- sessionStorage
- frontend source code
- URL parameters after the callback is processed

Swiggy credentials MUST be handled server-side.

Credentials MUST be associated with the authenticated NutriFlow user.

One user's Swiggy credentials MUST NEVER be accessible to another NutriFlow
user.

---

## 5. OAuth Callback

The whitelisted Swiggy redirect URI is:

https://nutriflow-ai.vercel.app/auth/callback/

The implementation MUST preserve the exact registered redirect URI.

The callback MUST correctly handle:

- authorization code
- state
- OAuth errors

The implementation MUST NOT assume that receiving a callback means that
authentication succeeded.

Successful Swiggy connection status MUST only be reported after the OAuth
exchange and required MCP verification succeed.

---

## 6. MCP Architecture

Swiggy MCP MUST be integrated using a proper MCP client implementation.

The implementation MUST NOT rely on an ad-hoc HTTP/JSON-RPC proxy when the
official MCP protocol/client functionality is required.

The MCP integration MUST support the protocol required by Swiggy, including
Streamable HTTP where applicable.

The MCP client MUST be capable of:

- initializing an MCP session
- discovering available tools
- invoking discovered tools
- handling MCP errors
- handling authentication failures
- handling expired credentials

Tool names and schemas MUST NOT be hard-coded without verifying the actual
tools exposed by the corresponding MCP server.

---

## 7. Swiggy MCP Servers

The integration treats the following as separate MCP services:

### Food

https://mcp.swiggy.com/food

### Instamart

https://mcp.swiggy.com/im

### Dineout

https://mcp.swiggy.com/dineout

Each service MUST be independently testable.

Failure of one Swiggy service MUST NOT incorrectly indicate that all Swiggy
services are unavailable.

---

## 8. AI Agent Integration

The existing NutriFlow AI system MUST remain the primary AI layer.

The Swiggy MCP integration should extend the existing AI architecture rather
than creating an unnecessary second AI application.

The intended flow is:

User
→ NutriFlow frontend
→ NutriFlow backend
→ AI/agent
→ MCP client
→ Swiggy MCP
→ MCP tool
→ tool result
→ AI/agent
→ NutriFlow frontend

The AI MUST only invoke tools that are available and appropriate for the
user's request.

Tool results MUST be treated as external data and MUST NOT automatically be
trusted as system instructions.

---

## 9. User Confirmation

Actions that can create external side effects MUST require appropriate user
confirmation before execution.

Examples include:

- adding items to an external cart
- placing an order
- making a booking
- performing a transaction

Searching and recommendation operations may be performed without additional
confirmation when they have no external side effect.

---

## 10. Error Handling

The system MUST fail safely.

The implementation MUST handle:

- OAuth denial
- invalid OAuth state
- missing authorization code
- token exchange failure
- expired access token
- invalid access token
- MCP connection failure
- MCP initialization failure
- tool discovery failure
- tool execution failure
- Swiggy service unavailability
- malformed MCP responses

The system MUST NOT generate fake credentials or falsely report successful
Swiggy authentication.

---

## 11. Secrets and Environment Variables

Secrets MUST NOT be committed to source control.

Secret values MUST NOT be printed in logs, error messages, specifications,
tests, screenshots, or documentation.

Client-side environment variables MUST NOT contain server-only secrets.

Swiggy client secrets and credentials MUST remain server-side.

Only variable names may be documented in example environment files.

---

## 12. Database and Data Isolation

User-specific Swiggy integration data MUST be associated with the NutriFlow
authenticated user.

Database queries involving Swiggy credentials MUST enforce user isolation.

The implementation MUST prevent:

- cross-user credential access
- cross-user cart access
- cross-user session access
- accidental credential exposure

---

## 13. Testing Requirements

Every major integration stage MUST be independently testable.

Testing MUST proceed incrementally:

1. OAuth authorization
2. PKCE verification
3. OAuth callback
4. Authorization-code exchange
5. Secure credential persistence
6. MCP initialization
7. MCP tool discovery
8. Food MCP operation
9. Instamart MCP operation
10. Dineout MCP operation
11. AI tool selection
12. End-to-end user workflow

A feature MUST NOT be considered implemented merely because its UI exists.

---

## 14. Spec-Driven Development

Implementation MUST follow this sequence:

Requirements
→ Design
→ Tasks
→ Implementation
→ Tests
→ Verification

Each implementation task SHOULD be small enough to test independently.

Existing working functionality MUST be protected by regression testing.

---

## 15. No Mock Success in Production

Mock data may be used during isolated development or UI testing.

However, mock data MUST NOT be presented as real Swiggy data.

The production system MUST NOT:

- generate fake Swiggy access tokens
- claim a real Swiggy connection without verification
- return fake Swiggy restaurant/product results as real results
- silently fall back from a failed real Swiggy request to fake success

---

## 16. Incremental Integration Strategy

The Swiggy integration MUST be implemented incrementally.

The first milestone is:

OAuth 2.1
→ PKCE
→ callback
→ token exchange
→ secure credential storage
→ MCP initialization
→ tools/list
→ one verified Food operation

Only after this vertical slice passes should the implementation expand to:

- Instamart
- Dineout
- AI-driven tool selection
- carts
- bookings
- other external actions

---

## 17. Definition of Done

A Swiggy feature is considered complete only when:

- The required specification exists.
- The implementation follows the approved design.
- Authentication works correctly.
- User isolation is verified.
- MCP communication is verified.
- Real MCP tool discovery succeeds.
- The intended tool operation succeeds.
- Error handling is tested.
- No secrets are exposed.
- Existing NutriFlow functionality continues to work.

---

## 18. Priority

When requirements conflict, prioritize in this order:

1. Security
2. User data isolation
3. Correct OAuth/MCP protocol behavior
4. Existing NutriFlow stability
5. Functional correctness
6. Testability
7. User experience
8. Performance
9. Additional features

---

## 19. Change Control

No major architectural change should be introduced without first updating
the relevant specification.

Implementation MUST remain consistent with:

- requirements.md
- design.md
- tasks.md
- tests.md

Any deviation discovered during implementation MUST be documented and
resolved before the related task is considered complete.