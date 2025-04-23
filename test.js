const assert = require('assert');
const sinon = require('sinon');

// Mock modules
jest.mock('whatsapp-web.js', () => {
  const mockOn = jest.fn();
  const mockInitialize = jest.fn();
  const mockClient = {
    initialize: mockInitialize,
    on: mockOn
  };
  
  const MockClient = jest.fn(() => mockClient);
  MockClient.mockClient = mockClient;
  
  return {
    Client: MockClient,
    LocalAuth: jest.fn()
  };
});

// Create a mock for qrcode-terminal
const mockGenerate = jest.fn();
jest.mock('qrcode-terminal', () => ({
  generate: mockGenerate
}));

// Mock dotenv to avoid actual loading of .env file
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

// Mock modules related to chat history
jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/'))
}));

// Mock LangChain modules
const mockChatOpenAIInvoke = jest.fn();
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: mockChatOpenAIInvoke
  }))
}));

jest.mock('@langchain/core/messages', () => ({
  HumanMessage: jest.fn(content => ({ content, _getType: () => 'human' })),
  AIMessage: jest.fn(content => ({ content, _getType: () => 'ai' })),
  SystemMessage: jest.fn(content => ({ content, _getType: () => 'system' }))
}));

// Import mocks after they've been set up
const { Client } = require('whatsapp-web.js');
const mockClient = Client.mockClient;

