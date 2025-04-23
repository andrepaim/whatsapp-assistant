FROM node:18-slim

LABEL maintainer="ZueiraBOT Team"
LABEL description="Bot de piadas brasileiro para WhatsApp com integração MCP"

WORKDIR /app

# Install Chromium dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    libglib2.0-0 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Create data directory for persistent storage if it doesn't exist
RUN mkdir -p data

# Create WhatsApp session directory if it doesn't exist
RUN mkdir -p .wwebjs_auth

# Volume mount points for persistent data
VOLUME ["/app/data", "/app/.wwebjs_auth"]

# Expose the default port if needed
# EXPOSE 3000

# Set environment variables with defaults
ENV LLM_PROVIDER=openrouter \
    LLM_MODEL=openai/gpt4.1-nano \
    LLM_API_BASE=https://openrouter.ai/api/v1 \
    CHAT_HISTORY_LIMIT=20 \
    PUPPETEER_ARGS="--no-sandbox" \
    MCP_SERVER_URL=""

# Run the application
CMD ["npm", "start"]