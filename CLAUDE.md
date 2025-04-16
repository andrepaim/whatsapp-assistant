# WhatsApp AI Assistant Project Memory

## Project Overview
A Node.js application that integrates WhatsApp with various Large Language Model (LLM) providers to create an AI assistant accessible via WhatsApp messages. The bot automatically detects the user's language, maintains conversation history, and provides helpful, contextually relevant responses.

## Core Features
- WhatsApp integration using whatsapp-web.js
- Flexible LLM provider support via LangChain.js
- Persistent conversation history
- Multi-language support
- Typing indicators while generating responses
- QR code authentication for WhatsApp Web

## Technical Architecture

### Main Components
1. **WhatsApp Client**: Uses whatsapp-web.js with Puppeteer for browser automation
2. **LLM Integration**: LangChain.js for connecting to various LLM providers
3. **Chat History Management**: Stores conversation history in JSON files
4. **Message Processing Pipeline**: Handles incoming messages and generates AI responses

### Key Files
- `index.js`: Main application entry point and core functionality
- `system-prompt.js`: Default instructions for the AI assistant
- `Dockerfile`: Container configuration for deployment
- `Makefile`: Utility commands for local and Docker operations
- `.github/workflows/*.yml`: CI/CD pipelines for testing and deployment

## Configuration
- Default LLM Provider: OpenRouter (openai/gpt4.1-nano)
- Configurable via environment variables:
  - `LLM_PROVIDER`: The LLM provider to use
  - `LLM_MODEL`: Model name
  - `LLM_API_BASE`: API endpoint URL
  - `LLM_API_KEY`: Authentication key
  - `SYSTEM_PROMPT`: Custom system instructions
  - `CHAT_HISTORY_LIMIT`: Maximum messages to retain (default: 20)
  - `PUPPETEER_ARGS`: Browser automation arguments

## Deployment Options
1. **Local Deployment**:
   - `npm install` and `npm start`
   - Scan QR code with WhatsApp mobile app

2. **Docker Deployment**:
   - `make docker-build` and `make docker-run`
   - Persistent volumes for data and auth

3. **Cloud Deployment**:
   - GitHub Actions workflow for Google Cloud Run
   - Configured with repository secrets

## Testing and Development Approach
- Test-Driven Development (TDD) must be followed for all new features
- Jest for unit testing
- Mock implementations for WhatsApp, LangChain and filesystem
- Test coverage reports generated during CI
- Always write tests first, then implement the feature
- Tests should verify behavior, not implementation details
- Focus on writing high-quality tests that provide actual value
- Avoid writing code that only aims to pass tests without proper implementation
- Maintain high test coverage (aim for >90% line coverage)
- Tests should be meaningful and verify actual business requirements

## Development Commands
- Build/Start: `npm start`
- Install dependencies: `npm install`
- Docker build: `make docker-build`
- Docker run: `make docker-run`
- View logs: `make docker-logs`
- Create backup: `make backup`

## Code Style Guidelines
- 2-space indentation, single quotes for strings
- Group imports by type (Node modules first, then external)
- Use try/catch blocks for async operations
- console.log for info, console.error for errors
- camelCase for variables/functions, PascalCase for classes
- Prefer async/await over Promise chains
- Use environment variables for API keys