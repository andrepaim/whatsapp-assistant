const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const dotenv = require('dotenv');
const { ChatOpenAI } = require('@langchain/openai');
const path = require('path'); // Keep path for system prompt require
const { HumanMessage, AIMessage, SystemMessage, ToolMessage } = require('@langchain/core/messages');
const { Client : MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
const { loadChatHistory, saveChatHistory } = require('./history.js'); // Import history functions
const { createReactAgent }  = require("@langchain/langgraph/prebuilt");
const { MultiServerMCPClient } = require('@langchain/mcp-adapters');
const { initLangSmith, withTracing } = require('./langsmith-integration.js');
const { storeRunId, processFeedback } = require('./feedback-handler.js');


// Load environment variables
dotenv.config();

// Initialize LangSmith tracing
initLangSmith();

// LLM configuration (with defaults)
const LLM_CONFIG = {
  provider: process.env.LLM_PROVIDER || 'openrouter',
  model: process.env.LLM_MODEL || 'openai/gpt4.1-nano',
  api_base: process.env.LLM_API_BASE || 'https://openrouter.ai/api/v1',
  api_key: process.env.LLM_API_KEY || '',
  system_prompt: require('./system-prompt.js'),
  mcp_server_url: process.env.MCP_SERVER_URL || ''
};

// Chat history storage and functions are now in history.js

// Initialize MCP client and tools
let mcpClient = null;
let mcpTools = [];

// Initialize MCP client if MCP server URL is provided
async function initMCPClient() {
  if (LLM_CONFIG.mcp_server_url) {
    try {
      console.log(`MCP INIT: Starting with server URL: ${LLM_CONFIG.mcp_server_url}`);
      
      // If MCP_SERVER_URL is set but server is not available, 
      // we don't want to block the application from starting
      try {
        console.log(`Initializing MCP client with server URL: ${LLM_CONFIG.mcp_server_url}`);
        mcpClient = new MultiServerMCPClient({
            mcpServers : {
              joke : {
                transport: 'sse', // Server-Sent Events transport
                url: LLM_CONFIG.mcp_server_url,
              }
            }
        });
        
        // Fetch available tools from the MCP server
        mcpTools = await mcpClient.getTools();
        console.log(`Loaded ${mcpTools.length} tools from MCP server`);
        
        if (mcpTools && mcpTools.length > 0) {
          console.log(`MCP SUCCESS: Loaded ${mcpTools.length} tools`);
          // Log tool names for debugging
          mcpTools.forEach((tool, index) => {
            console.log(`  Tool ${index + 1}: ${tool.name} - ${tool.description.substring(0, 50)}...`);
          });
        } else {
          console.warn('MCP WARNING: Server connected but no tools were loaded');
        }
      } catch (error) {
        // Handle errors more gracefully - MCP server might not be running
        console.error('MCP ERROR: Failed to initialize client:', error.message || error);
        console.error('Error stack:', error.stack);
        
        // Clear MCP resources so we don't attempt to use them
        mcpClient = null;
        mcpTools = [];
      }
    } catch (error) {
      console.error('MCP CRITICAL ERROR: Unexpected error in initialization:', error.message || error);
      console.error('Error stack:', error.stack);
      mcpClient = null;
      mcpTools = [];
    }
  } else {
    console.log('MCP INFO: No MCP server URL provided, skipping initialization');
  }
}

// Call initMCPClient during startup
initMCPClient();

// Function to get response from LLM using LangChain
// Define the base function that will be wrapped with tracing
async function _getResponseFromLLM(message, chatId) {
  try {
    console.log(`LLM REQUEST - Chat ID: ${chatId}, Message: "${message}"`);
    
    // Configure the LLM model
    const llmConfig = {
      modelName: LLM_CONFIG.model,
      temperature: 0.7,
    };
    
    console.log(`LLM CONFIG - Provider: ${LLM_CONFIG.provider}, Model: ${LLM_CONFIG.model}`);
    
    // Add API base URL if provided
    if (LLM_CONFIG.api_base) {
      llmConfig.configuration = {
        baseURL: LLM_CONFIG.api_base,
      };
      console.log(`Using API base URL: ${LLM_CONFIG.api_base}`);
    }
    
    // Add API key if provided
    if (LLM_CONFIG.api_key) {
      if (LLM_CONFIG.provider === 'openrouter') {
        llmConfig.openAIApiKey = LLM_CONFIG.api_key;
        // Add OpenRouter HTTP headers
        llmConfig.configuration = {
          ...llmConfig.configuration,
          headers: {
            'HTTP-Referer': 'https://whatsapp-assistant',
            'X-Title': 'WhatsApp Assistant'
          }
        };
        console.log('Added OpenRouter-specific headers');
      } else {
        llmConfig.openAIApiKey = LLM_CONFIG.api_key;
      }
      console.log('API key configured (value hidden)');
    } else {
      console.warn('WARNING: No API key provided for LLM');
    }

    let chat
    // Initialize the chat model
    console.log('Initializing ChatOpenAI model');

    // Load chat history for this chat
    console.log(`Loading chat history for ${chatId}`);
    const chatHistory = loadChatHistory(chatId);
    console.log(`Chat history loaded: ${chatHistory.length} messages`);
    
    // Always include the system message at the beginning if not already there
    if (chatHistory.length === 0 || chatHistory[0]._getType() !== 'system') {
      console.log('Adding system prompt to chat history');
      chatHistory.unshift(new SystemMessage(LLM_CONFIG.system_prompt));
    }
    
    // Add the new user message
    console.log('Adding user message to chat history');
    const userMessage = new HumanMessage(message);
    chatHistory.push(userMessage);
    
    // For LLM, only use the most recent messages within the limit defined in history.js
    // Note: We still need to slice here before sending to LLM, but the limit value comes from history.js via process.env
    const historyLimitForLLM = parseInt(process.env.CHAT_HISTORY_LIMIT || '20'); 
    const limitedHistory = chatHistory.slice(-historyLimitForLLM);
    console.log(`Using ${limitedHistory.length} messages in limited history (Limit: ${historyLimitForLLM})`);
    const model = new ChatOpenAI(llmConfig);

    let response;
    if (mcpClient && mcpTools && mcpTools.length > 0) {
      console.log('Using MCP tools with the LLM');
      // Create a React agent with the model and tools
      chatModel = createReactAgent({
        llm: model, 
        tools: mcpTools,
      });
      response = await chatModel.invoke({
        messages: limitedHistory,
      });
      
      // Extract the final content from the response array
      let finalContent = '';
      if (response.messages && Array.isArray(response.messages)) {
        // Find the last AIMessage in the array
        for (let i = response.messages.length - 1; i >= 0; i--) {
          const message = response.messages[i];
          if (message._getType && message._getType() === 'ai') {
            finalContent = message.content;
            console.log('Found AI message content:', finalContent);
            break;
          }
        }
        
        // If no AIMessage was found, try to extract content from the last element
        if (!finalContent && response.messages.length > 0) {
          const lastElement = response.messages[response.messages.length - 1];
          finalContent = lastElement.content || lastElement.output || '';
          console.log('Using last element content:', finalContent);
        }
      } else if (response && response.content) {
        // Handle case where response is a single message
        finalContent = response.content;
        console.log('Using single message content:', finalContent);
      }

      // Add the AI response to chat history
          if (finalContent) {
            const aiMessage = new AIMessage(finalContent);
            chatHistory.push(aiMessage);
          }
          console.log(`Saving updated chat history for ${chatId}`);
          await saveChatHistory(chatId, chatHistory);
          return finalContent;
    } else {
      console.log('No MCP tools available, using standard LLM');
      // Use the model directly without tools
      chatModel = model;
      response = await chatModel.invoke(limitedHistory);
      const finalContent = response?.content ?? ''; // Default to empty string if content is null/undefined
      chatHistory.push(new AIMessage(finalContent)); // Add the LLM response to chat history
      console.log(`Saving updated chat history for ${chatId}`);
      // Pass the potentially modified chatHistory (with tool calls/results)
      await saveChatHistory(chatId, chatHistory); 
      return finalContent; // Return the final content
    }
    } catch (error) {
      // Log errors related to the LLM API call itself or the overall process
      console.error(`Error calling ${LLM_CONFIG.provider} API:`, error.message);
      console.error('Error stack:', error.stack);
      await saveChatHistory(chatId, chatHistory);
      // Save conversation history despite the error
      try { await saveChatHistory(chatId, chatHistory); } catch (e) { console.error('Error saving history after failure:', e); }
    
    if (error.response) {
      console.error('API Error details:', error.response.data);
      console.error('Status code:', error.response.status);
    }
    
    // If MCP initialization failed during this request, try to reinitialize for next request
    if (LLM_CONFIG.mcp_server_url && (!mcpClient || mcpTools.length === 0)) {
      console.log('Scheduling MCP client reinitialization...');
      setTimeout(initMCPClient, 5000); // Try again in 5 seconds
    }
    
    throw new Error(`Failed to get response from LLM: ${error.message}`);
  }
}

// Wrap the function with LangSmith tracing
const getResponseFromLLM = withTracing(
  _getResponseFromLLM,
  "getResponseFromLLM",
  {
    service: "whatsapp-assistant",
    component: "llm-interaction"
  },
  ["whatsapp", "llm", "joke-bot"],
  // Store the run ID for the chat when a trace is created
  (runId, message, chatId) => {
    console.log(`Storing run ID ${runId} for chat ${chatId}`);
    storeRunId(chatId, runId);
  }
);

// Initialize WhatsApp client
console.log('Initializing WhatsApp client...');
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: 'data' }), // Specify the data path
  puppeteer: {
    args: process.env.PUPPETEER_ARGS ? process.env.PUPPETEER_ARGS.split(' ') : []
  }
});

