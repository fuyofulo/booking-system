/**
 * Utility function for making HTTP requests with proper error handling
 */
export async function makeHttpRequest<T>(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "GET",
  headers: Record<string, string> = {},
  body?: any,
  authToken?: string | null
): Promise<T | null> {
  try {
    const finalHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (authToken) {
      finalHeaders["Authorization"] = `${authToken}`;
    }

    const options: RequestInit = {
      method,
      headers: finalHeaders,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`HTTP ${method} to ${url} failed:`, error);
    return null;
  }
}
