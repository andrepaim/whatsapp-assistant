/**
 * This file contains functions for the original logging behavior
 * that were replaced with more verbose logging.
 * 
 * Keep this here for reference in case we need to fix the tests.
 */

// Function to load chat history from file
function loadChatHistory(chatId) {
  const historyFile = path.join(CHAT_HISTORY_DIR, `${chatId}.json`);
  try {
    if (fs.existsSync(historyFile)) {
      const data = fs.readFileSync(historyFile, 'utf8');
      const parsedData = JSON.parse(data);
      
      // Convert plain objects to LangChain message objects
      return parsedData.map(msg => {
        if (msg.type === 'system') {
          return new SystemMessage(msg.content);
        } else if (msg.type === 'human') {
          return new HumanMessage(msg.content);
        } else if (msg.type === 'ai') {
          return new AIMessage(msg.content);
        }
        return null;
      }).filter(msg => msg !== null);
    }
  } catch (error) {
    console.error(`Error loading chat history for ${chatId}:`, error);
  }
  return [];
}

// Function to save chat history to file
function saveChatHistory(chatId, messages) {
  const historyFile = path.join(CHAT_HISTORY_DIR, `${chatId}.json`);
  try {
    // Convert LangChain message objects to serializable objects
    const serializedMessages = messages.map(msg => ({
      type: msg._getType(),
      content: msg.content
    }));
    
    // Limit history to the configured number of messages
    const limitedMessages = serializedMessages.slice(-LLM_CONFIG.chat_history_limit);
    
    fs.writeFileSync(historyFile, JSON.stringify(limitedMessages, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error saving chat history for ${chatId}:`, error);
  }
}

// Function to get response from LLM using LangChain
async function getResponseFromLLM(message, chatId) {
  try {
    // Configure the LLM model
    const llmConfig = {
      modelName: LLM_CONFIG.model,
      temperature: 0.7,
    };
    
    // Add API base URL if provided
    if (LLM_CONFIG.api_base) {
      llmConfig.configuration = {
        baseURL: LLM_CONFIG.api_base,
      };
    }
    
    // Add API key if provided
    if (LLM_CONFIG.api_key) {
      if (LLM_CONFIG.provider === 'openrouter') {
        llmConfig.openAIApiKey = LLM_CONFIG.api_key;
        // Add OpenRouter HTTP headers
        llmConfig.configuration = {
          ...llmConfig.configuration,
          headers: {
            'HTTP-Referer': 'https://whatsapp-assistant',
            'X-Title': 'WhatsApp Assistant'
          }
        };
      } else {
        llmConfig.openAIApiKey = LLM_CONFIG.api_key;
      }
    }
    
    // Initialize the chat model
    const chatModel = new ChatOpenAI(llmConfig);
    
    // Load chat history for this chat
    const chatHistory = loadChatHistory(chatId);
    
    // Always include the system message at the beginning if not already there
    if (chatHistory.length === 0 || chatHistory[0]._getType() !== 'system') {
      chatHistory.unshift(new SystemMessage(LLM_CONFIG.system_prompt));
    }
    
    // Add the new user message
    const userMessage = new HumanMessage(message);
    chatHistory.push(userMessage);
    
    // For LLM, only use the most recent messages within the limit
    const limitedHistory = chatHistory.slice(-LLM_CONFIG.chat_history_limit);
    
    let response;
    
    // If MCP tools are available, use them with the LLM
    if (mcpClient && mcpTools && mcpTools.length > 0) {
      try {
        console.log('Using MCP client with official MultiServerMCPClient implementation');
        
        // Create a chain with the LLM and tools
        const chain = await chatModel.bind({
          tools: mcpTools,
        });
        
        // Invoke the chain with chat history
        response = await chain.invoke(limitedHistory);
      } catch (error) {
        console.error('Error using MCP tools, falling back to standard LLM:', error.message);
        // Fallback to standard LLM if agent fails
        response = await chatModel.invoke(limitedHistory);
      }
    } else {
      // Use the chat model directly without tools
      response = await chatModel.invoke(limitedHistory);
    }
    
    // Add the AI response to history and save
    chatHistory.push(new AIMessage(response.content));
    saveChatHistory(chatId, chatHistory);
    
    return response.content;
  } catch (error) {
    console.error(`Error calling ${LLM_CONFIG.provider} API:`, error.message);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
    
    // If MCP initialization failed during this request, try to reinitialize for next request
    if (LLM_CONFIG.mcp_server_url && (!mcpClient || mcpTools.length === 0)) {
      console.log('Scheduling MCP client reinitialization...');
      setTimeout(initMCPClient, 5000); // Try again in 5 seconds
    }
    
    throw new Error('Failed to get response from LLM');
  }
}