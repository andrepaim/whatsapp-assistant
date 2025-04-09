const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { generateAsync } = require('stability-client');
const fs = require('fs');
const path = require('path');

// Create images directory if it doesn't exist
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
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
    
    // Generate the image using Stability AI
    const result = await generateAsync({
      prompt: message.body,
      apiKey: process.env.STABILITY_API_KEY,
      height: 1024,
      width: 1024,
      samples: 1,
      engineId: 'stable-diffusion-xl-1024-v1-0'
    });

    // The result contains the image data as a base64 encoded string
    const buffer = Buffer.from(result.artifacts[0].base64, 'base64');
    
    // Save the image locally
    const imagePath = path.join(imagesDir, `image-${Date.now()}.png`);
    fs.writeFileSync(imagePath, buffer);
    
    // Send the image back to the user
    const chat = await message.getChat();
    await chat.sendMessage(`Generated image based on: "${message.body}"`, {
      media: imagePath,
    });
    
    console.log(`Sent image response for: ${message.body}`);
  } catch (error) {
    console.error('Error processing message:', error);
    message.reply('Sorry, I encountered an error generating your image. Please try again later.');
  }
});

// Start the client
client.initialize();