// Tests for index.js
describe('WhatsApp Joke Bot', () => {
  let consoleLogSpy;
  let consoleErrorSpy;
  let mockFs;
  
  // Access the mocked modules
  beforeAll(() => {
    mockFs = require('fs');
  });
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Patch console.log/error first to avoid timestamp issues
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = function() {
      // No timestamp handling in the mock
      return originalLog.apply(this, arguments);
    };
    
    console.error = function() {
      // No timestamp handling in the mock
      return originalError.apply(this, arguments);
    };
    
    // Create spies for console methods that handle timestamps
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((...args) => {
      // If first argument is a timestamp (has date format), skip it
      if (typeof args[0] === 'string' && args[0].match(/^\[\d{4}-\d{2}-\d{2}T/)) {
        return; // Skip the logging
      }
    });
    
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => {
      // If first argument is a timestamp (has date format), skip it
      if (typeof args[0] === 'string' && args[0].match(/^\[\d{4}-\d{2}-\d{2}T/)) {
        return; // Skip the logging
      }
    });
    
    // Reset LangChain mock
    mockChatOpenAIInvoke.mockReset();
    mockChatOpenAIInvoke.mockResolvedValue({ content: 'This is a joke response' });
    
    // Set env variables for tests
    process.env.LLM_PROVIDER = 'openrouter';
    process.env.LLM_MODEL = 'openai/gpt-4.1-nano';
    process.env.LLM_API_BASE = 'https://openrouter.ai/api/v1';
    
    // Load the module under test (this will use our mocked dependencies)
    jest.isolateModules(() => {
      // Override console.log/error during module loading to prevent timestamp issues
      console.log = jest.fn();
      console.error = jest.fn();
      
      require('./index');
      
      // Restore our mocked versions
      console.log = originalLog;
      console.error = originalError;
      
      // Re-apply the spies
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });
  });
  
  afterEach(() => {
    // Restore console spies
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    
    // Reset process.env to avoid test pollution
    delete process.env.LLM_PROVIDER;
    delete process.env.LLM_MODEL;
    delete process.env.LLM_API_BASE;
  });
  
  test('client is initialized on startup', () => {
    expect(Client).toHaveBeenCalled();
    expect(mockClient.initialize).toHaveBeenCalled();
  });
  
  test('QR code is displayed when received', () => {
    // Find the 'qr' callback handler
    const qrHandler = mockClient.on.mock.calls.find(call => call[0] === 'qr');
    expect(qrHandler).toBeTruthy();
    
    // Extract the callback function
    const qrCallback = qrHandler[1];
    
    // Call the callback
    qrCallback('test-qr-data');
    
    // Verify console.log was called
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('QR RECEIVED'));
    
    // Verify qrcode.generate was called
    expect(mockGenerate).toHaveBeenCalledWith('test-qr-data', { small: true });
  });
  
  test('LangChain is called with correct parameters', async () => {
    // Find the 'message' callback handler
    const messageHandler = mockClient.on.mock.calls.find(call => call[0] === 'message');
    expect(messageHandler).toBeTruthy();
    
    // Extract the callback function
    const messageCallback = messageHandler[1];
    
    // Create a mock chat ID for testing
    const mockChatId = 'test-chat-123';
    
    // Create a mock message object
    const mockMessage = {
      body: 'Hello bot',
      fromMe: false,
      hasMedia: false,
      getChat: jest.fn().mockResolvedValue({
        sendMessage: jest.fn().mockResolvedValue({}),
        sendStateTyping: jest.fn(),
        id: { _serialized: mockChatId }
      })
    };
    
    // Call the callback
    await messageCallback(mockMessage);
    
    // Verify LangChain invoke was called with message history array
    expect(mockChatOpenAIInvoke).toHaveBeenCalled();
    
    // First argument should be an array of messages including the user message
    const invokeArg = mockChatOpenAIInvoke.mock.calls[0][0];
    expect(Array.isArray(invokeArg)).toBe(true);
    
    // Check if array contains at least system message and human message
    expect(invokeArg.length).toBeGreaterThanOrEqual(2);
    
    // Find the human message in the array
    const humanMessage = invokeArg.find(msg => msg._getType && msg._getType() === 'human');
    expect(humanMessage).toBeTruthy();
    expect(humanMessage.content).toBe('Hello bot');
    
    // Verify that chat.sendMessage was called with the LLM response
    expect(mockMessage.getChat).toHaveBeenCalled();
    const mockChat = await mockMessage.getChat();
    expect(mockChat.sendMessage).toHaveBeenCalledWith('This is a joke response');
  });
  
  test('bot handles media messages correctly', async () => {
    // Create a mock message with media
    const mockMessage = {
      body: '',
      fromMe: false,
      hasMedia: true,
      getChat: jest.fn().mockResolvedValue({
        sendMessage: jest.fn().mockResolvedValue({}),
        sendStateTyping: jest.fn()
      })
    };
    
    // Find the 'message' callback handler
    const messageHandler = mockClient.on.mock.calls.find(call => call[0] === 'message');
    expect(messageHandler).toBeTruthy();
    
    // Extract the callback function
    const messageCallback = messageHandler[1];
    
    // Call the callback
    await messageCallback(mockMessage);
    
    // Verify that the LLM API was NOT called
    expect(mockChatOpenAIInvoke).not.toHaveBeenCalled();
    
    // Verify that an appropriate message was sent
    const mockChat = await mockMessage.getChat();
    expect(mockChat.sendMessage).toHaveBeenCalledWith('I can only respond to text messages for now.');
  });
  
  test('bot handles API errors correctly', async () => {
    // Mock a failed API response
    mockChatOpenAIInvoke.mockRejectedValue(new Error('API error'));
    
    // Create a mock chat ID for testing
    const mockChatId = 'test-chat-error';
    
    // Create a mock message
    const mockMessage = {
      body: 'Hello bot',
      fromMe: false,
      hasMedia: false,
      getChat: jest.fn().mockResolvedValue({
        sendMessage: jest.fn().mockResolvedValue({}),
        sendStateTyping: jest.fn(),
        id: { _serialized: mockChatId }
      })
    };
    
    // Find the 'message' callback handler
    const messageHandler = mockClient.on.mock.calls.find(call => call[0] === 'message');
    expect(messageHandler).toBeTruthy();
    
    // Extract the callback function
    const messageCallback = messageHandler[1];
    
    // Call the callback
    await messageCallback(mockMessage);
    
    // Verify that an error message was sent
    const mockChat = await mockMessage.getChat();
    expect(mockChat.sendMessage).toHaveBeenCalledWith('Sorry, I encountered an error. Please try again later.');
    
    // Verify the error was logged (using more flexible pattern matching)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Error calling .* API:/),
      expect.any(String)
    );
  });
  
  test('bot ignores messages from itself', async () => {
    // Create a mock message sent by the bot itself
    const mockMessage = {
      body: 'This is from the bot',
      fromMe: true, // Message is from the bot
      hasMedia: false,
      getChat: jest.fn()
    };
    
    // Find the 'message' callback handler
    const messageHandler = mockClient.on.mock.calls.find(call => call[0] === 'message');
    expect(messageHandler).toBeTruthy();
    
    // Extract the callback function
    const messageCallback = messageHandler[1];
    
    // Call the callback
    await messageCallback(mockMessage);
    
    // Verify that getChat was not called (bot should ignore its own messages)
    expect(mockMessage.getChat).not.toHaveBeenCalled();
    
    // Verify that the LLM API was NOT called
    expect(mockChatOpenAIInvoke).not.toHaveBeenCalled();
  });
  
  test('ready event displays correct provider info', () => {
    // Find the 'ready' callback handler
    const readyHandler = mockClient.on.mock.calls.find(call => call[0] === 'ready');
    expect(readyHandler).toBeTruthy();
    
    // Extract the callback function
    const readyCallback = readyHandler[1];
    
    // Call the callback
    readyCallback();
    
    // Verify console.log was called with the expected provider info
    expect(consoleLogSpy).toHaveBeenCalledWith('WhatsApp client is ready!');
    
    // Use the model name we set in the environment variables (in beforeEach)
    expect(consoleLogSpy).toHaveBeenCalledWith('Using LLM provider: openrouter, model: openai/gpt-4.1-nano');
  });
  
  test('bot handles secondary error when sending error message fails', async () => {
    // Reset modules to start clean
    jest.resetModules();
    
    // Clear previous calls and reset mocks
    jest.clearAllMocks();
    
    // Create spies for console methods
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
    
    // Create mocks
    const mockMessageHandler = jest.fn();
    
    // Mock the WhatsApp client again
    jest.doMock('whatsapp-web.js', () => {
      return {
        Client: jest.fn(() => ({
          initialize: jest.fn(),
          on: (event, callback) => {
            if (event === 'message') {
              mockMessageHandler.mockImplementation(callback);
            }
          }
        })),
        LocalAuth: jest.fn()
      };
    });
    
    // Mock the LangChain modules
    mockChatOpenAIInvoke.mockRejectedValue(new Error('API error'));
    
    // Create a mock chat ID for testing
    const mockChatId = 'test-chat-error-secondary';
    
    // Load a fresh module
    require('./index');
    
    // Create a mock message
    const mockMessage = {
      body: 'Hello bot',
      fromMe: false,
      hasMedia: false,
      getChat: jest.fn().mockResolvedValue({
        sendMessage: jest.fn().mockRejectedValue(new Error('Failed to send error message')),
        sendStateTyping: jest.fn(),
        id: { _serialized: mockChatId }
      })
    };
    
    // Ensure the mock handler was set up
    expect(mockMessageHandler).toBeDefined();
    
    // Call the callback
    await mockMessageHandler(mockMessage);
    
    // Verify error logs - check that the error function was called
    expect(errorSpy).toHaveBeenCalled();
    
    // Restore spies
    errorSpy.mockRestore();
  });
  
  test('chat history functions handle file operations correctly', () => {
    jest.resetModules();
    
    // Create spies for console methods
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Reset and reconfigure mock
    const mockFs = require('fs');
    mockFs.existsSync.mockReset();
    mockFs.readFileSync.mockReset();
    mockFs.writeFileSync.mockReset();
    
    // Import module
    const { loadChatHistory, saveChatHistory } = require('./index');
    const mockChatId = 'test-chat-123';
    
    // Test loading chat history when file doesn't exist
    mockFs.existsSync.mockReturnValueOnce(false);
    const emptyHistory = loadChatHistory(mockChatId);
    expect(emptyHistory).toEqual([]);
    expect(mockFs.existsSync).toHaveBeenCalled();
    
    // Test loading chat history when file exists
    const mockHistory = [
      { type: 'system', content: 'system prompt' },
      { type: 'human', content: 'user message' },
      { type: 'ai', content: 'ai response' }
    ];
    mockFs.existsSync.mockReturnValueOnce(true);
    mockFs.readFileSync.mockReturnValueOnce(JSON.stringify(mockHistory));
    const history = loadChatHistory(mockChatId);
    expect(history.length).toBe(3);
    expect(mockFs.readFileSync).toHaveBeenCalled();
    
    // Test saving chat history
    const messages = [
      { _getType: () => 'system', content: 'system prompt' },
      { _getType: () => 'human', content: 'user message' },
      { _getType: () => 'ai', content: 'ai response' }
    ];
    
    saveChatHistory(mockChatId, messages);
    expect(mockFs.writeFileSync).toHaveBeenCalled();
    
    // Test error handling in loadChatHistory
    mockFs.existsSync.mockReturnValueOnce(true);
    mockFs.readFileSync.mockImplementationOnce(() => {
      throw new Error('Read error');
    });
    const errorHistory = loadChatHistory(mockChatId);
    expect(errorHistory).toEqual([]);
    
    // Verify error log was called
    expect(errorSpy).toHaveBeenCalled();
    
    // Test error handling in saveChatHistory
    mockFs.writeFileSync.mockImplementationOnce(() => {
      throw new Error('Write error');
    });
    saveChatHistory(mockChatId, messages);
    
    // Verify error log was called again
    expect(errorSpy).toHaveBeenCalledTimes(2);
    
    // Restore spies
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });
  
  test('getResponseFromLLM function handles API interactions correctly', async () => {
    jest.resetModules();
    
    // Create spies for console methods
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Reset and reconfigure mocks
    const mockFs = require('fs');
    mockFs.existsSync.mockReset();
    mockFs.writeFileSync.mockReset();
    
    const { ChatOpenAI } = require('@langchain/openai');
    const mockInvoke = jest.fn();
    ChatOpenAI.mockImplementation(() => ({
      invoke: mockInvoke
    }));
    
    // Set up mock responses
    mockInvoke.mockResolvedValueOnce({ content: 'Why do programmers prefer dark mode? Because light attracts bugs!' });
    
    // Import module
    const { getResponseFromLLM } = require('./index');
    const mockChatId = 'test-chat-llm';
    const mockUserMessage = 'Tell me a joke about programming';
    
    // Configure test environment
    mockFs.existsSync.mockReturnValue(false);
    
    // Test the function with a simple message
    const response = await getResponseFromLLM(mockUserMessage, mockChatId);
    
    // Check the response
    expect(response).toBe('Why do programmers prefer dark mode? Because light attracts bugs!');
    
    // Verify that the LLM API was called correctly
    expect(mockInvoke).toHaveBeenCalled();
    
    // Verify that chat history was saved
    expect(mockFs.writeFileSync).toHaveBeenCalled();
    
    // Test error handling
    mockInvoke.mockRejectedValueOnce(new Error('API connection error'));
    
    // The function should throw an error
    await expect(getResponseFromLLM(mockUserMessage, mockChatId)).rejects.toThrow('Failed to get response from LLM');
    
    // Verify that error log was called
    expect(errorSpy).toHaveBeenCalled();
    
    // Restore spies
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });
});