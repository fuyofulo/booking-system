import { startClaudeClient } from "./claude-client.js";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Start the Claude client with command line arguments
startClaudeClient(process.argv.slice(2)).catch((error) => {
  console.error("Error running Claude MCP client:", error);
  process.exit(1);
});
