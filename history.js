const fs = require('fs');
const path = require('path');
const { HumanMessage, AIMessage, SystemMessage, ToolMessage } = require('@langchain/core/messages');
const { load } = require("@langchain/core/load"); // Import the load function

const dataDir = path.join(__dirname, 'data');
const historyLimit = parseInt(process.env.CHAT_HISTORY_LIMIT || '20'); // Default to 20 messages



/**
 * Serializes a LangChain message object into a plain JSON object.
 * @param {BaseMessage} message - The LangChain message object.
 * @returns {object | null} A plain JSON object suitable for LangChain's load function, or null if serialization fails.
 */
function serializeMessage(message) {
  // Use LangChain's built-in serialization logic if possible
  // The standard toJSON() often produces the required structure {"lc": 1, "type": "constructor", "id": [...], "kwargs": {...}}
  try {
    if (message && typeof message.toJSON === 'function') {
      const serialized = message.toJSON();
      // Add basic validation if needed, e.g., check for lc, type, id, kwargs
      if (serialized && serialized.lc === 1 && serialized.type === 'constructor' && Array.isArray(serialized.id) && serialized.kwargs) {
        // console.log(`Serialized message: ${JSON.stringify(serialized)}`); // Optional log
        return serialized;
      } else {
        console.error('Serialization Error: message.toJSON() did not produce expected structure:', serialized, 'Original message:', message);
        return null;
      }
    } else {
      console.warn('Serialization Warning: Attempting to serialize non-LangChain message object:', message);
      return null;
    }
  } catch (error) {
    console.error('Serialization Exception:', error, 'Original message:', message);
    return null;
  }
}

/**
 * Deserializes a plain JSON object back into a LangChain message object.
 * @param {object} messageData - The plain JSON object representing the message.
 * @returns {Promise<BaseMessage | null>} A promise resolving to the deserialized LangChain message object, or null if deserialization fails.
 */
async function deserializeMessage(messageData) {
  // Use LangChain's load function for robust deserialization
  try {
    // The `load` function expects the serialized format (e.g., from toJSON)
    const message = await load(JSON.stringify(messageData)); // `load` expects a string
    // Basic check if it's a message type we expect
    if (message && typeof message._getType === 'function') {
      return message;
    } else {
      console.error('Deserialization Error: `load` did not return a valid message object:', message, 'Data:', messageData);
      return null;
    }
  } catch (error) {
    console.error('Deserialization Exception using `load`:', error, 'Data:', messageData);
    return null;
  }
}

/**
 * Loads chat history for a given chat ID from a JSON file.
 * @param {string} chatId - The unique identifier for the chat.
 * @returns {Promise<Array<BaseMessage>>} A promise resolving to an array of LangChain message objects.
 */
async function loadChatHistory(chatId) { // Make the function async
  const filePath = path.join(dataDir, `${chatId}.json`);
  console.log(`Attempting to load history from: ${filePath}`);

  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const historyData = JSON.parse(fileContent);
      console.log(`Successfully read history file for ${chatId}. Found ${historyData.length} raw message objects.`);

      // Deserialize messages asynchronously using the new deserializeMessage function
      const deserializationPromises = historyData.map((msgData, index) => {
        // console.log(`Deserializing message ${index}:`, JSON.stringify(msgData)); // Optional: Log raw data
        return deserializeMessage(msgData); // This now returns a Promise
      });

      // Wait for all promises to resolve
      const resolvedMessages = await Promise.all(deserializationPromises);

      // Filter out any null results from failed deserialization
      const deserializedHistory = resolvedMessages.filter(msg => msg !== null);

      console.log(`Successfully deserialized ${deserializedHistory.length} messages for ${chatId}.`);

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
    console.log(`Attempting to serialize ${chatHistory.length} messages for ${chatId}`);
    // Serialize messages, filtering out any null results from failed serialization
    const allData = chatHistory.map(serializeMessage).filter(data => data !== null);

    console.log(`Successfully serialized ${allData.length} messages for ${chatId}.`);

    // Limit history before saving
    const limitedData = allData.slice(-historyLimit);
    console.log(`Saving ${limitedData.length} messages (limited to ${historyLimit}) for ${chatId}`);

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