// Log all WhatsApp events for better debugging
client.on('loading_screen', (percent, message) => {
  console.log(`LOADING SCREEN: ${percent}% - ${message}`);
});

client.on('authenticated', () => {
  console.log('AUTHENTICATED: WhatsApp authentication successful');
});

client.on('auth_failure', (message) => {
  console.error('AUTHENTICATION FAILED:', message);
});

// Generate QR code for WhatsApp Web
client.on('qr', (qr) => {
  console.log('QR RECEIVED. Scan with your phone:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
      console.log('WhatsApp client is ready!');
  console.log(`Using LLM provider: ${LLM_CONFIG.provider}, model: ${LLM_CONFIG.model}`);
  
  // Log MCP server status if configured
  if (LLM_CONFIG.mcp_server_url) {
    console.log(`MCP server configured: ${LLM_CONFIG.mcp_server_url}`);
  }
});

client.on('disconnected', (reason) => {
  console.log('DISCONNECTED: WhatsApp client disconnected', reason);
});

client.on('message', async (message) => {
  try {
    // Log detailed message info
    console.log(`MESSAGE RECEIVED - From: ${message.from}, isGroupMsg: ${message.isGroupMsg}, hasMedia: ${message.hasMedia}, type: ${message.type}`);
    
    // Only respond to messages that aren't from the bot itself
    if (message.fromMe) {
      console.log('SKIPPING: Message from myself');
      return;
    }

    // Check if the message has a body (text content)
    if (!message.body || message.hasMedia) {
      console.log(`MEDIA MESSAGE: Received ${message.type} from ${message.from}`);
      const chat = await message.getChat();
      console.log('Getting chat info');
      await chat.sendMessage('I can only respond to text messages for now.');
      console.log('Informed user about text-only capability');
      return;
    }

    console.log(`PROCESSING MESSAGE: "${message.body}" from ${message.from}`);
    
    // Tell user we're processing their message
    const chat = await message.getChat();
    console.log(`Chat obtained: ${chat.id._serialized}, sending typing indicator`);
    chat.sendStateTyping();
    
    // Generate a unique ID for this chat to use with history
    // For WhatsApp, we use the chat ID as the unique identifier
    const chatId = chat.id._serialized;
    console.log(`Using chat ID for history: ${chatId}`);
    
    // Check if this message is feedback to a previous joke
    // This is important for LangSmith traceability
    const isFeedback = await processFeedback(message.body, chatId);
    if (isFeedback) {
      console.log(`Processed feedback for chat ${chatId}`);
      // For feedback messages, we still want to respond, so we continue processing
    }
    
    // Get response from LLM with chat history context
    console.log(`Requesting LLM response for message: "${message.body}"`);
    const response = await getResponseFromLLM(message.body, chatId);
    console.log(`LLM RESPONSE RECEIVED: ${response.length} characters`);
    
    // Send LLM response - use a direct message rather than reply
    // This avoids issues with quoted messages that might not exist
    console.log(`Sending response to ${chat.id._serialized}`);
    await chat.sendMessage(response);
    
    console.log(`SUCCESS: Response sent for message: "${message.body.substring(0, 20)}${message.body.length > 20 ? '...' : ''}"`);
  } catch (error) {
    console.error('ERROR PROCESSING MESSAGE:', error);
    console.error('Error stack:', error.stack);
    
    try {
      // Try to send a direct message instead of a reply
      const chat = await message.getChat();
      console.log(`Sending error message to chat ${chat.id._serialized}`);
      await chat.sendMessage('Sorry, I encountered an error. Please try again later.');
      console.log('Error message sent successfully');
    } catch (secondError) {
      console.error('CRITICAL ERROR: Failed to send error message:', secondError);
      console.error('Second error stack:', secondError.stack);
    }
  }
});

// Start the client
console.log('STARTING: Initializing WhatsApp client...');
client.initialize();
// Note: In production, we would use .catch() for error handling, but 
// removed for test compatibility since the mock doesn't implement Promises

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getResponseFromLLM,
    loadChatHistory,
    saveChatHistory,
    initMCPClient
  };
}
