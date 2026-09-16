# NutriFlow AI — Swiggy MCP Requirements

## 1. Purpose

This specification defines the functional and non-functional requirements for
integrating Swiggy Builders Club MCP into NutriFlow AI.

The integration SHALL allow an authenticated NutriFlow user to authorize
Swiggy and allow the NutriFlow AI agent to discover and invoke appropriate
Swiggy MCP tools.

The integration SHALL support:

- Swiggy Food
- Swiggy Instamart
- Swiggy Dineout

The implementation SHALL reuse the existing NutriFlow frontend, backend,
authentication, database, and AI architecture wherever practical.

---

# 2. Scope

## 2.1 In Scope

The implementation includes:

1. Swiggy OAuth 2.1 authentication
2. PKCE
3. OAuth state validation
4. Swiggy authorization callback
5. Authorization-code exchange
6. Per-user Swiggy credential storage
7. MCP Streamable HTTP connection
8. MCP initialization
9. MCP tool discovery
10. Food MCP integration
11. Instamart MCP integration
12. Dineout MCP integration
13. Gemini/AI agent integration
14. Tool selection
15. Tool invocation
16. Error handling
17. Token expiry handling
18. User disconnect/re-authentication
19. Integration testing
20. End-to-end testing

## 2.2 Out of Scope for the First Milestone

The first milestone SHALL NOT attempt to implement every Swiggy workflow.

The first milestone SHALL prove:

OAuth
→ PKCE
→ callback
→ token exchange
→ secure credential handling
→ MCP connection
→ MCP initialization
→ tool discovery
→ one verified Food MCP tool call

Instamart, Dineout, carts, checkout, ordering, and reservations SHALL be
implemented only after the first milestone passes.

---

# 3. Existing NutriFlow Authentication

## REQ-AUTH-001 — Existing Authentication

The system SHALL continue using the existing NutriFlow authentication
mechanism.

The Swiggy integration SHALL NOT replace Supabase authentication.

---

## REQ-AUTH-002 — Authenticated User

A user MUST be authenticated with NutriFlow before a Swiggy connection can
be associated with that user.

Unauthenticated users SHALL NOT be allowed to create a Swiggy connection.

---

## REQ-AUTH-003 — User Isolation

Every Swiggy credential SHALL belong to exactly one NutriFlow user.

A NutriFlow user SHALL only be able to access their own Swiggy connection.

---

# 4. Swiggy OAuth

## REQ-OAUTH-001 — OAuth Version

The integration SHALL implement the OAuth 2.1 authorization-code flow required
by Swiggy.

---

## REQ-OAUTH-002 — Authorization Endpoint

The system SHALL initiate authorization using:

https://mcp.swiggy.com/auth/authorize

---

## REQ-OAUTH-003 — Token Endpoint

The system SHALL exchange the authorization code using:

https://mcp.swiggy.com/auth/token

---

## REQ-OAUTH-004 — Redirect URI

The production redirect URI SHALL be:

https://nutriflow-ai.vercel.app/auth/callback/

The redirect URI SHALL exactly match the URI registered/allowlisted with
Swiggy.

---

## REQ-OAUTH-005 — PKCE Verifier

For every authorization attempt, the server SHALL generate a new,
cryptographically secure PKCE code verifier.

The verifier SHALL NOT be reused between authorization attempts.

---

## REQ-OAUTH-006 — PKCE Challenge

The system SHALL derive the PKCE code challenge from the verifier using:

SHA-256

and:

S256

as the code challenge method.

---

## REQ-OAUTH-007 — OAuth State

The system SHALL generate a cryptographically secure OAuth state value for
each authorization attempt.

---

## REQ-OAUTH-008 — State Validation

The callback SHALL verify the returned state before exchanging the
authorization code.

If state validation fails, the authorization attempt SHALL be rejected.

---

## REQ-OAUTH-009 — Authorization Parameters

The authorization request SHALL include the required OAuth parameters,
including:

- response_type=code
- client_id
- redirect_uri
- code_challenge
- code_challenge_method=S256
- state
- required Swiggy scope

The default MCP tool scope for the first implementation SHALL be:

mcp:tools

Additional scopes SHALL only be requested when required.

---

## REQ-OAUTH-010 — Callback Parameters

The callback SHALL correctly handle:

- code
- state
- error
- error_description when supplied

