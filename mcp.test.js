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
const mockCreateAgent = jest.fn();
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: mockChatOpenAIInvoke,
    createAgent: mockCreateAgent.mockImplementation(() => ({
      invoke: mockChatOpenAIInvoke
    }))
  }))
}));

// Mock MCP modules
const mockGetTools = jest.fn();
const mockMultiServerMCPClient = jest.fn();
jest.mock('@langchain/mcp-adapters', () => ({
  MultiServerMCPClient: mockMultiServerMCPClient.mockImplementation(() => ({
    getTools: mockGetTools,
  })),
}));

jest.mock('@langchain/core/messages', () => ({
  HumanMessage: jest.fn(content => ({ content, _getType: () => 'human' })),
  AIMessage: jest.fn(content => ({ content, _getType: () => 'ai' })),
  SystemMessage: jest.fn(content => ({ content, _getType: () => 'system' }))
}));

// Import mocks after they've been set up
const { Client } = require('whatsapp-web.js');
const mockClient = Client.mockClient;

// Tests for MCP Integration
describe('WhatsApp MCP Integration', () => {
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
    
    // Create spies for console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Reset LangChain mock
    mockChatOpenAIInvoke.mockReset();
    mockChatOpenAIInvoke.mockResolvedValue({ content: 'This is a response with MCP' });
    mockCreateAgent.mockReset();
    mockCreateAgent.mockImplementation(() => ({
      invoke: mockChatOpenAIInvoke
    }));
    
    // Reset MCP mock
    mockMultiServerMCPClient.mockReset();
    mockGetTools.mockReset();
    mockGetTools.mockResolvedValue([
      { name: 'tool1', description: 'Test tool 1' },
      { name: 'tool2', description: 'Test tool 2' }
    ]);
    
    // Set env variables for tests
    process.env.LLM_PROVIDER = 'openrouter';
    process.env.LLM_MODEL = 'openai/gpt-4.1-nano';
    process.env.LLM_API_BASE = 'https://openrouter.ai/api/v1';
    process.env.MCP_SERVER_URL = 'http://localhost:8000';
    
    // Load the module under test (this will use our mocked dependencies)
    jest.isolateModules(() => {
      require('./index');
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
    delete process.env.MCP_SERVER_URL;
  });
  
  test('MCP client is initialized when MCP_SERVER_URL is provided', () => {
    // This test will verify that the MultiServerMCPClient is initialized 
    // when MCP_SERVER_URL is provided
    expect(mockMultiServerMCPClient).toHaveBeenCalled();
    expect(mockMultiServerMCPClient).toHaveBeenCalledWith(expect.objectContaining({
      serverUrl: 'http://localhost:8000'
    }));
  });
  
  test('MCP tools are fetched when MCP_SERVER_URL is provided', async () => {
    // This test will verify that getTools is called when MCP_SERVER_URL is provided
    expect(mockGetTools).toHaveBeenCalled();
  });
  
  test('LLM response uses agent with MCP tools when available', async () => {
    // Mock MCP tools to be available
    mockGetTools.mockResolvedValue([
      { name: 'tool1', description: 'Test tool 1' },
      { name: 'tool2', description: 'Test tool 2' }
    ]);
    
    // Find the 'message' callback handler
    const messageHandler = mockClient.on.mock.calls.find(call => call[0] === 'message');
    expect(messageHandler).toBeTruthy();
    
    // Extract the callback function
    const messageCallback = messageHandler[1];
    
    // Create a mock chat ID for testing
    const mockChatId = 'test-chat-123';
    
    // Create a mock message object
    const mockMessage = {
      body: 'Find information about weather',
      fromMe: false,
      hasMedia: false,
      getChat: jest.fn().mockResolvedValue({
        sendMessage: jest.fn().mockResolvedValue({}),
        sendStateTyping: jest.fn(),
        id: { _serialized: mockChatId }
      })
    };
    
    // Set up the mock response
    mockChatOpenAIInvoke.mockResolvedValue({ content: 'Weather information provided by MCP tools' });
    
    // Call the callback
    await messageCallback(mockMessage);
    
    // Verify the message was sent
    const mockChat = await mockMessage.getChat();
    expect(mockChat.sendMessage).toHaveBeenCalledWith(expect.stringContaining('Weather information'));
  });
});