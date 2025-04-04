import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const USER_AGENT = "weather-app/1.0";

// reate server instance
const server = new McpServer({
  name: "mcp-server",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// helper function
async function makeRequest<T>(url: string, method: "GET" | "POST", body?: any, token?: string): Promise<T | null> {

    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
  
    try {

        const response = await fetch(url, { method, headers, ...(body? {body: JSON.stringify(body)} : {}) });
            if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json()) as T;

    } catch (error) {
        console.error("Error making request:", error);
        return null;
    }
}
  
// tools 

server.tool("getUsers", "gets all the users present in the database", {},

    async () => {
        const requestUrl = "http://localhost:7000/api/v1/normal";
        
        try {
            const response = await fetch(requestUrl, {
                method: "GET", 
                headers: {
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Couldn't get response from server.",
                        },
                    ],
                    isError: true,
                };
            }

            const data = await response.json();

            return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(data, null, 2), // Pretty-printed raw data
                  },
                ],
            };   
        } catch {
            console.error("Error fetching users");
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to fetch users from the database.",
                    },
                ],
            };
        }
    }   
)





// main function
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Weather MCP Server running on stdio");
  }
  
  main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
})

