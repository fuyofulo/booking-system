// File: src/index.ts
import express, { Request, Response, NextFunction, RequestHandler } from "express"; // Added RequestHandler
import { randomUUID } from "node:crypto";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest, JSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";
import { prismaClient } from "@repo/db/client";
import { JWT_SECRET } from "@repo/secrets/config";
import jwt from 'jsonwebtoken';


// --- Auth Middleware ---
const authMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;

    if (!token) {
        console.warn("[AuthMiddleware] No token provided.");
        res.status(401).json({ message: "Access Denied: No token provided" });
        return; // Explicitly return after sending response
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        if (decoded && decoded.userId) {
            // @ts-ignore            
            req.userId = decoded.userId; // Now correctly typed if express.d.ts is set up
            // @ts-ignore
            console.log(`[AuthMiddleware] Token validated. User ID: ${req.userId}`);
            next();
        } else {
            console.warn("[AuthMiddleware] Token decoded but userId missing.");
            res.status(401).json({ message: "Invalid token: User ID missing" });
            return; // Explicitly return
        }
    } catch (err) {
        console.warn("[AuthMiddleware] Invalid token:", (err as Error).message);
        res.status(401).json({ message: "Invalid or expired token" });
        return; // Explicitly return
    }
};
// --- End Auth Middleware ---

const app = express();
app.use(express.json());

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
const sessionUserMap: { [mcpSessionId: string]: string /* userId */ } = {};

// Logging Middleware (before auth for /mcp)
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`\n[Incoming Request] ${req.method} ${req.originalUrl}`);
    if (req.headers.authorization) {
        console.log(`[Incoming Request Headers] Authorization: ${req.headers.authorization.substring(0, 20)}...`);
    }
    next();
});

// Apply authMiddleware to all /mcp routes
app.use('/mcp', authMiddleware);

function createAndConfigureMcpServer(currentSessionId: string): McpServer {
    const server = new McpServer({
        name: "RestaurantAppMcpServer",
        version: "1.0.0"
    });
    const authenticatedUserId = sessionUserMap[currentSessionId];
    console.log(`[MCP Setup][Session: ${currentSessionId}] Configuring McpServer. Authenticated User: ${authenticatedUserId || 'None'}`);

    server.resource(
        "my-profile",
        new ResourceTemplate("restaurant://me/profile", { list: undefined }),
        async (uri, params) => { // This handler is specific to McpServer, not an Express RequestHandler
            const userIdForThisSession = sessionUserMap[currentSessionId]; // Relies on currentSessionId from closure
            console.log(`[MCP Resource my-profile][Session: ${currentSessionId}] Handler. URI: ${uri.href}. Auth User: ${userIdForThisSession}`);

            if (!userIdForThisSession) {
                console.warn(`   [Auth Failed] No authenticated user for MCP session ${currentSessionId}.`);
                return { contents: [{ uri: uri.href, text: "Access Denied: Session not authenticated.", error: { message: "Forbidden: Unauthenticated session", code: 403 } }] };
            }
            console.log(`   [Auth Success] Fetching profile for user: '${userIdForThisSession}'.`);
            try {
                const user = await prismaClient.user.findUnique({
                    where: { id: userIdForThisSession },
                    select: { id: true, name: true, email: true, restaurantUsers: { select: { restaurant: { select: { id: true, name: true } }, role: { select: { id: true, name: true } } } } },
                });
                if (!user) {
                    return { contents: [{ uri: uri.href, text: `User profile for ID '${userIdForThisSession}' not found.`, error: { message: "User not found", code: 404 } }] };
                }
                const hasRestaurantAffiliation = user.restaurantUsers && user.restaurantUsers.length > 0;
                let profileContextText = `User Profile:\n  ID: ${user.id}\n  Name: ${user.name}\n  Email: ${user.email}\n  Has restaurant affiliations: ${hasRestaurantAffiliation ? 'Yes' : 'No'}\n`;
                if (hasRestaurantAffiliation) {
                    profileContextText += `  Restaurant Affiliations:\n`;
                    user.restaurantUsers.forEach(aff => { profileContextText += `    - Restaurant: "${aff.restaurant.name}" (ID: ${aff.restaurant.id})\n      Role: "${aff.role.name}" (ID: ${aff.role.id})\n`; });
                }
                return { contents: [{ uri: uri.href, text: profileContextText }] };
            } catch (error: any) {
                console.error(`[MCP Resource my-profile][Session: ${currentSessionId}] DB Error for ${userIdForThisSession}:`, error);
                return { contents: [{ uri: uri.href, text: `Error fetching profile: ${error.message}`, error: { message: "Internal server error", code: 500 } }] };
            }
        }
    );
    console.log(`[MCP Setup][Session: ${currentSessionId}] McpServer configured.`);
    return server;
}

