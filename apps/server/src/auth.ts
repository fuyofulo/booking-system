import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { JWT_SECRET } from "@repo/secrets/config";

// Define a session interface for better type safety
interface SessionData {
  token: string;
  userId: string | number;
}

// Session store class to manage per-session data
class SessionStore {
  private sessions: Map<string, SessionData> = new Map();

  // Store session data
  setSession(sessionId: string, token: string, userId: string | number): void {
    this.sessions.set(sessionId, { token, userId });
  }

  // Get token for a session
  getToken(sessionId: string): string | undefined {
    return this.sessions.get(sessionId)?.token;
  }

  // Get user ID for a session
  getUserId(sessionId: string): string | number | undefined {
    return this.sessions.get(sessionId)?.userId;
  }

  // Remove session data
  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  // Check if a session exists
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  // Get all sessions (for debugging)
  getAllSessions(): { sessionId: string; userId: string | number }[] {
    const sessions: { sessionId: string; userId: string | number }[] = [];
    this.sessions.forEach((data, sessionId) => {
      sessions.push({ sessionId, userId: data.userId });
    });
    return sessions;
  }
}

// Create a global session store instance
const sessionStore = new SessionStore();

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
  token = token.startsWith("Bearer ") ? token.substring(7) : token;

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
        // Store in the session store
        sessionStore.setSession(sessionId, token, userId);

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
  return sessionStore.getToken(sessionId);
}

/**
 * Get user ID for a session ID
 */
export function getUserIdForSession(
  sessionId: string
): string | number | undefined {
  return sessionStore.getUserId(sessionId);
}

/**
 * Remove token when a session is terminated
 */
export function removeTokenForSession(sessionId: string): void {
  if (sessionStore.hasSession(sessionId)) {
    sessionStore.removeSession(sessionId);
    console.log(`Session data removed for session ${sessionId}`);
  }
}

/**
 * Debug function to list all active sessions
 */
export function getAllSessions(): {
  sessionId: string;
  userId: string | number;
}[] {
  return sessionStore.getAllSessions();
}
