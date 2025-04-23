#!/usr/bin/env node

/**
 * Test script for LangChain MCP client
 * 
 * Usage: 
 *   node mcp-test.js <mcp-server-url>
 * 
 * Example:
 *   node mcp-test.js http://localhost:8000
 */

const { MultiServerMCPClient } = require('@langchain/mcp-adapters');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { ChatOpenAI } = require('@langchain/openai');

async function main() {
  const serverUrl = process.argv[2] || 'http://localhost:8000';
  
  console.log(`Testing MCP client with server URL: ${serverUrl}`);
  
  try {
    // Create client
    const client = new MultiServerMCPClient({
      throwOnLoadError: false,
      mcpServers: {
        joke: {
          transport: "sse",
          url: serverUrl,
          useNodeEventSource: true,
          reconnect: {
            enabled: true,
            maxAttempts: 3,
            delayMs: 1000
          }
        }
      }
    });
    
    // Fetch tools
    console.log('Fetching tools...');
    const tools = await client.getTools();
    console.log(`Found ${tools.length} tools:`);
    
    // Log tool names
    tools.forEach((tool, i) => {
      console.log(`  ${i+1}. ${tool.name} - ${tool.description || 'No description'}`);
    });
    
    if (tools.length === 0) {
      console.log('No tools found. Exiting.');
      return;
    }
    
    // Create a fake LLM for testing
    console.log('\nCreating test LLM...');
    const dummyLLM = new ChatOpenAI({
      // Will be intercepted by our bindings, so we don't need real credentials
      modelName: "gpt-4",
      temperature: 0.7
    });
    
    // Bind tools to the LLM
    console.log('Creating LLM with tools...');
    const llmWithTools = dummyLLM.bind({
      tools: tools,
    });
    
    // Invoke the LLM with a test message about jokes
    console.log('\nInvoking LLM with a simple message...');
    
    const messages = [
      new SystemMessage('Você é o ZueiraBOT, um bot de piadas brasileiro.'),
      new HumanMessage('Me conta uma piada sobre cachorro')
    ];
    
    const response = await llmWithTools.invoke(messages);
    
    console.log('\nResponse:');
    console.log('---------------------------------------');
    console.log(response.content);
    console.log('---------------------------------------');
    
    console.log('\nTest completed successfully!');
    
    // Clean up
    await client.close();
  } catch (error) {
    console.error('Error during test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();