# MCP Client with Claude Integration

This client provides a web-based interface for interacting with the MCP server through Claude AI. It enables natural language conversations for restaurant management tasks.

## Features

- 🤖 Natural language conversation with Claude AI
- 🔧 Access to all MCP server tools
- 📊 Tool execution through conversational interface
- 🔒 JWT authentication
- 🍽️ Restaurant management capabilities

## Setup

### 1. Get an Anthropic API Key

1. Visit [Anthropic's website](https://www.anthropic.com/) to sign up for an API key
2. Create a `.env` file in the `apps/client` directory with the following:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

### 2. Install dependencies

```
npm install
```

### 3. Build and start the web interface

```
npm run dev
# Or to use it through the main project
cd ../..
npm run start-web
```

## Usage

### Web Interface

The web interface runs on port 8080 by default and provides:

1. A REST API for the frontend to connect to
2. Authentication management
3. Claude AI integration for natural language processing

### REST API Endpoints

- `/api/auth` - Set JWT authentication token
- `/api/connect` - Connect to MCP server
- `/api/disconnect` - Disconnect from server
- `/api/call-tool` - Call a specific tool directly
- `/api/chat` - Process natural language queries through Claude
- `/api/status` - Get current connection status

### Environment Variables

- `ANTHROPIC_API_KEY` - Required for Claude integration
- `PORT` - (Optional) Override the default port (8080)

## Using with Frontend

The frontend should connect to this web interface running on port 8080.

When sending chat messages, the interface will:

1. Process the message with Claude
2. Detect intent to use restaurant management tools
3. Automatically call appropriate tools
4. Return the results in a conversational format

## Development

### Adding New Features

To extend the functionality:

1. Update the `processMessageWithClaude` function for new capabilities
2. Add new API endpoints as needed
3. Modify the frontend to use new features

### Debugging

Check the server logs for detailed information about:

- Claude API calls
- Tool executions
- Authentication issues
- Connection status
