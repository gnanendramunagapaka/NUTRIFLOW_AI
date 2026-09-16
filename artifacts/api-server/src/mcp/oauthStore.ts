import crypto from "node:crypto";
import { swiggyConfig } from "../lib/swiggyConfig";

export interface OAuthTransaction {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
  userId: number;
  clientId: string;
  createdAt: Date;
  expiresAt: Date;
}

// Short-lived in-memory store for pending OAuth transactions.
// State entries expire after 10 minutes.
const transactionStore = new Map<string, OAuthTransaction>();
const TRANSACTION_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * TASK-005: Generate a cryptographically secure PKCE code verifier (43-128 chars).
 * Server-side only, unique per authorization attempt, never exposed or logged.
 */
export function generateCodeVerifier(): string {
  // 64 random bytes formatted as base64url yields ~86 characters, well within 43-128 range
  return crypto.randomBytes(64).toString("base64url");
}

/**
 * TASK-006: Generate the S256 PKCE code challenge from a verifier.
 * Challenge = BASE64URL(SHA256(code_verifier))
 */
export function generateCodeChallenge(codeVerifier: string): string {
  return crypto
    .createHash("sha256")
    .update(codeVerifier, "utf8")
    .digest("base64url");
}

/**
 * TASK-007: Generate a cryptographically secure random OAuth state string.
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * TASK-004 & TASK-008: Create and store a new OAuth authorization transaction for a user.
 * Accepts an optional dynamic clientId (DCR RFC 7591).
 */
export function createOAuthTransaction(userId: number, clientId: string = swiggyConfig.clientId): OAuthTransaction {
  cleanExpiredTransactions();

  const state = generateOAuthState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TRANSACTION_TTL_MS);

  const transaction: OAuthTransaction = {
    state,
    codeVerifier,
    codeChallenge,
    userId,
    clientId,
    createdAt: now,
    expiresAt,
  };

  transactionStore.set(state, transaction);
  return transaction;
}

/**
 * TASK-007 & TASK-009: Retrieve and consume (delete) a stored OAuth transaction by state.
 * Validates state presence and expiration. Single-use: state is deleted upon lookup.
 */
export function getAndConsumeOAuthTransaction(state: string | undefined | null): OAuthTransaction | null {
  if (!state || typeof state !== "string") return null;

  const transaction = transactionStore.get(state);
  if (!transaction) return null;

  // Single-use guarantee: consume state immediately
  transactionStore.delete(state);

  // Check expiration
  if (new Date() > transaction.expiresAt) {
    return null; // Expired
  }

  return transaction;
}

/**
 * Removes expired transactions from memory store.
 */
export function cleanExpiredTransactions(): void {
  const now = new Date();
  for (const [state, tx] of transactionStore.entries()) {
    if (now > tx.expiresAt) {
      transactionStore.delete(state);
    }
  }
}

/**
 * Generates the full Swiggy OAuth 2.1 authorization URL for a transaction.
 */
export function buildAuthorizationUrl(transaction: OAuthTransaction): string {
  const url = new URL(swiggyConfig.authorizationUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", transaction.clientId || swiggyConfig.clientId);
  url.searchParams.set("redirect_uri", swiggyConfig.redirectUri);
  url.searchParams.set("scope", swiggyConfig.scope);
  url.searchParams.set("state", transaction.state);
  url.searchParams.set("code_challenge", transaction.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url.toString();
}

/** Returns store size (used for diagnostics/testing). */
export function getPendingTransactionCount(): number {
  cleanExpiredTransactions();
  return transactionStore.size;
}
