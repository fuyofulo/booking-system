/**
 * API Client for making authenticated HTTP requests
 * This module provides utility functions for making HTTP requests with JWT authentication
 */

import fetch from "node-fetch";
import type { RequestInit, Response } from "node-fetch";

/**
 * Interface for request options
 */
interface RequestOptions {
  token: string;
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Make an authenticated HTTP request
 *
 * @param method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param url - URL to make the request to
 * @param options - Request options including token, body, and additional headers
 * @returns Promise resolving to the JSON response or text
 */
export async function makeRequest(
  method: string,
  url: string,
  options: RequestOptions
): Promise<any> {
  const { token, body, headers = {} } = options;

  // Prepare headers with authorization and content type
  const requestHeaders = {
    Authorization: token, // Send token directly without Bearer prefix
    "Content-Type": "application/json",
    ...headers,
  };

  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
    // Only include body for non-GET requests and if body is provided
    ...(method !== "GET" && body && { body: JSON.stringify(body) }),
  };

  try {
    // Make the request
    const response = await fetch(url, requestOptions);

    // Check if response is OK
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Request failed with status ${response.status}: ${errorText}`
      );
    }

    // Try to parse as JSON, fallback to text if not JSON
    try {
      return await response.json();
    } catch (e) {
      return await response.text();
    }
  } catch (error) {
    console.error(`Error making ${method} request to ${url}:`, error);
    throw error;
  }
}

/**
 * Make a GET request
 *
 * @param url - URL to make the GET request to
 * @param token - JWT token for authorization
 * @param headers - Additional headers (optional)
 */
export async function get(
  url: string,
  token: string,
  headers?: Record<string, string>
): Promise<any> {
  return makeRequest("GET", url, { token, headers });
}

/**
 * Make a POST request
 *
 * @param url - URL to make the POST request to
 * @param token - JWT token for authorization
 * @param body - Request body to send as JSON
 * @param headers - Additional headers (optional)
 */
export async function post(
  url: string,
  token: string,
  body?: any,
  headers?: Record<string, string>
): Promise<any> {
  return makeRequest("POST", url, { token, body, headers });
}

/**
 * Make a PUT request
 *
 * @param url - URL to make the PUT request to
 * @param token - JWT token for authorization
 * @param body - Request body to send as JSON
 * @param headers - Additional headers (optional)
 */
export async function put(
  url: string,
  token: string,
  body?: any,
  headers?: Record<string, string>
): Promise<any> {
  return makeRequest("PUT", url, { token, body, headers });
}

/**
 * Make a DELETE request
 *
 * @param url - URL to make the DELETE request to
 * @param token - JWT token for authorization
 * @param headers - Additional headers (optional)
 */
export async function del(
  url: string,
  token: string,
  headers?: Record<string, string>
): Promise<any> {
  return makeRequest("DELETE", url, { token, headers });
}

/**
 * Make a PATCH request
 *
 * @param url - URL to make the PATCH request to
 * @param token - JWT token for authorization
 * @param body - Request body to send as JSON
 * @param headers - Additional headers (optional)
 */
export async function patch(
  url: string,
  token: string,
  body?: any,
  headers?: Record<string, string>
): Promise<any> {
  return makeRequest("PATCH", url, { token, body, headers });
}
