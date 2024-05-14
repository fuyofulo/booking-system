import { startClaudeClient } from "./claude-client.js";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Start the Claude client with command line arguments and explicit server URL
startClaudeClient(process.argv.slice(2), "http://localhost:3030/mcp").catch(
  (error) => {
    console.error("Error running Claude MCP client:", error);
    process.exit(1);
  }
);
