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

// Mock litellm
const mockCompletion = jest.fn();
jest.mock('litellm', () => ({
  litellm: {
    completion: mockCompletion
  }
}));

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
    
    // Reset litellm mock
    mockCompletion.mockReset();
    
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
    // Mock successful response from LiteLLM
    mockCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'This is a joke response'
          }
        }
      ]
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
    
    // Verify litellm.completion was called with the correct parameters
    expect(mockCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'ollama/llama3.2:3b',
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
        api_base: 'http://localhost:11434'
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
    expect(mockCompletion).not.toHaveBeenCalled();
    
    // Verify that an appropriate message was sent
    const mockChat = await mockMessage.getChat();
    expect(mockChat.sendMessage).toHaveBeenCalledWith('I can only respond to text messages for now.');
  });
  
  test('bot handles API errors correctly', async () => {
    // Mock a failed API response
    mockCompletion.mockRejectedValue(new Error('API error'));
    
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
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error calling ollama API:', 'API error');
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
    expect(mockCompletion).not.toHaveBeenCalled();
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
    expect(consoleLogSpy).toHaveBeenCalledWith('Using LLM provider: ollama, model: llama3.2:3b');
  });
  
  test('bot handles different LLM providers correctly', async () => {
    // We need to modify how environment variables are handled in the test
    
    // Save the original mockCompletion implementation
    const originalMockCompletion = mockCompletion;
    
    // Create a new mock for completion that captures the parameters
    let capturedOptions = null;
    const newMockCompletion = jest.fn().mockImplementation((options) => {
      capturedOptions = options;
      return Promise.resolve({
        choices: [
          {
            message: {
              content: 'This is a joke from OpenAI'
            }
          }
        ]
      });
    });
    
    // Replace the mockCompletion with our new implementation
    jest.resetModules();
    jest.doMock('litellm', () => ({
      litellm: {
        completion: newMockCompletion
      }
    }));
    
    // Set environment variables
    const originalEnv = { ...process.env };
    process.env.LLM_PROVIDER = 'openai';
    process.env.LLM_MODEL = 'gpt-3.5-turbo';
    process.env.LLM_API_KEY = 'test-api-key';
    
    // Get a fresh instance of the module
    const freshIndex = require('./index');
    
    // Create a test message
    const mockMessage = {
      body: 'Hello OpenAI',
      fromMe: false,
      hasMedia: false,
      getChat: jest.fn().mockResolvedValue({
        sendMessage: jest.fn().mockResolvedValue({}),
        sendStateTyping: jest.fn()
      })
    };
    
    // Call getResponseFromLLM directly as we can't access the event handlers
    await freshIndex.getResponseFromLLM(mockMessage.body);
    
    // Verify that the completion was called with the right parameters
    expect(capturedOptions).toBeTruthy();
    expect(capturedOptions.model).toBe('gpt-3.5-turbo');
    expect(capturedOptions.api_key).toBe('test-api-key');
    
    // Restore environment and mocks
    process.env = originalEnv;
    jest.resetModules();
    jest.doMock('litellm', () => ({
      litellm: {
        completion: originalMockCompletion
      }
    }));
  });
  
  test('bot handles secondary error when sending error message fails', async () => {
    // Reset modules to start clean
    jest.resetModules();
    
    // Clear previous calls and reset mocks
    jest.clearAllMocks();
    consoleErrorSpy.mockClear();
    
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
    
    // Mock the litellm module
    jest.doMock('litellm', () => ({
      litellm: {
        completion: jest.fn().mockRejectedValue(new Error('API error'))
      }
    }));
    
    // Load a fresh module
    require('./index');
    
    // Create a mock message
    const mockMessage = {
      body: 'Hello bot',
      fromMe: false,
      hasMedia: false,
      getChat: jest.fn().mockResolvedValue({
        sendMessage: jest.fn().mockRejectedValue(new Error('Failed to send error message')),
        sendStateTyping: jest.fn()
      })
    };
    
    // Ensure the mock handler was set up
    expect(mockMessageHandler).toBeDefined();
    
    // Call the callback
    await mockMessageHandler(mockMessage);
    
    // Verify error logs
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Error calling .* API:|Error processing message:/), 
      expect.anything()
    );
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to send error message:', 
      expect.any(Error)
    );
  });
});