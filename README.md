# WhatsApp AI Assistant

A WhatsApp bot that responds with helpful, contextually relevant information using LangChain.js for flexible LLM integration. By default, it connects to OpenRouter, but can be configured to use other providers. It automatically detects and responds in the user's language with persistent conversation history.

## Requirements

- Node.js v16 or higher
- WhatsApp account
- Default: An OpenRouter API key
- Alternative: Any LLM provider supported by LangChain.js

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. The default system prompt is defined in `system-prompt.js`. You can edit this file to change the default behavior of the bot.

3. Configure the bot (optional):
   Create a `.env` file with your configuration (defaults are provided if not specified):
   ```
   # LLM Provider (defaults to 'openrouter')
   LLM_PROVIDER=openrouter
   
   # Model name (provider-specific)
   LLM_MODEL=openai/gpt4.1-nano
   
   # Base URL for the API (defaults to OpenRouter's API endpoint)
   LLM_API_BASE=https://openrouter.ai/api/v1
   
   # API key (required for your provider)
   LLM_API_KEY=your-api-key
   
   # System prompt for the LLM (override the default in system-prompt.js)
   SYSTEM_PROMPT=your-custom-prompt
   ```

4. Start the bot:
   ```
   npm start
   ```

5. Scan the QR code with your WhatsApp mobile app:
   - Open WhatsApp on your phone
   - Tap Menu or Settings and select "Linked Devices"
   - Tap "Link a Device"
   - Point your phone at the QR code displayed in the terminal

## Usage

- Send any text message to the bot, and it will reply with helpful, contextually relevant information
- The bot automatically detects and responds in the same language you're using
- The bot will show a "typing" indicator while crafting its response
- The bot remembers conversation history (up to 20 messages by default) to provide more contextual responses
- Conversation history is persisted between bot restarts

## CI/CD Pipelines

This project includes GitHub Actions workflows for testing and deployment:

1. **PR Testing**: Automatically runs tests on pull requests to ensure code quality
   - Executes Jest tests
   - Uploads test coverage reports

2. **Cloud Run Deployment**: Automatically deploys to Google Cloud Run when changes are merged to main
   - Builds and pushes Docker image to Google Container Registry
   - Deploys to Cloud Run with proper environment configuration
   - Sets up persistent storage volumes

To use these workflows, you'll need to configure the following GitHub repository secrets:
- `GCP_PROJECT_ID`: Your Google Cloud project ID
- `GCP_SA_KEY`: Base64-encoded service account key with deployment permissions
- `LLM_PROVIDER`: Your LLM provider (defaults to openrouter if not set)
- `LLM_MODEL`: Model to use
- `LLM_API_BASE`: API base URL
- `LLM_API_KEY`: Your LLM provider API key

## Configuration

You can customize the bot by setting these environment variables in your `.env` file:

- `LLM_PROVIDER`: The LLM provider to use (default: openrouter)
- `LLM_MODEL`: The model to use (default: openai/gpt4.1-nano)
- `LLM_API_BASE`: Base URL for the API (default: https://openrouter.ai/api/v1)
- `LLM_API_KEY`: API key for providers that require authentication
- `SYSTEM_PROMPT`: System prompt to guide the LLM's responses (override the default in system-prompt.js)
- `CHAT_HISTORY_LIMIT`: Maximum number of messages to keep in conversation history (default: 20)
- `MCP_SERVER_URL`: URL for the MCP (Machine Cognition Protocol) server (optional)

## Using with Different LLM Providers

Thanks to LangChain.js integration, this bot supports a wide range of LLM providers beyond OpenRouter:

### OpenAI Example
```
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_API_BASE=https://api.openai.com/v1
LLM_API_KEY=your-openai-api-key
```

### Ollama Example
```
LLM_PROVIDER=ollama
LLM_MODEL=llama3
LLM_API_BASE=http://localhost:11434
```

### Anthropic Example
```
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-haiku
LLM_API_KEY=your-anthropic-api-key
```

For the complete list of supported providers, visit the [LangChain.js documentation](https://js.langchain.com/docs/integrations/chat/).

## Notes

This bot uses:
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) for WhatsApp integration
- [LangChain.js](https://js.langchain.com/) for LLM integration
- [OpenRouter](https://openrouter.ai/) as the default LLM provider
- [MCP (Machine Cognition Protocol)](https://docs.anthropic.com/en/docs/agents-and-tools/mcp/overview) for tool integration (optional)

## Chat History

The bot maintains conversation history for each chat:
- Chat history is stored in JSON files in the `data/` directory
- Each chat has its own history file identified by WhatsApp chat ID
- History includes both user messages and bot responses
- The system automatically limits history to the most recent messages (default: 20)
- This enables the bot to provide more contextually relevant responses based on the ongoing conversation

## MCP Integration

The bot supports connecting to an MCP (Machine Cognition Protocol) server to enable tool use:

### What is MCP?
MCP is a protocol that allows AI systems to use external tools and services. With MCP integration, the WhatsApp assistant can perform actions like:
- Retrieving real-time information
- Accessing specialized services
- Interacting with APIs
- Performing complex calculations

### Setup MCP
To enable MCP features:
1. Set up an MCP server (either local or remote)
2. Add the server URL to your `.env` file:
   ```
   MCP_SERVER_URL=http://your-mcp-server:8000
   ```
3. The bot will automatically detect and use available tools from the MCP server

### Benefits
- Enhanced capabilities beyond standard LLM responses
- Access to up-to-date information
- Ability to perform specialized tasks
- Seamless integration with your existing LLM configuration