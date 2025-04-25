/**
 * LangSmith Traceability Demo
 * 
 * This script demonstrates how to use LangSmith for tracing LLM interactions
 * and collecting feedback in a standalone application.
 * 
 * To run this demo:
 * 1. Set up your .env file with LangSmith credentials
 * 2. Run: node examples/langsmith-demo.js
 */

require('dotenv').config();
const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { Client: LangSmithClient } = require('langsmith');
const { v4: uuidv4 } = require('uuid');

// Check if LangSmith environment variables are set
if (!process.env.LANGCHAIN_API_KEY) {
  console.error('Error: LANGCHAIN_API_KEY is not set in .env file');
  console.error('Please set up your LangSmith credentials before running this demo');
  process.exit(1);
}

// Configure LangSmith project
const PROJECT_NAME = process.env.LANGCHAIN_PROJECT || 'langsmith-demo';

/**
 * Record feedback for a specific run
 */
async function recordFeedback(runId, score, comment = '') {
  try {
    const langsmith = new LangSmithClient();
    
    await langsmith.createFeedback(runId, {
      key: "user_rating",
      value: score, // Numeric score (e.g., 0-1)
      comment
    });
    
    console.log(`Feedback recorded for run ${runId}`);
  } catch (error) {
    console.error("Error recording feedback:", error);
  }
}

/**
 * Create a dataset for testing
 */
async function createDataset(datasetName, examples) {
  try {
    const langsmith = new LangSmithClient();
    
    // Create a dataset
    const dataset = await langsmith.createDataset(datasetName, {
      description: "Example dataset for testing"
    });
    
    // Add examples
    for (const example of examples) {
      await langsmith.createExample({
        dataset_id: dataset.id,
        inputs: example.inputs,
        outputs: example.outputs
      });
    }
    
    console.log(`Dataset created with ID: ${dataset.id}`);
    return dataset;
  } catch (error) {
    console.error("Error creating dataset:", error);
    throw error;
  }
}

/**
 * Trace an LLM interaction
 */
async function tracedLLMCall(message, systemPrompt = "You are a helpful assistant.") {
  // Generate a unique run ID
  const runId = uuidv4();
  console.log(`Starting LLM call with run ID: ${runId}`);
  
  try {
    // Configure the LLM with tracing enabled
    // LangChain will automatically trace this call if LANGCHAIN_TRACING_V2=true
    const model = new ChatOpenAI({
      modelName: "gpt-3.5-turbo", // Use your preferred model
      temperature: 0.7,
      openAIApiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY
    });
    
    // Create messages
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(message)
    ];
    
    // Call the LLM
    console.log(`Sending message to LLM: "${message}"`);
    const response = await model.invoke(messages);
    console.log(`Completed LLM call with run ID: ${runId}`);
    
    return { response: response.content, runId };
  } catch (error) {
    console.error(`Error in LLM call with run ID ${runId}:`, error.message);
    throw error;
  }
}

/**
 * Main demo function
 */
async function runDemo() {
  console.log("Starting LangSmith traceability demo...");
  console.log(`Using project: ${PROJECT_NAME}`);
  
  try {
    // Example 1: Simple traced LLM call
    console.log("\n=== Example 1: Simple Traced LLM Call ===");
    const result1 = await tracedLLMCall(
      "What are the top 3 benefits of using LangSmith for LLM application development?"
    );
    console.log("LLM Response:", result1.response);
    console.log("Run ID:", result1.runId);
    
    // Example 2: Record feedback for the run
    console.log("\n=== Example 2: Recording Feedback ===");
    await recordFeedback(
      result1.runId, 
      1.0, // Positive feedback (1.0)
      "Great response that clearly explains LangSmith benefits"
    );
    
    // Example 3: Create a dataset
    console.log("\n=== Example 3: Creating a Dataset ===");
    await createDataset("langsmith-examples", [
      {
        inputs: { 
          question: "What is LangSmith?" 
        },
        outputs: { 
          answer: "LangSmith is a developer platform for building, testing and monitoring LLM applications." 
        }
      },
      {
        inputs: { 
          question: "How does tracing work in LangSmith?" 
        },
        outputs: { 
          answer: "LangSmith tracing captures inputs, outputs, and metadata for each step in your LLM application." 
        }
      }
    ]);
    
    // Example 4: Traced LLM call with custom system prompt
    console.log("\n=== Example 4: Custom System Prompt ===");
    const result2 = await tracedLLMCall(
      "Explain how to implement traceability in an LLM application.",
      "You are an expert software engineer specializing in LLM application development. Provide detailed, technical answers with code examples when appropriate."
    );
    console.log("LLM Response:", result2.response);
    
    console.log("\nDemo completed successfully!");
    console.log("Visit the LangSmith dashboard to see the traces and feedback:");
    console.log(`https://smith.langchain.com/projects/${encodeURIComponent(PROJECT_NAME)}`);
  } catch (error) {
    console.error("Demo failed with error:", error);
  }
}

// Run the demo
runDemo();
