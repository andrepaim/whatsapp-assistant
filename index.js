const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const dotenv = require('dotenv');
const { ChatOpenAI } = require('@langchain/openai');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const fs = require('fs');
const path = require('path');
const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');

// Load environment variables
dotenv.config();

// LLM configuration (with defaults)
const LLM_CONFIG = {
  provider: process.env.LLM_PROVIDER || 'openrouter',
  model: process.env.LLM_MODEL || 'openai/gpt4.1-nano',
  api_base: process.env.LLM_API_BASE || 'https://openrouter.ai/api/v1',
  api_key: process.env.LLM_API_KEY || '',
  system_prompt: require('./system-prompt.js'),
  chat_history_limit: parseInt(process.env.CHAT_HISTORY_LIMIT || '20')
};
console.log(`LLM provider: ${LLM_CONFIG.provider}, model: ${LLM_CONFIG.model}, key: ${LLM_CONFIG.api_key}`);

// Chat history storage
const CHAT_HISTORY_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(CHAT_HISTORY_DIR)) {
  fs.mkdirSync(CHAT_HISTORY_DIR, { recursive: true });
}

// Function to load chat history from file
function loadChatHistory(chatId) {
  const historyFile = path.join(CHAT_HISTORY_DIR, `${chatId}.json`);
  try {
    if (fs.existsSync(historyFile)) {
      const data = fs.readFileSync(historyFile, 'utf8');
      const parsedData = JSON.parse(data);
      
      // Convert plain objects to LangChain message objects
      return parsedData.map(msg => {
        if (msg.type === 'system') {
          return new SystemMessage(msg.content);
        } else if (msg.type === 'human') {
          return new HumanMessage(msg.content);
        } else if (msg.type === 'ai') {
          return new AIMessage(msg.content);
        }
        return null;
      }).filter(msg => msg !== null);
    }
  } catch (error) {
    console.error(`Error loading chat history for ${chatId}:`, error);
  }
  return [];
}

// Function to save chat history to file
function saveChatHistory(chatId, messages) {
  const historyFile = path.join(CHAT_HISTORY_DIR, `${chatId}.json`);
  try {
    // Convert LangChain message objects to serializable objects
    const serializedMessages = messages.map(msg => ({
      type: msg._getType(),
      content: msg.content
    }));
    
    // Limit history to the configured number of messages
    const limitedMessages = serializedMessages.slice(-LLM_CONFIG.chat_history_limit);
    
    fs.writeFileSync(historyFile, JSON.stringify(limitedMessages, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error saving chat history for ${chatId}:`, error);
  }
}

// Function to get response from LLM using LangChain
async function getResponseFromLLM(message, chatId) {
  try {
    // Configure the LLM model
    const llmConfig = {
      modelName: LLM_CONFIG.model,
      temperature: 0.7,
    };
    
    // Add API base URL if provided
    if (LLM_CONFIG.api_base) {
      llmConfig.configuration = {
        baseURL: LLM_CONFIG.api_base,
      };
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
      } else {
        llmConfig.openAIApiKey = LLM_CONFIG.api_key;
      }
    }
    
    // Initialize the chat model
    const chatModel = new ChatOpenAI(llmConfig);
    
    // Load chat history for this chat
    const chatHistory = loadChatHistory(chatId);
    
    // Always include the system message at the beginning if not already there
    if (chatHistory.length === 0 || chatHistory[0]._getType() !== 'system') {
      chatHistory.unshift(new SystemMessage(LLM_CONFIG.system_prompt));
    }
    
    // Add the new user message
    const userMessage = new HumanMessage(message);
    chatHistory.push(userMessage);
    
    // For LLM, only use the most recent messages within the limit
    const limitedHistory = chatHistory.slice(-LLM_CONFIG.chat_history_limit);
    
    // Use the chat model directly with message history
    const response = await chatModel.invoke(limitedHistory);
    
    // Add the AI response to history and save
    chatHistory.push(new AIMessage(response.content));
    saveChatHistory(chatId, chatHistory);
    
    return response.content;
  } catch (error) {
    console.error(`Error calling ${LLM_CONFIG.provider} API:`, error.message);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
    throw new Error('Failed to get response from LLM');
  }
}

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
});

// Generate QR code for WhatsApp Web
client.on('qr', (qr) => {
  console.log('QR RECEIVED. Scan with your phone:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('WhatsApp client is ready!');
  console.log(`Using LLM provider: ${LLM_CONFIG.provider}, model: ${LLM_CONFIG.model}`);
});

client.on('message', async (message) => {
  try {
    // Only respond to messages that aren't from the bot itself
    if (message.fromMe) return;

    // Check if the message has a body (text content)
    if (!message.body || message.hasMedia) {
      const chat = await message.getChat();
      await chat.sendMessage('I can only respond to text messages for now.');
      console.log('Received a media message, informed user about text-only capability');
      return;
    }

    console.log(`Received message: ${message.body}`);
    
    // Tell user we're processing their message
    const chat = await message.getChat();
    chat.sendStateTyping();
    
    // Generate a unique ID for this chat to use with history
    // For WhatsApp, we use the chat ID as the unique identifier
    const chatId = chat.id._serialized;
    
    // Get response from LLM with chat history context
    const response = await getResponseFromLLM(message.body, chatId);
    
    // Send LLM response - use a direct message rather than reply
    // This avoids issues with quoted messages that might not exist
    await chat.sendMessage(response);
    
    console.log(`Sent LLM response for: ${message.body} - answer: ${response}`);
  } catch (error) {
    console.error('Error processing message:', error);
    try {
      // Try to send a direct message instead of a reply
      const chat = await message.getChat();
      await chat.sendMessage('Sorry, I encountered an error. Please try again later.');
    } catch (secondError) {
      console.error('Failed to send error message:', secondError);
    }
  }
});

// Start the client
client.initialize();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    getResponseFromLLM,
    loadChatHistory,
    saveChatHistory
  };
}
