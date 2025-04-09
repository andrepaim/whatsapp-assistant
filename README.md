# WhatsApp Emoji Bot

A WhatsApp bot that responds to your messages with contextually appropriate emojis.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Start the bot:
   ```
   npm start
   ```

3. Scan the QR code with your WhatsApp mobile app:
   - Open WhatsApp on your phone
   - Tap Menu or Settings and select "Linked Devices"
   - Tap "Link a Device"
   - Point your phone at the QR code displayed in the terminal

## Usage

- Send any text message to the bot, and it will reply with a contextually appropriate emoji
- Examples:
  - "Hello" → 👋
  - "How are you?" → 🤔
  - "Thank you" → 🙏
  - "I'm happy today" → 😊

## Requirements

- Node.js v16 or higher
- WhatsApp account

## Notes

This bot uses:
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) for WhatsApp integration