// Filename: src/index.ts
import { Client }  from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport, StreamableHTTPClientTransportOptions } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// Define types based on MCP specification for clarity and type safety
interface McpErrorData {
    code: number;
    message: string;
    data?: any;
}

interface ResourceContent {
    uri: string;
    text?: string;
    data?: unknown;
    error?: McpErrorData;
}

interface ReadResourceResult {
    contents: ResourceContent[];
}

// --- Configuration ---
const MCP_SERVER_BASE_URL = "http://localhost:3000"; // Ensure this matches your server
const MCP_ENDPOINT_PATH = "/mcp";                   // Ensure this matches your server's MCP endpoint

interface CommandLineArgs {
    jwt: string;
    // userId: string; // No longer needed for this specific resource call
}

function parseArgs(): CommandLineArgs {
    const args = process.argv.slice(2);

    // Now only expecting one argument: the JWT
    if (args.length < 1) {
        console.error("Usage: node <script_path.js> <jwt_token>");
        console.error("Example (if compiled to dist/index.js): node dist/index.js \"your.jwt.token\"");
        console.error("Or using ts-node: npx ts-node src/index.ts \"your.jwt.token\"");
        process.exit(1);
    }

    return {
        jwt: args[0]!,
        // userId: args[1]!, // Removed
    };
}

async function main() {
    // const { jwt, userId: targetUserId } = parseArgs(); // Old way
    const { jwt } = parseArgs(); // New way, only jwt needed from args

    console.log("MCP Client CLI starting...");
    console.log(`Attempting to connect to MCP server at: ${new URL(MCP_ENDPOINT_PATH, MCP_SERVER_BASE_URL).href}`);
    console.log(`JWT (first 10 chars for brevity): ${jwt.substring(0, 10)}...`);
    // console.log(`Target User ID for profile request: ${targetUserId}`); // No longer logging targetUserId

    const transportOptions: StreamableHTTPClientTransportOptions = {
        requestInit: {
            headers: {
                'Authorization': `Bearer ${jwt}`
            }
        }
    };

    const transport = new StreamableHTTPClientTransport(
        new URL(MCP_ENDPOINT_PATH, MCP_SERVER_BASE_URL),
        transportOptions
    );

    const client = new Client({
        name: "RestaurantTestClientCLI",
        version: "1.0.0"
    });

    try {
        console.log("\nAttempting to connect and initialize with MCP server...");
        await client.connect(transport);
        console.log("Successfully connected and initialized with MCP server.");

        // MODIFIED: Use the new URI for "my-profile"
        const profileResourceUri = `restaurant://me/profile`;
        console.log(`\nAttempting to read resource: ${profileResourceUri}`);

        const resourceResponse = await client.readResource({
            uri: profileResourceUri,
        }) as ReadResourceResult;

        console.log("\n--- Server Response for 'my-profile' ---");
        if (resourceResponse && resourceResponse.contents && resourceResponse.contents.length > 0) {
            resourceResponse.contents.forEach((content, index) => {
                console.log(`Content Item ${index + 1}:`);
                console.log(`  URI: ${content.uri}`);
                if (content.text !== undefined) {
                    console.log("  Text Content:");
                    console.log(`    ${String(content.text).split('\n').join('\n    ')}`);
                }
                if (content.data !== undefined) {
                    console.log(`  Structured Data: ${JSON.stringify(content.data, null, 2)}`);
                }
                if (content.error) {
                    console.error(`  Error from server: ${content.error.message} (Code: ${content.error.code})`);
                    if (content.error.data) {
                        console.error(`    Error data: ${JSON.stringify(content.error.data)}`);
                    }
                }
            });
        } else {
            console.log("Server returned no content items or an unexpected response structure.");
            console.log("Full response for debugging:", JSON.stringify(resourceResponse, null, 2));
        }

    } catch (error: any) {
        console.error("\n--- MCP Client Error ---");
        const errorDetails = error.response?.data?.error ||
                             error.cause?.response?.data?.error ||
                             (error.data?.error) ||
                             { message: error.message };

        console.error(`  Message: ${errorDetails.message || 'Unknown error'}`);
        if (errorDetails.code) {
            console.error(`  Code: ${errorDetails.code}`);
        }
        if (errorDetails.data) {
            console.error(`  Data: ${JSON.stringify(errorDetails.data)}`);
        }
        if (error.stack && process.env.DEBUG) {
             console.error("Stack:", error.stack);
        }
    } finally {
        console.log("\nCleaning up MCP client...");
        if (client && typeof client.close === 'function') {
            try {
                await client.close();
                console.log("MCP client connection closed.");
            } catch (closeError: any) {
                console.error("Error while closing MCP client connection:", closeError.message);
            }
        }
    }
}

main().catch(err => {
    console.error("Unhandled error in main client execution:", err);
    process.exit(1);
});
