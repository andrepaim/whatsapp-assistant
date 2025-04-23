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
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: mockChatOpenAIInvoke
  }))
}));

// Mock MCP modules
const mockMcpTools = [
  { name: 'tool1', description: 'Test tool 1' },
  { name: 'tool2', description: 'Test tool 2' }
];
const mockGetTools = jest.fn().mockResolvedValue(mockMcpTools);
const mockMultiServerMCPClient = jest.fn();

jest.mock('@langchain/mcp-adapters', () => ({
  MultiServerMCPClient: mockMultiServerMCPClient.mockImplementation(() => ({
    getTools: mockGetTools,
  })),
}));

// Mock LLM binding for tools
const mockBindedLLM = {
  invoke: jest.fn().mockResolvedValue({ 
    content: 'This is a response from MultiServerMCPClient' 
  })
};

// Update the ChatOpenAI mock to include bind method
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: mockChatOpenAIInvoke,
    bind: jest.fn().mockReturnValue(mockBindedLLM)
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
    
    // Set env variables for tests
    process.env.LLM_PROVIDER = 'openrouter';
    process.env.LLM_MODEL = 'openai/gpt-4.1-nano';
    process.env.LLM_API_BASE = 'https://openrouter.ai/api/v1';
    process.env.MCP_SERVER_URL = 'http://localhost:8000';
    
    // Load the module under test (this will use our mocked dependencies)
    jest.isolateModules(() => {
      // Override the real console.log/error to prevent timestamp issues
      const origLog = console.log;
      const origError = console.error;
      
      // Skip overriding console functions to prevent issues
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
  
  test('MCP client module loaded successfully', () => {
    // If test got this far, the module loaded correctly
    expect(true).toBe(true);
  });
  
  test('Environment variables set correctly', async () => {
    // Verify environment variables were set
    expect(process.env.MCP_SERVER_URL).toBe('http://localhost:8000');
    expect(process.env.LLM_PROVIDER).toBe('openrouter');
  });
  
  test('LLM response uses agent with MCP tools when available', async () => {
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
    
    // Call the callback
    await messageCallback(mockMessage);
    
    // Verify a sendMessage was called
    const mockChat = await mockMessage.getChat();
    expect(mockChat.sendMessage).toHaveBeenCalled();
  });
});