The callback SHALL reject requests with missing or invalid required values.

---

# 5. Authorization Code Exchange

## REQ-TOKEN-001 — Authorization Code Exchange

After successful callback validation, the backend SHALL exchange the
authorization code for a Swiggy access token.

---

## REQ-TOKEN-002 — PKCE Verification

The backend SHALL send the original PKCE code verifier during the
authorization-code exchange.

---

## REQ-TOKEN-003 — Server-Side Exchange

The token exchange SHALL occur on the server.

The browser SHALL NOT directly perform the Swiggy token exchange.

---

## REQ-TOKEN-004 — Token Response

The backend SHALL validate the token response before treating the Swiggy
connection as successful.

At minimum, the implementation SHALL verify that an access token is present.

---

## REQ-TOKEN-005 — Expiration

The system SHALL record the token expiration time.

Swiggy access tokens currently have a five-day lifetime.

The system SHALL treat a 401 or equivalent authentication failure as a signal
that authorization must be performed again.

---

## REQ-TOKEN-006 — No Fake Tokens

The system SHALL NEVER generate or return a fake Swiggy access token when
the real token exchange fails.

---

# 6. Credential Security

## REQ-SEC-001 — Browser Protection

The Swiggy access token SHALL NOT be stored in:

- localStorage
- sessionStorage
- browser cookies accessible to JavaScript
- URL parameters after callback processing

---

## REQ-SEC-002 — Server-Side Credential Handling

Swiggy credentials SHALL be handled server-side.

---

## REQ-SEC-003 — User Association

Stored credentials SHALL be associated with the authenticated NutriFlow
user ID.

---

## REQ-SEC-004 — Credential Isolation

A request from User A SHALL NEVER be able to obtain or use User B's Swiggy
access token.

---

## REQ-SEC-005 — Secret Logging

Access tokens, authorization codes, PKCE verifiers, client secrets, and other
credentials SHALL NOT be written to logs.

---

## REQ-SEC-006 — HTTPS

Swiggy credentials SHALL only be transmitted over HTTPS in deployed
environments.

---

# 7. MCP Connection

## REQ-MCP-001 — MCP Protocol

The implementation SHALL use the Model Context Protocol for communication
with Swiggy.

---

## REQ-MCP-002 — Streamable HTTP

The implementation SHALL use the Streamable HTTP MCP transport required by
Swiggy.

---

## REQ-MCP-003 — MCP Client

NutriFlow SHALL use an MCP-compatible client implementation rather than
treating the Swiggy endpoint as an arbitrary REST API.

---

## REQ-MCP-004 — Authentication Header

Authenticated MCP requests SHALL use the user's valid Swiggy access token
as the Bearer credential.

The access token SHALL NOT be passed as a tool argument.

---

## REQ-MCP-005 — MCP Initialization

The MCP client SHALL successfully initialize the connection before tools are
used.

---

## REQ-MCP-006 — Tool Discovery

The MCP client SHALL discover the tools exposed by each Swiggy MCP server.

The system SHALL NOT assume that a tool exists solely because its name is
mentioned in application code.

---

## REQ-MCP-007 — Tool Schema

The AI agent SHALL receive the actual tool name, description, input schema,
and other metadata exposed by the MCP server.

---

# 8. Swiggy Food

## REQ-FOOD-001 — Food Server

The Food MCP server SHALL use:

https://mcp.swiggy.com/food

---

## REQ-FOOD-002 — Food Connection

The system SHALL be able to establish an authenticated MCP connection to the
Food server.

---

## REQ-FOOD-003 — Food Tool Discovery

The system SHALL discover the available Food MCP tools dynamically.

---

## REQ-FOOD-004 — Address Verification

The first verified Food MCP workflow SHOULD use the user's available
Swiggy address information before performing location-dependent operations.

---

## REQ-FOOD-005 — Restaurant Search

The AI agent SHALL be able to use an appropriate discovered Food MCP tool to
search for restaurants.

---

## REQ-FOOD-006 — Menu Discovery

The AI agent SHALL be able to use appropriate Food MCP tools to retrieve
restaurant/menu information when required by the user's request.

---

# 9. Swiggy Instamart

## REQ-IM-001 — Instamart Server

The Instamart MCP server SHALL use:

https://mcp.swiggy.com/im

---

