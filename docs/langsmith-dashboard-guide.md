# LangSmith Dashboard Guide

This guide explains how to use the LangSmith dashboard to analyze traceability data from your WhatsApp Assistant application.

## Accessing the Dashboard

1. Go to [smith.langchain.com](https://smith.langchain.com/)
2. Log in with your LangSmith account
3. Select your project (default: "whatsapp-assistant")

## Dashboard Overview

The LangSmith dashboard is organized into several sections:

- **Traces**: View detailed logs of all LLM interactions
- **Datasets**: Manage test datasets for evaluation
- **Evaluations**: Run and view evaluation results
- **Playground**: Experiment with prompts and models
- **Monitoring**: View performance metrics and analytics

## Traces

The Traces section is where you'll find detailed logs of all LLM interactions from your WhatsApp Assistant.

### Viewing Traces

1. Click on "Traces" in the left sidebar
2. You'll see a list of all traced runs, with the most recent at the top
3. Use filters to narrow down the list:
   - Filter by tags (e.g., "whatsapp", "llm", "joke-bot")
   - Filter by status (e.g., "success", "error")
   - Filter by date range

### Trace Details

Click on any trace to view its details:

1. **Overview**: Shows basic information about the run
   - Run ID
   - Start and end time
   - Duration
   - Status
   - Tags

2. **Inputs & Outputs**: Shows the input message and output response

3. **Trace Map**: Visual representation of the execution flow
   - For complex chains, this shows how data flows between components
   - For our WhatsApp Assistant, this will show the flow from user message to LLM response

4. **Feedback**: Shows any feedback recorded for this run
   - User ratings (positive/negative)
   - Comments

5. **Metadata**: Shows additional context about the run
   - Chat ID
   - Message length
   - Timestamp
   - Environment

### Analyzing Errors

When a trace has an "error" status:

1. Click on the trace to view details
2. Check the "Error" section for the error message
3. Look at the trace map to see where the error occurred
4. Check the inputs to see if they might have caused the issue

## Feedback Analysis

The WhatsApp Assistant collects feedback when users respond to jokes. Here's how to analyze this feedback:

1. Go to "Traces" in the left sidebar
2. Use the "Has Feedback" filter to show only runs with feedback
3. Look at the "Feedback" column to see positive/negative ratings
4. Click on a trace to view detailed feedback

### Feedback Metrics

To see aggregate feedback metrics:

1. Go to "Monitoring" in the left sidebar
2. Look for the "Feedback" section
3. You'll see metrics like:
   - Percentage of positive feedback
   - Feedback volume over time
   - Feedback by joke category (if tagged)

## Datasets

The Datasets section allows you to create and manage test datasets for your WhatsApp Assistant.

### Creating a Dataset

1. Click on "Datasets" in the left sidebar
2. Click "Create Dataset"
3. Enter a name (e.g., "joke-requests")
4. Add a description
5. Click "Create"

### Adding Examples

To add examples to a dataset:

1. Click on the dataset
2. Click "Add Example"
3. Enter:
   - Input: A joke request (e.g., `{"message": "me conta uma piada de cachorro"}`)
   - Output: Expected response (e.g., `{"response": "Aqui está uma piada de cachorro: ..."}`)
4. Click "Save"

### Creating Datasets from Traces

You can also create datasets from existing traces:

1. Go to "Traces" in the left sidebar
2. Select the traces you want to include
3. Click "Add to Dataset"
4. Select an existing dataset or create a new one

## Evaluations

The Evaluations section allows you to test and evaluate your WhatsApp Assistant.

### Running an Evaluation

1. Click on "Evaluations" in the left sidebar
2. Click "Create Evaluation"
3. Select:
   - Dataset: The dataset to use for testing
   - Model: The model to evaluate
   - Evaluators: How to evaluate the responses (e.g., correctness, quality)
4. Click "Start Evaluation"

### Viewing Evaluation Results

After running an evaluation:

1. Click on the evaluation run
2. You'll see metrics like:
   - Overall score
   - Success rate
   - Average response time
3. Click on individual examples to see detailed results

## Monitoring

The Monitoring section provides analytics and performance metrics for your WhatsApp Assistant.

### Key Metrics

1. **Response Time**: How long it takes to generate responses
   - Average response time
   - Response time distribution
   - Response time by message length

2. **Token Usage**: How many tokens are being used
   - Total tokens used
   - Tokens per request
   - Cost estimates

3. **Error Rate**: How often errors occur
   - Overall error rate
   - Errors by type
   - Errors over time

4. **User Satisfaction**: Based on feedback
   - Positive feedback percentage
   - Satisfaction trends over time

### Setting Up Alerts

You can set up alerts for important metrics:

1. Go to "Monitoring" in the left sidebar
2. Click "Alerts" tab
3. Click "Create Alert"
4. Configure:
   - Metric: What to monitor (e.g., error rate, response time)
   - Threshold: When to trigger the alert
   - Notification: How to notify you (e.g., email, Slack)

## Playground

The Playground allows you to experiment with prompts and models.

### Testing Prompts

1. Click on "Playground" in the left sidebar
2. Enter a prompt (e.g., a joke request)
3. Select a model
4. Click "Run"
5. View the response

### Comparing Models

You can compare different models side by side:

1. Click "Add Model" to add another model
2. Enter the same prompt for both models
3. Click "Run"
4. Compare the responses

### Saving Prompts

To save a prompt for future use:

1. Create your prompt in the playground
2. Click "Save"
3. Enter a name and description
4. Click "Save Prompt"

## Best Practices

### Organizing with Tags

Use consistent tags to organize your traces:

- `whatsapp`: All WhatsApp interactions
- `joke-bot`: Specific to joke functionality
- `feedback`: Traces with user feedback
- `error`: Traces with errors

### Regular Analysis

Establish a routine for analyzing LangSmith data:

1. Daily: Check for errors and unusual patterns
2. Weekly: Analyze feedback and performance trends
3. Monthly: Run evaluations and compare to previous periods

### Continuous Improvement

Use LangSmith data to improve your WhatsApp Assistant:

1. Identify common error patterns
2. Find jokes with consistently negative feedback
3. Test prompt variations to improve response quality
4. Monitor token usage to optimize costs

## Troubleshooting

### Missing Traces

If traces aren't appearing in the dashboard:

1. Check that `LANGCHAIN_TRACING_V2` is set to `true` in your `.env` file
2. Verify your `LANGCHAIN_API_KEY` is correct
3. Check network connectivity to the LangSmith API
4. Look for errors in your application logs

### Incorrect Feedback Association

If feedback isn't being associated with the correct runs:

1. Check that run IDs are being stored correctly
2. Verify the `storeRunId` function is being called
3. Check the `processFeedback` function for errors

### Dashboard Performance Issues

If the dashboard is slow or unresponsive:

1. Try filtering to a smaller date range
2. Use more specific filters to reduce the number of traces
3. Clear your browser cache
4. Try a different browser

## Additional Resources

- [LangSmith Documentation](https://docs.smith.langchain.com/)
- [LangChain JS Documentation](https://js.langchain.com/docs/)
- [LangSmith API Reference](https://docs.smith.langchain.com/reference/overview)
