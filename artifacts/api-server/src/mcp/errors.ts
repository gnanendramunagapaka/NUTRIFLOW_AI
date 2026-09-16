export class SwiggyMcpError extends Error {
  constructor(message: string, public statusCode?: number, public code?: string) {
    super(message);
    this.name = "SwiggyMcpError";
  }
}

export class SwiggyTokenExpiredError extends SwiggyMcpError {
  constructor(message: string = "Swiggy access token has expired or is invalid.") {
    super(message, 401, "TOKEN_EXPIRED");
    this.name = "SwiggyTokenExpiredError";
  }
}

export class SwiggyMcpUnavailableError extends SwiggyMcpError {
  constructor(message: string = "Swiggy MCP server is currently unavailable.") {
    super(message, 503, "MCP_UNAVAILABLE");
    this.name = "SwiggyMcpUnavailableError";
  }
}

export class SwiggyToolExecutionError extends SwiggyMcpError {
  constructor(toolName: string, errorDetails: any) {
    const detailsMsg = typeof errorDetails === "string" ? errorDetails : JSON.stringify(errorDetails);
    super(`Execution of Swiggy MCP tool "${toolName}" failed: ${detailsMsg}`, 400, "TOOL_EXECUTION_FAILED");
    this.name = "SwiggyToolExecutionError";
  }
}
