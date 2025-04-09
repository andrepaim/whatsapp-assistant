# WhatsApp Joke Bot

A WhatsApp bot that responds to every message with a contextual joke using LiteLLM for broad LLM integration. By default, it connects to Ollama running locally, but can be configured to use other providers. It always tries to match the user's language.

## Requirements

- Node.js v16 or higher
- WhatsApp account
- Default: [Ollama](https://ollama.ai/) running locally
- Alternative: Any LLM provider supported by LiteLLM

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. For the default setup with Ollama locally, make sure Ollama is running and has the required model:
   ```
   ollama pull llama3.2:3b
   ```

3. Configure the bot (optional):
   Create a `.env` file with your configuration (defaults are provided if not specified):
   ```
   # LLM Provider (defaults to 'ollama')
   LLM_PROVIDER=ollama
   
   # Model name (provider-specific)
   LLM_MODEL=llama3.2:3b
   
   # Base URL for the API (defaults to Ollama's local URL)
   LLM_API_BASE=http://localhost:11434
   
   # API key (if needed for your provider)
   LLM_API_KEY=
   
   # System prompt for the LLM
   SYSTEM_PROMPT=You are a humorous assistant responding to WhatsApp messages. Always respond with a joke that's contextually relevant to the user's message. Try to identify the language the user is writing in and respond in the same language. Keep responses concise and entertaining.
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

- Send any text message to the bot, and it will reply with a contextual joke related to your message
- The bot automatically detects and responds in the same language you're using
- The bot will show a "typing" indicator while crafting the perfect joke

## Configuration

You can customize the bot by setting these environment variables in your `.env` file:

- `LLM_PROVIDER`: The LLM provider to use (default: ollama)
- `LLM_MODEL`: The model to use (default: llama3.2:3b)
- `LLM_API_BASE`: Base URL for the API (default: http://localhost:11434)
- `LLM_API_KEY`: API key for providers that require authentication
- `SYSTEM_PROMPT`: System prompt to guide the LLM's responses

## Using with Different LLM Providers

Thanks to LiteLLM integration, this bot supports a wide range of LLM providers beyond Ollama:

### OpenAI Example
```
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_API_BASE=https://api.openai.com/v1
LLM_API_KEY=your-openai-api-key
```

### Azure OpenAI Example
```
LLM_PROVIDER=azure
LLM_MODEL=gpt-4
LLM_API_BASE=https://your-resource.openai.azure.com
LLM_API_KEY=your-azure-api-key
```

### Anthropic Example
```
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-haiku
LLM_API_KEY=your-anthropic-api-key
```

For a complete list of supported providers, visit the [LiteLLM documentation](https://docs.litellm.ai/docs/providers).

## Notes

This bot uses:
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) for WhatsApp integration
- [LiteLLM](https://github.com/BerriAI/litellm) for LLM integration
- [Ollama](https://ollama.ai/) as the default LLM provider