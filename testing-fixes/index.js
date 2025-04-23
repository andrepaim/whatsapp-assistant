/**
 * This file contains the original client initialization and message handlers
 * that were replaced with more verbose logging.
 * 
 * Keep this here for reference in case we need to fix the tests.
 */

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: process.env.PUPPETEER_ARGS ? process.env.PUPPETEER_ARGS.split(' ') : []
  }
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