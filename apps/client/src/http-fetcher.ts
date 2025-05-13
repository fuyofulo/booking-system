import { JwtAuthProvider } from "./auth-provider.js";

/**
 * A wrapper around fetch that adds JWT token-based authentication
 */
export class HttpFetcher {
  constructor(private authProvider: JwtAuthProvider) {}

  /**
   * Make a fetch request with authentication headers
   */
  async fetch(url: RequestInfo, init?: RequestInit): Promise<Response> {
    const headers = this.authProvider.createAuthHeaders();
    const mergedInit: RequestInit = {
      ...init,
      headers: {
        ...(init?.headers || {}),
        ...(headers || {}),
      },
    };

    const response = await fetch(url, mergedInit);

    // Handle 401 Unauthorized responses
    if (response.status === 401) {
      // The token might be expired or invalid
      this.authProvider.clearToken();
      throw new Error("Authentication failed: Token invalid or expired");
    }

    return response;
  }

  /**
   * Make a GET request with authentication
   */
  async get(url: string): Promise<Response> {
    return this.fetch(url, { method: "GET" });
  }

  /**
   * Make a POST request with authentication
   */
  async post(url: string, body?: any): Promise<Response> {
    return this.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Make a PUT request with authentication
   */
  async put(url: string, body?: any): Promise<Response> {
    return this.fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Make a DELETE request with authentication
   */
  async delete(url: string): Promise<Response> {
    return this.fetch(url, { method: "DELETE" });
  }
}
