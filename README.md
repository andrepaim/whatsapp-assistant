# ZueiraBOT - Bot de Piadas para WhatsApp

Um bot divertido de WhatsApp que conta piadas em português brasileiro usando LangChain.js e integração MCP para acessar um banco de piadas. O bot responde a pedidos de piadas sobre temas específicos, coleta feedback dos usuários e mantém uma conversa informal e descontraída.

## Debugging e Logs

O ZueiraBOT inclui um sistema de logging detalhado para facilitar o diagnóstico de problemas:

### Logs de Conexão
- `INITIALIZATION`: Logs de início do bot e configuração
- `LOADING SCREEN`: Progresso da inicialização do cliente WhatsApp
- `AUTHENTICATED`: Confirmação de autenticação bem-sucedida
- `SUCCESS`: Cliente WhatsApp conectado e pronto
- `DISCONNECTED`: Cliente desconectado e motivo

### Logs de Mensagens
- `MESSAGE RECEIVED`: Detalhes completos de mensagens recebidas
- `PROCESSING MESSAGE`: Texto da mensagem em processamento
- `SKIPPING`: Mensagens ignoradas (enviadas pelo próprio bot)
- `MEDIA MESSAGE`: Detecção de mensagens com mídia

### Logs do LLM
- `LLM REQUEST`: Detalhes da solicitação ao modelo de linguagem
- `LLM CONFIG`: Configuração do provedor e modelo
- `LLM RESPONSE RECEIVED`: Tempo de resposta e tamanho

### Logs de Histórico
- `HISTORY`: Operações de leitura/gravação do histórico de conversas
- `HISTORY ERROR`: Erros detalhados de manipulação de arquivos

### Logs MCP
- `MCP INIT`: Inicialização da conexão com o servidor MCP
- `MCP SUCCESS`: Ferramentas carregadas com sucesso
- `MCP ERROR`: Problemas de conexão ou carregamento

Cada categoria de log inclui detalhes específicos para ajudar a identificar a causa raiz de problemas. Em caso de falha, o bot também salva arquivos de backup de erros para ajudar na depuração.

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

## Como Usar

- Envie uma mensagem para o bot pedindo uma piada sobre qualquer tema: "me conta uma piada de cachorro" ou "quero uma piada sobre programação"
- O bot responderá em português brasileiro com uma piada sobre o tema solicitado
- Após cada piada, o bot perguntará sua opinião sobre a piada
- Você pode responder com feedback positivo ("adorei", "muito boa") ou negativo ("sem graça", "não gostei")
- O bot usará seu feedback para melhorar e pedirá um novo tema para piada
- A conversa é persistente entre reinicializações do bot
- O ZueiraBOT usa um estilo informal e descontraído com gírias e expressões brasileiras

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

## Integração MCP para Piadas e Feedback

O ZueiraBOT utiliza o MCP (Machine Cognition Protocol) para duas funções principais:

### Banco de Piadas
O bot se conecta a um servidor MCP para:
- Buscar piadas sobre temas específicos solicitados pelo usuário
- Formatar corretamente as piadas para envio
- Criar piadas novas quando não existirem no banco de dados

### Sistema de Feedback
O MCP também é usado para:
- Registrar feedback do usuário sobre as piadas (positivo/negativo)
- Analisar preferências do usuário para melhorar as recomendações
- Enriquecer o banco de dados de piadas com novas adições

### Configuração do MCP
Para ativar os recursos de piadas:
1. Configure um servidor MCP (local ou remoto) com as ferramentas de piadas
2. Adicione a URL do servidor ao seu arquivo `.env`:
   ```
   MCP_SERVER_URL=http://seu-servidor-mcp:8000
   ```
3. O bot detectará automaticamente as ferramentas disponíveis no servidor MCP

### Benefícios
- Acesso a uma vasta biblioteca de piadas brasileiras
- Capacidade de personalizar as piadas com base no feedback do usuário
- Respostas contextualmente relevantes e engraçadas
- Experiência de usuário autenticamente brasileira