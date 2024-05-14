# Restaurant Management System with MCP

This project implements a restaurant management system using the Model Context Protocol (MCP) to enable AI-driven interactions. The system allows users to manage restaurant tables, reservations, and other restaurant operations through natural language commands.

## System Architecture

The system consists of three main components:

1. **MCP Server (Port 3030)**: Handles authentication, provides restaurant management tools, and processes requests
2. **Web Interface (Port 8080)**: Connects the frontend to the MCP server and provides Claude AI integration
3. **Frontend UI (Port 3000)**: Next.js application that provides the user interface

## Installation

1. Install dependencies:

   ```
   npm install
   ```

2. Get an Anthropic API Key (required for natural language conversations):

   - Visit [Anthropic's website](https://www.anthropic.com/) to sign up for an API key
   - Create a `.env` file in the `apps/client` directory with: `ANTHROPIC_API_KEY=your_anthropic_api_key_here`

3. Build the project:
   ```
   npm run build
   ```

## Running the System

### Option 1: Run All Components Together

```
npm install -g concurrently  # If not already installed
npm run start-all
```

### Option 2: Run Components Individually

Terminal 1 - Start the MCP Server (port 3030):

```
npm run start-server
```

Terminal 2 - Start the Web Interface with Claude AI (port 8080):

```
npm run start-web
```

Terminal 3 - Start the Frontend UI (port 3000):

```
npm run start-frontend
```

Terminal 4 (Optional) - Start the Command-line Claude Client:

```
npm run start-claude-client
```

## Using the Web Interface with Claude

The web interface has been updated to use Claude AI for natural language understanding. When using the web interface:

1. Open the frontend in your browser at http://localhost:3000
2. Enter your JWT token and connect to the server
3. You can now use natural language to manage restaurants:
   - "Create a new table for 4 people at Restaurant XYZ"
   - "Show me all tables at Restaurant ABC"
   - "Update the status of table 5 to reserved"

The web interface will:

1. Process your message with Claude AI
2. Automatically detect your intent to use restaurant management tools
3. Execute the appropriate tools in the background
4. Provide a conversational response

## Using the Command-line Claude Client

Alternatively, you can use the command-line Claude client:

1. The client will automatically connect to the MCP server on port 3030
2. It will fetch available tools including restaurant-specific tools
3. You can issue natural language commands directly in the terminal

## Troubleshooting

- If you encounter authentication issues, use the `auth <token>` command in the Claude client
- If tools are not appearing, try reconnecting with the `connect` command
- If Claude integration is not working, make sure you've set the ANTHROPIC_API_KEY in the .env file
- To clear conversation history, use the `clear` command in the Claude client or disconnect/reconnect in the web interface

## License

MIT
