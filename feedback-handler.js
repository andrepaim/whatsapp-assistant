const { recordFeedback: recordLangSmithFeedback } = require('./langsmith-integration.js'); // Rename for clarity

/**
 * Map of chat IDs to their most recent LangSmith run IDs
 * This allows us to associate feedback with the correct run in LangSmith
 */
const chatLangSmithRunMap = new Map();

/**
 * Map of chat IDs to the ID of the last joke told in that chat
 */
const chatLastJokeIdMap = new Map();

/**
 * Store the run ID for a specific chat
 * @param {string} chatId - The chat ID
 * @param {string} runId - The LangSmith run ID
 */
function storeRunId(chatId, runId) {
  chatLangSmithRunMap.set(chatId, runId);
  console.log(`Stored LangSmith run ID ${runId} for chat ${chatId}`);
}

/**
 * Get the most recent run ID for a specific chat
 * @param {string} chatId - The chat ID
 * @returns {string|null} - The LangSmith run ID or null if not found
 */
function getRunId(chatId) {
  return chatLangSmithRunMap.get(chatId) || null;
}

/**
 * Store the last joke ID for a specific chat
 * @param {string} chatId - The chat ID
 * @param {string} jokeId - The joke ID
 */
function storeJokeIdForChat(chatId, jokeId) {
  chatLastJokeIdMap.set(chatId, jokeId);
  console.log(`Stored last joke ID ${jokeId} for chat ${chatId}`);
}

/**
 * Get the last joke ID for a specific chat
 * @param {string} chatId - The chat ID
 * @returns {string|null} - The joke ID or null if not found
 */
function getJokeIdForChat(chatId) {
  const jokeId = chatLastJokeIdMap.get(chatId) || null;
  if (jokeId) {
    console.log(`Retrieved last joke ID ${jokeId} for chat ${chatId}`);
  } else {
    console.log(`No last joke ID found for chat ${chatId}`);
  }
  return jokeId;
}

/**
 * Process user feedback message and record it in LangSmith.
 * This function primarily checks if a message looks like feedback for LangSmith logging.
 * The actual handling of feedback (like calling the MCP tool) should be done by the agent based on history and system prompt.
 * @param {string} message - The user's message.
 * @param {string} chatId - The chat ID.
 * @returns {Promise<{isFeedback: boolean, feedbackType: string|null}>} - Object indicating if feedback was detected and its type.
 */
async function processFeedback(message, chatId) { // Removed jokeId and mcpClient params
  const result = { isFeedback: false, feedbackType: null }; // Removed 'recorded' field

  // Get the LangSmith run ID for this chat for LangSmith feedback
  const langsmithRunId = getRunId(chatId);
  if (!langsmithRunId) {
    console.log(`No LangSmith run ID found for chat ${chatId}, cannot record LangSmith feedback`);
    // Continue processing for MCP feedback if jokeId is present
  }

  // Normalize message to lowercase
  const normalizedMessage = message.toLowerCase();
  
  // Check for positive feedback patterns
  const positivePatterns = [
    'gostei', 'adorei', 'amei', 'boa', 'legal', 'massa', 'show', 
    'engraçada', 'engraçado', 'ótima', 'ótimo', 'excelente', 'top',
    'curtir', 'curti', 'curtiu', 'curtido', 'kkk', 'haha', 'rs', 'kkkk',
    'sim', 'muito boa', 'muito bom', '😂', '🤣', '😁', '😄', '👍'
  ];
  
  // Check for negative feedback patterns
  const negativePatterns = [
    'não gostei', 'ruim', 'péssima', 'péssimo', 'horrível', 'sem graça',
    'fraca', 'fraco', 'não curti', 'não curtiu', 'não curtido', 'não deu',
    'não', 'não gostou', 'não gostei', 'não achei', 'não foi', 'não é',
    'não está', 'não tá', 'não tem', 'não teve', '👎', '😐', '😕', '😒'
  ];
  
  // Determine feedback type
  // let feedbackType = null; // Use result.feedbackType instead
  
  // Check for positive patterns
  for (const pattern of positivePatterns) {
    if (normalizedMessage.includes(pattern)) {
      result.feedbackType = 'positive';
      break;
    }
  }

  // If not positive, check for negative patterns
  if (!result.feedbackType) {
    for (const pattern of negativePatterns) {
      if (normalizedMessage.includes(pattern)) {
        result.feedbackType = 'negative';
        break;
      }
    }
  }

  // If we determined a feedback type
  if (result.feedbackType) {
    result.isFeedback = true;
    console.log(`Detected ${result.feedbackType} feedback in message: "${message}" for chat ${chatId}`);

    // Record feedback in LangSmith (if run ID is available)
    if (langsmithRunId) {
      try {
        // Use the original LangSmith feedback function
        await recordLangSmithFeedback(langsmithRunId, result.feedbackType, chatId, message);
        console.log(`Successfully recorded ${result.feedbackType} feedback for LangSmith run ${langsmithRunId}`);
      } catch (error) {
        console.error(`Error recording LangSmith feedback: ${error.message}`);
      }
    } else {
       console.log(`No LangSmith run ID found for chat ${chatId}, skipping LangSmith feedback recording.`);
    }
  } else {
    console.log(`No feedback detected in message: "${message}" for chat ${chatId}`);
  }

  return result;
}

module.exports = {
  storeRunId,
  getRunId,
  storeJokeIdForChat, // Export new function
  getJokeIdForChat,   // Export new function
  processFeedback
};
