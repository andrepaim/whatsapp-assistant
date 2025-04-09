const assert = require('assert');
const sinon = require('sinon');
const axios = require('axios');

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

jest.mock('axios');

// Import mocks after they've been set up
const { Client } = require('whatsapp-web.js');
const mockClient = Client.mockClient;

// Tests for index.js
describe('WhatsApp Joke Bot', () => {
  let consoleLogSpy;
  let consoleErrorSpy;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create spies for console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Reset axios mock
    axios.post.mockReset();
    
    // Load the module under test (this will use our mocked dependencies)
    jest.isolateModules(() => {
      require('./index');
    });
  });
  
  afterEach(() => {
    // Restore console spies
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
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
  
  test('LLM API is called with correct parameters', async () => {
    // Mock successful response
    axios.post.mockResolvedValue({
      data: {
        message: {
          content: 'This is a joke response'
        }
      }
    });
    
    // Find the 'message' callback handler
    const messageHandler = mockClient.on.mock.calls.find(call => call[0] === 'message');
    expect(messageHandler).toBeTruthy();
    
    // Extract the callback function
    const messageCallback = messageHandler[1];
    
    // Create a mock message object
    const mockMessage = {
      body: 'Hello bot',
      fromMe: false,
      hasMedia: false,
      getChat: jest.fn().mockResolvedValue({
        sendMessage: jest.fn().mockResolvedValue({}),
        sendStateTyping: jest.fn()
      })
    };
    
    // Call the callback
    await messageCallback(mockMessage);
    
    // Verify axios.post was called with the correct URL and body
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:11434/api/chat', 
      expect.objectContaining({
        model: 'llama3.2:3b',
        messages: [
          {
            role: 'system',
            content: expect.any(String)
          },
          {
            role: 'user',
            content: 'Hello bot'
          }
        ],
        stream: false
      })
    );
    
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
    expect(axios.post).not.toHaveBeenCalled();
    
    // Verify that an appropriate message was sent
    const mockChat = await mockMessage.getChat();
    expect(mockChat.sendMessage).toHaveBeenCalledWith('I can only respond to text messages for now.');
  });
  
  test('bot handles API errors correctly', async () => {
    // Mock a failed API response
    axios.post.mockRejectedValue(new Error('API error'));
    
    // Create a mock message
    const mockMessage = {
      body: 'Hello bot',
      fromMe: false,
      hasMedia: false,
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
    
    // Verify that an error message was sent
    const mockChat = await mockMessage.getChat();
    expect(mockChat.sendMessage).toHaveBeenCalledWith('Sorry, I encountered an error. Please try again later.');
    
    // Verify the error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error calling Ollama API:', 'API error');
  });
});