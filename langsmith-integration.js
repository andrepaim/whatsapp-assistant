const { Client: LangSmithClient } = require("langsmith");
const { v4: uuidv4 } = require('uuid');

/**
 * Initialize LangSmith based on environment variables
 * @returns {boolean} Whether LangSmith is enabled
 */
function initLangSmith() {
  const isEnabled = process.env.LANGCHAIN_TRACING_V2 === 'true';
  
  if (isEnabled) {
    console.log('LangSmith tracing is enabled');
    console.log(`LangSmith project: ${process.env.LANGCHAIN_PROJECT || 'default'}`);
    
    // Validate required environment variables
    if (!process.env.LANGCHAIN_API_KEY) {
      console.warn('WARNING: LANGCHAIN_API_KEY is not set. LangSmith tracing may not work correctly.');
    }
    
    if (!process.env.LANGCHAIN_ENDPOINT) {
      console.log('Using default LangSmith endpoint: https://api.smith.langchain.com');
    }
  } else {
    console.log('LangSmith tracing is disabled');
  }
  
  return isEnabled;
}

/**
 * Create a LangSmith client instance
 * @returns {LangSmithClient} - The LangSmith client
 */
function getLangSmithClient() {
  return new LangSmithClient();
}

/**
 * Record user feedback for a specific run
 * @param {string} runId - The ID of the run to associate feedback with
 * @param {string} feedback - The feedback value ("positive" or "negative")
 * @param {string} chatId - The chat ID
 * @param {string} comment - Optional comment about the feedback
 * @returns {Promise<void>}
 */
async function recordFeedback(runId, feedback, chatId, comment = '') {
  try {
    const langsmith = getLangSmithClient();
    
    const score = feedback === "positive" ? 1 : 0;
    
    await langsmith.createFeedback(runId, "user_rating", {
      score: score,
      value: score,
      comment: comment || `Feedback from chat ${chatId}`,
      sourceInfo: {
        source_type: "whatsapp",
        chat_id: chatId
      }
    });
    
    console.log(`Feedback recorded for run ${runId}`);
  } catch (error) {
    console.error("Error recording feedback:", error);
  }
}

/**
 * Create a dataset of joke requests and responses for testing
 * @param {string} datasetName - Name of the dataset
 * @param {Array<Object>} examples - Array of examples with inputs and outputs
 * @returns {Promise<Object>} - The created dataset
 */
async function createJokeDataset(datasetName, examples = []) {
  try {
    const langsmith = getLangSmithClient();
    
    // Create a dataset
    const dataset = await langsmith.createDataset(datasetName, {
      description: "Joke requests and their responses"
    });
    
    // Add examples if provided
    if (examples && examples.length > 0) {
      for (const example of examples) {
        await langsmith.createExample({
          dataset_id: dataset.id,
          inputs: example.inputs,
          outputs: example.outputs
        });
      }
    }
    
    console.log(`Dataset created with ID: ${dataset.id}`);
    return dataset;
  } catch (error) {
    console.error("Error creating dataset:", error);
    throw error;
  }
}

/**
 * Wrap a function with LangSmith tracing
 * @param {Function} fn - The function to wrap
 * @param {string} name - Name for the trace
 * @param {Object} metadata - Metadata to include with the trace
 * @param {Array<string>} tags - Tags to associate with the trace
 * @param {Function} onRunCreated - Optional callback when a run is created, receives (runId, ...args)
 * @returns {Function} - The wrapped function
 */
function withTracing(fn, name, metadata = {}, tags = [], onRunCreated = null) {
  return async (...args) => {
    // Skip tracing if LangSmith is disabled
    if (process.env.LANGCHAIN_TRACING_V2 !== 'true') {
      return fn(...args);
    }
    
    // Generate a unique run ID
    const runId = uuidv4();
    
    // Call the onRunCreated callback if provided
    if (onRunCreated && typeof onRunCreated === 'function') {
      onRunCreated(runId, ...args);
    }
    
    try {
      console.log(`Starting trace for ${name} with run ID: ${runId}`);
      
      // Execute the original function
      const result = await fn(...args);
      
      console.log(`Completed trace for ${name} with run ID: ${runId}`);
      
      return result;
    } catch (error) {
      console.error(`Error in traced function ${name}: ${error.message}`);
      throw error;
    }
  };
}

module.exports = {
  initLangSmith,
  getLangSmithClient,
  recordFeedback,
  createJokeDataset,
  withTracing
};