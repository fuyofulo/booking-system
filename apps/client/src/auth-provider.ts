import {
  OAuthClientInformation,
  OAuthClientInformationFull,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";

/**
 * Simple JWT token auth provider for MCP client
 * This provides a way to use a JWT token with the MCP transport
 */
export class JwtAuthProvider {
  private token: string | null = null;

  constructor(private clientId: string = "restaurant-mcp-client") {}

  /**
   * Set the JWT token to use for authentication
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Clear the JWT token
   */
  clearToken(): void {
    this.token = null;
  }

  /**
   * Get the JWT token if available
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Create headers with the JWT token if available
   */
  createAuthHeaders(): HeadersInit | undefined {
    if (!this.token) {
      return undefined;
    }
    return {
      Authorization: `Bearer ${this.token}`,
    };
  }

  /**
   * Convert to an OAuth tokens object compatible with the SDK
   * This allows us to integrate with the MCP transport's mechanisms
   * that expect OAuth tokens
   */
  toOAuthTokens(): OAuthTokens | undefined {
    if (!this.token) {
      return undefined;
    }
    return {
      access_token: this.token,
      token_type: "Bearer",
    };
  }

  /**
   * Returns simple client information for internal use
   */
  getClientInformation(): OAuthClientInformation {
    return {
      client_id: this.clientId,
    };
  }
}
