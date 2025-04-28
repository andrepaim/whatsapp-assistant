#!/bin/bash

# Set MCP server URL to the testing server if not already set
export MCP_SERVER_URL=${MCP_SERVER_URL:-"http://localhost:8000/sse"}

# Run the MCP test script
echo "Running MCP integration test with server URL: $MCP_SERVER_URL"
node test-mcp-integration.js