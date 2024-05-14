import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { JWT_SECRET } from "@repo/secrets/config";

// Store tokens by session ID
export const tokenStore: { [sessionId: string]: string } = {};

// Store user IDs by session ID
export const userIdStore: { [sessionId: string]: string | number } = {};

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET couldn't be exported from config");
}

/**
 * Express middleware to check JWT authorization
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Skip auth for initialization requests
  if (req.method === "POST" && !req.headers["mcp-session-id"]) {
    return next();
  }

  // Get the Authorization header and handle both formats: with or without "Bearer " prefix
  let token = req.headers.authorization || "";

  // If the token starts with "Bearer ", remove that prefix
  if (token.startsWith("Bearer ")) {
    token = token.substring(7);
  }

  if (!token) {
    return res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Invalid or missing token",
      },
      id: null,
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded) {
      const userId = (decoded as any).userId;

      // Store the token with the session ID
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (sessionId) {
        tokenStore[sessionId] = token;

        // Store the user ID with the session ID
        userIdStore[sessionId] = userId;

        // Log the user ID
        console.log(
          `User authenticated - Session ID: ${sessionId}, User ID: ${userId}`
        );
      }

      // Attach user info to request
      (req as any).userId = userId;
      next();
    }
  } catch (err) {
    console.error("Token verification failed:", err);
    return res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Invalid or missing token",
      },
      id: null,
    });
  }
}

/**
 * Get token for a session ID
 */
export function getTokenForSession(sessionId: string): string | undefined {
  return tokenStore[sessionId];
}

/**
 * Get user ID for a session ID
 */
export function getUserIdForSession(
  sessionId: string
): string | number | undefined {
  return userIdStore[sessionId];
}

/**
 * Remove token when a session is terminated
 */
export function removeTokenForSession(sessionId: string): void {
  if (tokenStore[sessionId]) {
    delete tokenStore[sessionId];
    console.log(`Token removed for session ${sessionId}`);
  }

  // Also remove the user ID when session is terminated
  if (userIdStore[sessionId]) {
    delete userIdStore[sessionId];
    console.log(`User ID removed for session ${sessionId}`);
  }
}
