# WhatsApp Image Generation Bot

A WhatsApp bot that generates images based on text prompts using Stability AI.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Set your Stability AI API key:
   ```
   export STABILITY_API_KEY=your_api_key_here
   ```

3. Start the bot:
   ```
   npm start
   ```

4. Scan the QR code with your WhatsApp mobile app:
   - Open WhatsApp on your phone
   - Tap Menu or Settings and select "Linked Devices"
   - Tap "Link a Device"
   - Point your phone at the QR code displayed in the terminal

## Usage

- Send any text message to the bot, and it will generate an image based on your message using Stability AI
- The bot will reply with the generated image

## Requirements

- Node.js v16 or higher
- A Stability AI API key (sign up at https://stability.ai/)
- WhatsApp account

## Notes

This bot uses:
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) for WhatsApp integration
- [Stability AI](https://stability.ai/) for image generation