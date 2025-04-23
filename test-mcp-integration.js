/**
 * Test script for verifying MCP integration with the official LangChain MCP adapter library
 */
require('dotenv').config();

const { MultiServerMCPClient } = require('@langchain/mcp-adapters');
const { ChatOpenAI } = require('@langchain/openai');

// Test function to verify MCP client functionality
async function testMCPIntegration() {
  try {
    // Get MCP server URL from environment
    const mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:8000';
    console.log(`Testing MCP integration with server URL: ${mcpServerUrl}`);
    
    // Initialize the MCP client
    const mcpClient = new MultiServerMCPClient({
      throwOnLoadError: false,
      mcpServers: {
        joke: {
          transport: "sse",
          url: mcpServerUrl,
          useNodeEventSource: true, // Use Node.js EventSource for better header support
          reconnect: {
            enabled: true,
            maxAttempts: 3,
            delayMs: 1000
          }
        }
      }
    });
    
    // Fetch available tools
    console.log('Fetching available tools...');
    const tools = await mcpClient.getTools();
    console.log(`Fetched ${tools.length} tools from MCP server`);
    
    if (tools.length === 0) {
      console.log('No tools available. Check if MCP server is running and has tools registered.');
      return;
    }
    
    // Print available tools
    console.log('\nAvailable tools:');
    tools.forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description || 'No description'}`);
    });
    
    // Initialize the LLM
    console.log('\nInitializing LLM...');
    
    const llmConfig = {
      modelName: process.env.LLM_MODEL || 'openai/gpt4.1-nano',
      temperature: 0.7,
    };
    
    // Add API base URL if provided
    if (process.env.LLM_API_BASE) {
      llmConfig.configuration = {
        baseURL: process.env.LLM_API_BASE,
      };
    }
    
    // Add API key if provided
    if (process.env.LLM_API_KEY) {
      llmConfig.openAIApiKey = process.env.LLM_API_KEY;
    }
    
    const llm = new ChatOpenAI(llmConfig);
    
    // Bind tools to the LLM
    console.log('Creating LLM with tools...');
    const llmWithTools = llm.bind({
      tools: tools,
    });
    
    // Test message for tool use
    const messages = [
      { role: "system", content: "You are a helpful assistant with access to tools." },
      { role: "user", content: "Tell me a joke about cats" }
    ];
    
    console.log('\nSending test message to LLM with tools...');
    console.log(`Message: "${messages[1].content}"`);
    
    // Invoke the LLM with tools
    const response = await llmWithTools.invoke(messages);
    
    console.log('\nResponse from LLM:');
    console.log(response.content);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error testing MCP integration:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testMCPIntegration();