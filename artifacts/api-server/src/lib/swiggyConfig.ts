/**
 * Server-only Swiggy MCP configuration module.
 * 
 * Provides typed, validated configuration parameters required for
 * Swiggy OAuth 2.1 (DCR), PKCE, and MCP server endpoints.
 * 
 * SECURITY: Access tokens and credentials are held server-side ONLY
 * and MUST NEVER be exposed to browser/Vite client code.
 */

export interface SwiggyConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  registerUrl: string;
  authorizationUrl: string;
  tokenUrl: string;
  foodMcpUrl: string;
  instamartMcpUrl: string;
  dineoutMcpUrl: string;
  scope: string;
}

const DEFAULT_CONFIG: SwiggyConfig = {
  clientId: "nutriflow-ai",
  clientSecret: "",
  redirectUri: "https://nutriflow-ai.vercel.app/auth/callback/",
  registerUrl: "https://mcp.swiggy.com/auth/register",
  authorizationUrl: "https://mcp.swiggy.com/auth/authorize",
  tokenUrl: "https://mcp.swiggy.com/auth/token",
  foodMcpUrl: "https://mcp.swiggy.com/food",
  instamartMcpUrl: "https://mcp.swiggy.com/im",
  dineoutMcpUrl: "https://mcp.swiggy.com/dineout",
  scope: "mcp:tools",
};

/**
 * Validates a URL string to ensure it is absolute and uses a valid HTTP or HTTPS protocol.
 */
export function isValidUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Reads and validates Swiggy configuration from environment variables or custom input.
 */
export function loadSwiggyConfig(env: Record<string, string | undefined> = process.env): SwiggyConfig {
  const clientId = env.SWIGGY_CLIENT_ID || DEFAULT_CONFIG.clientId;
  const clientSecret = env.SWIGGY_CLIENT_SECRET || DEFAULT_CONFIG.clientSecret;
  const redirectUri = env.SWIGGY_REDIRECT_URI || DEFAULT_CONFIG.redirectUri;
  const registerUrl = env.SWIGGY_REGISTER_URL || DEFAULT_CONFIG.registerUrl;
  const authorizationUrl = env.SWIGGY_AUTHORIZATION_URL || DEFAULT_CONFIG.authorizationUrl;
  const tokenUrl = env.SWIGGY_TOKEN_URL || DEFAULT_CONFIG.tokenUrl;
  const foodMcpUrl = env.SWIGGY_FOOD_MCP_URL || DEFAULT_CONFIG.foodMcpUrl;
  const instamartMcpUrl = env.SWIGGY_INSTAMART_MCP_URL || DEFAULT_CONFIG.instamartMcpUrl;
  const dineoutMcpUrl = env.SWIGGY_DINEOUT_MCP_URL || DEFAULT_CONFIG.dineoutMcpUrl;
  const scope = env.SWIGGY_SCOPE || DEFAULT_CONFIG.scope;

  // URL Validation
  const urlsToValidate = [
    { name: "SWIGGY_REDIRECT_URI", value: redirectUri },
    { name: "SWIGGY_REGISTER_URL", value: registerUrl },
    { name: "SWIGGY_AUTHORIZATION_URL", value: authorizationUrl },
    { name: "SWIGGY_TOKEN_URL", value: tokenUrl },
    { name: "SWIGGY_FOOD_MCP_URL", value: foodMcpUrl },
    { name: "SWIGGY_INSTAMART_MCP_URL", value: instamartMcpUrl },
    { name: "SWIGGY_DINEOUT_MCP_URL", value: dineoutMcpUrl },
  ];

  for (const item of urlsToValidate) {
    if (!isValidUrl(item.value)) {
      throw new Error(`[SwiggyConfig FATAL] Malformed URL for ${item.name}: "${item.value}"`);
    }
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    registerUrl,
    authorizationUrl,
    tokenUrl,
    foodMcpUrl,
    instamartMcpUrl,
    dineoutMcpUrl,
    scope,
  };
}

/**
 * Returns a sanitized copy of SwiggyConfig safe for diagnostics and logging.
 * Replaces `clientSecret` with a redacted placeholder if present.
 */
export function getSanitizedSwiggyConfig(config: SwiggyConfig): Record<string, string> {
  return {
    clientId: config.clientId,
    clientSecret: config.clientSecret ? "******[REDACTED]******" : "[NOT SET]",
    redirectUri: config.redirectUri,
    registerUrl: config.registerUrl,
    authorizationUrl: config.authorizationUrl,
    tokenUrl: config.tokenUrl,
    foodMcpUrl: config.foodMcpUrl,
    instamartMcpUrl: config.instamartMcpUrl,
    dineoutMcpUrl: config.dineoutMcpUrl,
    scope: config.scope,
  };
}

export const swiggyConfig = loadSwiggyConfig();
export default swiggyConfig;
