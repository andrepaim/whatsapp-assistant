const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// LLM configuration (with defaults)
const LLM_CONFIG = {
  model: process.env.LLM_MODEL || 'llama3.2:3b',
  ollama_url: process.env.OLLAMA_URL || 'http://localhost:11434',
  system_prompt: process.env.SYSTEM_PROMPT || 'You are a humorous assistant responding to WhatsApp messages. Always respond with a joke that\'s contextually relevant to the user\'s message. Try to identify the language the user is writing in and respond in the same language. Keep responses concise and entertaining.'
};

// Function to get response from local LLM using Ollama
async function getResponseFromLLM(message) {
  try {
    const response = await axios.post(`${LLM_CONFIG.ollama_url}/api/chat`, {
      model: LLM_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: LLM_CONFIG.system_prompt
        },
        {
          role: 'user',
          content: message
        }
      ],
      stream: false
    });
    
    return response.data.message.content;
  } catch (error) {
    console.error('Error calling Ollama API:', error.message);
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
  console.log(`Using LLM model: ${LLM_CONFIG.model}`);
});

client.on('message', async (message) => {
  try {
    // Only respond to messages that aren't from the bot itself
    if (message.fromMe) return;

    // Check if the message has a body (text content)
    if (!message.body || message.hasMedia) {
      await message.reply('I can only respond to text messages for now.');
      console.log('Received a media message, informed user about text-only capability');
      return;
    }

    console.log(`Received message: ${message.body}`);
    
    // Tell user we're processing their message
    const chat = await message.getChat();
    chat.sendStateTyping();
    
    // Get response from LLM
    const response = await getResponseFromLLM(message.body);
    
    // Send LLM response
    await message.reply(response);
    
    console.log(`Sent LLM response for: ${message.body}`);
  } catch (error) {
    console.error('Error processing message:', error);
    message.reply('Sorry, I encountered an error. Please try again later.');
  }
});

// Start the client
client.initialize();