const postMcpHandler: RequestHandler = async (req, res, next) => {
    const sessionIdHeader = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;
    let activeSessionId: string;
    // @ts-ignore
    const authenticatedUserIdFromMiddleware = req.userId; // Correctly typed if express.d.ts is used

    const mcpRequestBody = req.body as JSONRPCRequest;

    if (sessionIdHeader && transports[sessionIdHeader]) {
        transport = transports[sessionIdHeader];
        activeSessionId = sessionIdHeader;
        console.log(`[MCP POST /mcp][Session: ${activeSessionId}] Reusing transport. Auth User (middleware): ${authenticatedUserIdFromMiddleware}`);
        // Optional: Verify consistency: if (sessionUserMap[activeSessionId] !== authenticatedUserIdFromMiddleware) { /* handle mismatch */ }
    } else if (!sessionIdHeader && isInitializeRequest(mcpRequestBody)) {
        if (!authenticatedUserIdFromMiddleware) {
            console.error(`[MCP POST /mcp] CRITICAL: New session init but no userId from authMiddleware. AuthMiddleware should have responded 401.`);
            // authMiddleware should have already sent a 401 response. If not, this is a fallback.
            if (!res.headersSent) {
                res.status(401).json({ jsonrpc: '2.0', error: { code: -32002, message: 'Authentication required and failed.' }, id: mcpRequestBody.id || null });
            }
            return; // Stop processing
        }

        const newSessionId = randomUUID();
        activeSessionId = newSessionId;
        sessionUserMap[activeSessionId] = authenticatedUserIdFromMiddleware;

        console.log(`[MCP POST /mcp][Session: ${activeSessionId}] Initializing new session for User ID: ${authenticatedUserIdFromMiddleware}.`);
        console.log(`   Initialize client params:`, JSON.stringify(mcpRequestBody.params, null, 2));

        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => newSessionId,
            onsessioninitialized: (initializedSid) => {
                transports[initializedSid] = transport;
                console.log(`[MCP Session][Session: ${initializedSid}] Transport stored. User: ${sessionUserMap[initializedSid]}`);
            }
        });

        transport.onclose = () => {
            if (transport.sessionId) {
                delete transports[transport.sessionId];
                delete sessionUserMap[transport.sessionId];
                console.log(`[MCP Session][Session: ${transport.sessionId}] Resources cleaned up.`);
            }
        };

        const server = createAndConfigureMcpServer(activeSessionId);

        try {
            await server.connect(transport);
            console.log(`[MCP Server][Session: ${activeSessionId}] McpServer connected.`);
        } catch (connectError) {
            console.error(`[MCP Server][Session: ${activeSessionId}] CRITICAL: Connect fail:`, connectError);
            const requestId = mcpRequestBody.id || null;
            // Don't try to send another response if one might have been started by transport
            if (!res.headersSent) {
                 res.status(500).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Internal error: MCP session backend init fail.' }, id: requestId });
            }
            return;
        }
    } else {
        const requestId = mcpRequestBody.id || null;
        console.warn(`[MCP POST /mcp] Bad Request/State. Header: '${sessionIdHeader}', Body ID: ${requestId}.`);
        // authMiddleware should handle pure auth failures. This is for MCP protocol errors or unexpected states.
        if (!res.headersSent) {
            res.status(400).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Bad Request: Invalid MCP structure or session state.' }, id: requestId });
        }
        return;
    }

    try {
        console.log(`[MCP POST /mcp][Session: ${activeSessionId}] Forwarding to transport.handleRequest.`);
        await transport.handleRequest(req, res, mcpRequestBody);
    } catch (handleError) {
        console.error(`[MCP POST /mcp][Session: ${activeSessionId}] Error in transport.handleRequest:`, handleError);
        if (!res.headersSent) {
            const requestId = mcpRequestBody.id || null;
            res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error processing MCP request.' }, id: requestId });
        }
    }
};
app.post('/mcp', postMcpHandler); // Use the explicitly typed handler

const sessionRequestHandler: RequestHandler = async (req, res, next) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    // @ts-ignore
    const authenticatedUserIdForRequest = req.userId; // From authMiddleware

    if (!sessionId || !transports[sessionId]) {
        console.warn(`[MCP ${req.method} /mcp] Invalid mcp-session-id: '${sessionId}'. Auth User: ${authenticatedUserIdForRequest}`);
        if (!res.headersSent) {
             res.status(400).type('text/plain').send('Invalid or missing mcp-session-id header.');
        }
        return;
    }
    
    const transport = transports[sessionId];
    if (sessionUserMap[sessionId] !== authenticatedUserIdForRequest) {
        console.error(`[MCP ${req.method} /mcp][Session: ${sessionId}] CRITICAL: User ID mismatch! Session: ${sessionUserMap[sessionId]}, Token: ${authenticatedUserIdForRequest}.`);
        delete transports[sessionId];
        delete sessionUserMap[sessionId];
        await transport.close().catch(e => console.error("Error closing transport on mismatch:", e));
        if (!res.headersSent) {
            res.status(403).type('text/plain').send('Forbidden: Session-token user mismatch.');
        }
        return;
    }

    console.log(`[MCP ${req.method} /mcp][Session: ${sessionId}] Handling. Auth User: ${authenticatedUserIdForRequest}`);
    try {
        await transport.handleRequest(req, res);
    } catch (error) {
        console.error(`[MCP ${req.method} /mcp][Session: ${sessionId}] Error in transport.handleRequest:`, error);
        if (!res.headersSent) {
            res.status(500).type('text/plain').send('Internal server error');
        }
    }
};
app.get('/mcp', sessionRequestHandler);
app.delete('/mcp', sessionRequestHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`MCP Restaurant Server listening on port ${PORT}`);
    // ...
});
