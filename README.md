# WhatsApp Joke Bot

A WhatsApp bot that responds to every message with a contextual joke using a local LLM (Ollama). It always tries to match the user's language.

## Requirements

- Node.js v16 or higher
- WhatsApp account
- [Ollama](https://ollama.ai/) running locally

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Make sure Ollama is running and has the required model:
   ```
   ollama pull llama3.2:3b
   ```

3. Configure the bot (optional):
   Create a `.env` file with your configuration (defaults are provided if not specified):
   ```
   LLM_MODEL=llama3.2:3b
   OLLAMA_URL=http://localhost:11434
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

- `LLM_MODEL`: The Ollama model to use (default: llama3.2:3b)
- `OLLAMA_URL`: URL for the Ollama API (default: http://localhost:11434)
- `SYSTEM_PROMPT`: System prompt to guide the LLM's responses

## Notes

This bot uses:
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) for WhatsApp integration
- [Ollama](https://ollama.ai/) for local LLM access