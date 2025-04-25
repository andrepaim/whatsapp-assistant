# LangSmith Integration for WhatsApp Assistant

This document explains how LangSmith has been integrated into the WhatsApp Assistant project for traceability, monitoring, and feedback collection.

## What is LangSmith?

[LangSmith](https://smith.langchain.com/) is a developer platform by LangChain that helps with:

- **Debugging**: Visualize and trace LLM application execution
- **Testing**: Evaluate LLM outputs and create test suites
- **Monitoring**: Track production performance and detect issues
- **Improving**: Iterate on prompts and chains with feedback loops

## Setup Instructions

### 1. Environment Variables

Configure the following environment variables in your `.env` file:

```
# LangSmith Configuration
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=your-langsmith-api-key
LANGCHAIN_PROJECT=whatsapp-assistant
```

You can obtain your API key by signing up at [smith.langchain.com](https://smith.langchain.com/).

### 2. Install Dependencies

Make sure you have the required dependencies installed:

```bash
npm install langsmith
```

## How It Works

The LangSmith integration in this project provides traceability for:

1. **LLM Interactions**: Every call to the LLM is traced with detailed context
2. **User Feedback**: Feedback on jokes is captured and linked to the corresponding LLM run
3. **Error Tracking**: Errors in LLM calls are recorded for debugging

### Key Components

- **langsmith-integration.js**: Core integration with LangSmith, including tracing and feedback recording
- **feedback-handler.js**: Processes user feedback and associates it with the correct LLM run
- **index.js**: Uses the integration to trace LLM calls and process feedback

### Tracing Flow

1. When a user sends a message, the application checks if it's feedback to a previous joke
2. The message is sent to the LLM with tracing enabled
3. The LLM response is traced and the run ID is stored
4. When the user provides feedback, it's associated with the stored run ID

## Using the LangSmith Dashboard

Once integrated, you can use the LangSmith dashboard to:

### 1. View Traces

Navigate to your project in the LangSmith dashboard to see all traced runs. Each run includes:

- Input message
- Output response
- Execution time
- Token usage
- Any errors that occurred

### 2. Analyze Feedback

The feedback tab shows user ratings for each joke, allowing you to:

- Identify which jokes perform well
- Find patterns in poorly received jokes
- Track overall user satisfaction

### 3. Monitor Performance

The dashboard provides metrics on:

- Average response time
- Error rates
- Token usage
- User satisfaction scores

### 4. Create Datasets

You can create datasets of joke requests and responses for:

- Testing new models
- Fine-tuning existing models
- Evaluating performance changes

## Advanced Features

### Creating Custom Traces

For more detailed tracing, you can create custom traces for specific operations:

```javascript
const { createTracer } = require('./langsmith-integration');

async function customOperation() {
  const tracer = createTracer("custom_operation", ["custom", "tag"]);
  
  try {
    await tracer.startTrace({
      name: "custom_operation",
      metadata: { custom: "metadata" }
    });
    
    // Your operation logic here
    
    await tracer.endTrace({ status: "success" });
  } catch (error) {
    await tracer.endTrace({ 
      status: "error",
      error: error.message
    });
    throw error;
  }
}
```

### Recording Custom Feedback

You can record custom feedback beyond the basic positive/negative ratings:

```javascript
const { recordFeedback } = require('./langsmith-integration');

async function recordCustomFeedback(runId, chatId, rating, comment) {
  await recordFeedback(runId, rating, chatId, comment);
}
```

### Creating Evaluation Datasets

To create datasets for evaluation:

```javascript
const { createJokeDataset } = require('./langsmith-integration');

async function createDataset() {
  await createJokeDataset("joke-evaluation", [
    {
      inputs: { message: "me conta uma piada de cachorro" },
      outputs: { response: "Aqui está uma piada de cachorro: ..." }
    },
    // More examples...
  ]);
}
```

## Best Practices

1. **Use Meaningful Tags**: Add relevant tags to your traces to make filtering easier
2. **Include Metadata**: Add context-specific metadata to help with debugging
3. **Track User Sessions**: Associate traces with user sessions for better analysis
4. **Monitor Regularly**: Check the dashboard regularly to identify issues
5. **Collect Feedback**: Encourage users to provide feedback for continuous improvement

## Troubleshooting

### Common Issues

1. **Missing Traces**: Ensure `LANGCHAIN_TRACING_V2` is set to `true`
2. **Authentication Errors**: Verify your `LANGCHAIN_API_KEY` is correct
3. **Project Not Found**: Check that `LANGCHAIN_PROJECT` exists in your LangSmith account
4. **Feedback Not Recorded**: Ensure run IDs are being stored correctly

### Debugging

If traces aren't appearing in the dashboard:

1. Check console logs for LangSmith-related messages
2. Verify network connectivity to the LangSmith API
3. Ensure the API key has the correct permissions

## Resources

- [LangSmith Documentation](https://docs.smith.langchain.com/)
- [LangChain JS Documentation](https://js.langchain.com/docs/)
- [LangSmith API Reference](https://docs.smith.langchain.com/reference/overview)
