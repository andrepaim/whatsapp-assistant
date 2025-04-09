const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Function to determine appropriate emoji based on message content
function getEmojiForMessage(message) {
  const lowerMsg = message.toLowerCase().trim();
  
  // Greetings
  if (/\b(hi|hello|hey|hola|greetings)\b/.test(lowerMsg)) {
    return '👋';
  }
  
  // Questions
  if (/\?$/.test(lowerMsg) || /\b(what|who|when|where|why|how)\b/.test(lowerMsg)) {
    return '🤔';
  }
  
  // Thanks/Gratitude
  if (/\b(thanks|thank you|thx|ty|gracias|appreciate)\b/.test(lowerMsg)) {
    return '🙏';
  }
  
  // Positive emotions
  if (/\b(happy|glad|excited|yay|good|great|awesome|amazing|love|like)\b/.test(lowerMsg)) {
    return '😊';
  }
  
  // Negative emotions
  if (/\b(sad|upset|angry|mad|bad|terrible|hate|dislike|sucks)\b/.test(lowerMsg)) {
    return '😔';
  }
  
  // Food related
  if (/\b(food|eat|dinner|lunch|breakfast|hungry)\b/.test(lowerMsg)) {
    return '🍔';
  }
  
  // Work related
  if (/\b(work|job|office|meeting|project|deadline)\b/.test(lowerMsg)) {
    return '💼';
  }
  
  // Default response for messages we don't categorize
  return '👍';
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
});

client.on('message', async (message) => {
  try {
    // Only respond to messages that aren't from the bot itself
    if (message.fromMe) return;

    console.log(`Received message: ${message.body}`);
    
    // Get appropriate emoji based on message content
    const emoji = getEmojiForMessage(message.body);
    
    // Send emoji response
    await message.reply(emoji);
    
    console.log(`Sent emoji response for: ${message.body}`);
  } catch (error) {
    console.error('Error processing message:', error);
    message.reply('Sorry, I encountered an error. Please try again later.');
  }
});

// Start the client
client.initialize();