## REQ-IM-002 — Instamart Connection

The system SHALL establish an authenticated MCP connection to Instamart.

---

## REQ-IM-003 — Instamart Tool Discovery

The system SHALL discover Instamart tools dynamically.

---

## REQ-IM-004 — Product Search

The AI agent SHALL be able to search for Instamart products using the
appropriate discovered MCP tool.

---

## REQ-IM-005 — Real Product Data

Production Instamart recommendations SHALL use real MCP responses.

Mock products SHALL NOT be presented as real Swiggy products.

---

# 10. Swiggy Dineout

## REQ-DINE-001 — Dineout Server

The Dineout MCP server SHALL use:

https://mcp.swiggy.com/dineout

---

## REQ-DINE-002 — Dineout Connection

The system SHALL establish an authenticated MCP connection to Dineout.

---

## REQ-DINE-003 — Dineout Tool Discovery

The system SHALL discover Dineout tools dynamically.

---

## REQ-DINE-004 — Restaurant Search

The AI agent SHALL be able to search Dineout restaurants using the
appropriate discovered MCP tool.

---

## REQ-DINE-005 — Availability

The AI agent SHALL be able to check Dineout availability when the relevant
MCP tool is available and the user requests availability.

---

# 11. AI Agent

## REQ-AI-001 — Existing AI

The integration SHALL reuse NutriFlow's existing AI infrastructure wherever
practical.

---

## REQ-AI-002 — Tool Awareness

The AI agent SHALL be provided with the available MCP tools and their schemas.

---

## REQ-AI-003 — Tool Selection

The AI agent SHALL select an appropriate MCP tool based on:

- user intent
- user constraints
- available tool capabilities
- current conversation context

---

## REQ-AI-004 — Tool Arguments

The AI agent SHALL generate tool arguments that conform to the MCP tool's
actual input schema.

---

## REQ-AI-005 — Tool Results

MCP tool results SHALL be returned to the AI agent so that the agent can
interpret the result and produce a user-facing response.

---

## REQ-AI-006 — No Fabricated Results

The AI SHALL NOT fabricate restaurants, products, availability, prices, or
other Swiggy data when an MCP operation fails or returns no result.

---

# 12. User Confirmation

## REQ-CONFIRM-001 — Read Operations

Search, discovery, recommendation, and other read-only operations MAY execute
without explicit confirmation when appropriate.

---

## REQ-CONFIRM-002 — External Side Effects

Operations that cause an external side effect SHALL require explicit user
confirmation before execution.

Examples:

- add to external cart
- checkout
- order
- reservation
- cancellation
- other transactional actions

---

## REQ-CONFIRM-003 — No Silent Transactions

The AI agent SHALL NOT silently place an order or booking based only on an
ambiguous natural-language request.

---

# 13. Error Handling

## REQ-ERROR-001 — OAuth Errors

The system SHALL provide a clear failure state for OAuth errors.

---

## REQ-ERROR-002 — MCP Connection Errors

The system SHALL detect MCP connection failures.

---

## REQ-ERROR-003 — MCP Tool Errors

The system SHALL distinguish tool execution failures from successful
responses.

---

## REQ-ERROR-004 — Unauthorized

A 401 or equivalent authentication failure SHALL cause the system to treat
the Swiggy authorization as expired or invalid.

---

## REQ-ERROR-005 — Reauthorization

When the Swiggy access token expires or is revoked, the system SHALL initiate
or request a new authorization flow.

The first implementation SHALL NOT assume that refresh tokens are available.

---

## REQ-ERROR-006 — No False Success

A failed Swiggy/MCP operation SHALL NOT be reported to the user as successful.

---

# 14. Disconnect

## REQ-DISCONNECT-001 — User Disconnect

The user SHALL be able to disconnect their Swiggy account from NutriFlow.

---

## REQ-DISCONNECT-002 — Credential Removal

Disconnecting SHALL remove the user's stored Swiggy credential from NutriFlow.

---

## REQ-DISCONNECT-003 — Swiggy Session Revocation

Where supported and required, the implementation SHOULD revoke the active
Swiggy session using Swiggy's logout mechanism.

---

# 15. Connection Status

## REQ-STATUS-001 — Connected State

NutriFlow SHALL only display "Swiggy Connected" after successful OAuth
authorization and successful verification of the Swiggy MCP connection.

