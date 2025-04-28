const fs = require('fs');
const path = require('path');
const { HumanMessage, AIMessage, SystemMessage, ToolMessage } = require('@langchain/core/messages');

const dataDir = path.join(__dirname, 'data');
const historyLimit = parseInt(process.env.CHAT_HISTORY_LIMIT || '20'); // Default to 20 messages



/**
 * Serializes a LangChain message object into a plain JSON object.
 * @param {BaseMessage} message - The LangChain message object.
 * @returns {object} A plain JSON object representing the message.
 */
function serializeMessage(message) {
  // Handle LangChain message objects or plain objects in tests
  if (message && typeof message.toJSON === 'function') {
    const messageJson = message.toJSON();
    return {
      type: message._getType(),
      ...messageJson,
    };
  } else {
    // Plain object with type and content or serialized form
    return message;
  }
}

/**
 * Deserializes a plain JSON object back into a LangChain message object.
 * @param {object} messageData - The plain JSON object representing the message.
 * @returns {BaseMessage | null} The deserialized LangChain message object, or null if type is unknown.
 */
function deserializeMessage(messageData) {
  const { type, kwargs } = messageData;
  const content = kwargs?.content; // Common content field
  const additional_kwargs = kwargs?.additional_kwargs; // Common additional_kwargs field

  switch (type) {
    case 'human':
      return new HumanMessage({ content: content, additional_kwargs: additional_kwargs });
    case 'ai':
      // Handle potential tool calls stored in additional_kwargs
      return new AIMessage({ content: content, additional_kwargs: additional_kwargs });
    case 'system':
      return new SystemMessage({ content: content, additional_kwargs: additional_kwargs });
    case 'tool':
      // ToolMessage needs tool_call_id
      return new ToolMessage({
        content: content,
        tool_call_id: kwargs?.tool_call_id,
        additional_kwargs: additional_kwargs
      });
    default:
      console.warn(`Unknown message type during deserialization: ${type}`);
      return null; // Or handle unknown types as needed
  }
}

/**
 * Loads chat history for a given chat ID from a JSON file.
 * @param {string} chatId - The unique identifier for the chat.
 * @returns {Array<BaseMessage>} An array of LangChain message objects.
 */
function loadChatHistory(chatId) {
  const filePath = path.join(dataDir, `${chatId}.json`);
  console.log(`Attempting to load history from: ${filePath}`);

  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const historyData = JSON.parse(fileContent);
      console.log(`Successfully read history file for ${chatId}. Found ${historyData.length} messages.`);

      // Deserialize messages, filtering out any null results from unknown types
      const deserializedHistory = historyData.map(deserializeMessage).filter(msg => msg !== null);

      // Return last N messages based on historyLimit
      const limitedHistory = deserializedHistory.slice(-historyLimit);
      console.log(`Returning ${limitedHistory.length} messages (limited to ${historyLimit}) for ${chatId}`);
      return limitedHistory;

    } catch (error) {
      console.error(`Error reading or parsing history file for ${chatId}:`, error);
      return []; // Return empty history on error
    }
  } else {
    console.log(`No history file found for ${chatId}. Returning empty history.`);
    return []; // Return empty history if file doesn't exist
  }
}

/**
 * Saves chat history for a given chat ID to a JSON file.
 * @param {string} chatId - The unique identifier for the chat.
 * @param {Array<BaseMessage>} chatHistory - An array of LangChain message objects.
 */
function saveChatHistory(chatId, chatHistory) {
  const filePath = path.join(dataDir, `${chatId}.json`);
  // Ensure data directory exists before saving history
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory for history: ${dataDir}`);
  }
  console.log(`Attempting to save history to: ${filePath}`);
  try {
    console.log(`Saving ${chatHistory.length} messages for ${chatId}`);
    const allData = chatHistory.map(serializeMessage);
    const limitedData = allData.slice(-historyLimit);
    const jsonContent = JSON.stringify(limitedData, null, 2);
    fs.writeFileSync(filePath, jsonContent, 'utf-8');
    console.log(`Successfully saved history file for ${chatId}.`);
  } catch (error) {
    console.error(`Error writing history file for ${chatId}:`, error);
  }
}

module.exports = {
  loadChatHistory,
  saveChatHistory,
};
