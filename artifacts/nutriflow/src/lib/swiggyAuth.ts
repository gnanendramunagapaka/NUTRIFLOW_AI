export function getSwiggyAuthUrl(): string {
  const mcpGatewayUrl =
    (typeof process !== "undefined" && process.env?.VITE_SWIGGY_MCP_GATEWAY_URL) ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SWIGGY_MCP_GATEWAY_URL) ||
    "https://mcp.swiggy.com/oauth/authorize";

  const clientId =
    (typeof process !== "undefined" && process.env?.VITE_SWIGGY_CLIENT_ID) ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SWIGGY_CLIENT_ID) ||
    "nutriflow-ai";

  // Always use the whitelisted callback URL in production, or dynamic origin in dev
  const redirectUri =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? `${window.location.origin}/auth/callback`
      : "https://nutriflow-ai.vercel.app/auth/callback";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "food:read food:write addresses:read",
  });

  return `${mcpGatewayUrl}?${params.toString()}`;
}

export function initiateSwiggyOAuth(): void {
  if (typeof window !== "undefined") {
    const authUrl = getSwiggyAuthUrl();
    window.location.href = authUrl;
  }
}