---

## REQ-STATUS-002 — Expired State

An expired or invalid Swiggy credential SHALL NOT continue to be displayed
as a healthy connection.

---

## REQ-STATUS-003 — Verification

The system SHOULD perform a lightweight MCP verification operation before
declaring a connection healthy.

---

# 16. Multi-Server Support

## REQ-SERVER-001 — Independent Servers

Food, Instamart, and Dineout SHALL be treated as separate MCP servers.

---

## REQ-SERVER-002 — Shared User Authorization

The system MAY reuse the authenticated Swiggy user session across the three
MCP servers.

---

## REQ-SERVER-003 — Independent Failure

Failure of one MCP server SHALL NOT automatically mark all other MCP servers
as unavailable.

---

# 17. Existing NutriFlow Compatibility

## REQ-COMPAT-001 — Existing Login

Existing NutriFlow login functionality SHALL continue to work.

---

## REQ-COMPAT-002 — Existing AI

Existing AI chat functionality SHALL continue to work.

---

## REQ-COMPAT-003 — Existing Database

Existing user and application data SHALL remain intact.

---

## REQ-COMPAT-004 — Existing UI

Existing NutriFlow functionality SHALL NOT be unnecessarily redesigned.

---

## REQ-COMPAT-005 — Mock Functionality

Existing mock Swiggy/Instamart functionality SHALL be clearly separated from
real MCP functionality during development.

---

# 18. Testing Requirements

## REQ-TEST-001 — OAuth Test

A test SHALL verify that the authorization request contains valid:

- client_id
- redirect_uri
- response_type
- state
- code_challenge
- code_challenge_method

---

## REQ-TEST-002 — Callback Test

A test SHALL verify successful processing of a valid:

code + state

combination.

---

## REQ-TEST-003 — Invalid State Test

A callback with an invalid state SHALL be rejected.

---

## REQ-TEST-004 — Token Exchange Test

A valid authorization code SHALL result in a valid token exchange.

---

## REQ-TEST-005 — Token Security Test

A Swiggy access token SHALL NOT appear in:

- localStorage
- frontend response payloads
- browser-visible application state
- normal application logs

---

## REQ-TEST-006 — MCP Initialization Test

The Food MCP client SHALL successfully initialize.

---

## REQ-TEST-007 — Tool Discovery Test

The Food MCP client SHALL successfully discover available tools.

---

## REQ-TEST-008 — Food Tool Test

At least one real Food MCP tool SHALL successfully execute against the
authenticated Swiggy account.

---

## REQ-TEST-009 — Instamart Tool Test

At least one real Instamart MCP tool SHALL successfully execute.

---

## REQ-TEST-010 — Dineout Tool Test

At least one real Dineout MCP tool SHALL successfully execute.

---

## REQ-TEST-011 — Expired Token Test

The system SHALL correctly handle an expired/invalid Swiggy access token.

---

## REQ-TEST-012 — Multi-User Test

Two NutriFlow users SHALL be unable to access each other's Swiggy credentials.

---

# 19. Acceptance Criteria

The Swiggy MCP integration SHALL NOT be considered complete until all
mandatory requirements for the applicable milestone pass.

## Milestone 1 — Authentication

OAuth 2.1
→ PKCE
→ state
→ callback
→ token exchange
→ secure storage

All authentication tests MUST pass.

---

## Milestone 2 — MCP

Authenticated token
→ MCP connection
→ initialize
→ tools/list
→ verified Food tool

All MCP tests MUST pass.

---

## Milestone 3 — AI

User request
→ Gemini
→ MCP tool selection
→ MCP invocation
→ tool result
→ Gemini response

The end-to-end AI workflow MUST pass.

---

## Milestone 4 — Commerce Expansion

Food
→ Instamart
→ Dineout

Each server SHALL have independent integration tests.

---

# 20. Source of Truth

The following Swiggy Builders Club documentation SHALL be treated as the
external protocol reference for implementation:

- Authentication
- Developer quickstart
- Build an agent
- Delegated authentication
- MCP tool reference

Implementation SHALL follow the actual MCP tool schemas exposed by Swiggy
rather than assumptions made in this specification.

When Swiggy's documentation and the existing NutriFlow implementation differ,
the implementation SHALL be updated to satisfy the verified Swiggy protocol
requirements.
