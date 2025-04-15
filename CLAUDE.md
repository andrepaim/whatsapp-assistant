# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- Build/Start: `npm start`
- Install dependencies: `npm install`

## Code Style Guidelines
- **Formatting**: Use 2-space indentation, single quotes for strings
- **Imports**: Group imports by type (core Node modules first, then external libraries)
- **Error Handling**: Use try/catch blocks for async operations with specific error messages
- **Logging**: Use console.log for info, console.error for errors
- **Naming**: Use camelCase for variables and functions, PascalCase for classes
- **File Structure**: Keep related functionality in same file (small codebase)
- **Async/Await**: Prefer async/await over Promise chains
- **API Keys**: Never hardcode API keys, use environment variables
