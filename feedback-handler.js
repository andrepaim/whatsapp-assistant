const { recordFeedback } = require('./langsmith-integration.js');

/**
 * Map of chat IDs to their most recent LangSmith run IDs
 * This allows us to associate feedback with the correct run
 */
const chatRunMap = new Map();

/**
 * Store the run ID for a specific chat
 * @param {string} chatId - The chat ID
 * @param {string} runId - The LangSmith run ID
 */
function storeRunId(chatId, runId) {
  chatRunMap.set(chatId, runId);
  console.log(`Stored run ID ${runId} for chat ${chatId}`);
}

/**
 * Get the most recent run ID for a specific chat
 * @param {string} chatId - The chat ID
 * @returns {string|null} - The run ID or null if not found
 */
function getRunId(chatId) {
  return chatRunMap.get(chatId) || null;
}

/**
 * Process user feedback message and record it in LangSmith
 * @param {string} message - The user's message
 * @param {string} chatId - The chat ID
 * @returns {boolean} - Whether feedback was processed
 */
async function processFeedback(message, chatId) {
  // Get the run ID for this chat
  const runId = getRunId(chatId);
  if (!runId) {
    console.log(`No run ID found for chat ${chatId}, cannot process feedback`);
    return false;
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
  let feedbackType = null;
  
  // Check for positive patterns
  for (const pattern of positivePatterns) {
    if (normalizedMessage.includes(pattern)) {
      feedbackType = 'positive';
      break;
    }
  }
  
  // If not positive, check for negative patterns
  if (!feedbackType) {
    for (const pattern of negativePatterns) {
      if (normalizedMessage.includes(pattern)) {
        feedbackType = 'negative';
        break;
      }
    }
  }
  
  // If we determined a feedback type, record it
  if (feedbackType) {
    console.log(`Detected ${feedbackType} feedback in message: "${message}"`);
    
    try {
      await recordFeedback(runId, feedbackType, chatId, message);
      console.log(`Successfully recorded ${feedbackType} feedback for run ${runId}`);
      return true;
    } catch (error) {
      console.error(`Error recording feedback: ${error.message}`);
      return false;
    }
  }
  
  // No feedback detected
  return false;
}

module.exports = {
  storeRunId,
  getRunId,
  processFeedback
};
