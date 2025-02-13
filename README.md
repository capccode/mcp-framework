# mcp-framework

MCP is a framework for building Model Context Protocol (MCP) servers elegantly in TypeScript. It provides a robust architecture with type-safe interfaces, schema validation, and consistent error handling.

MCP-Framework gives you architecture out of the box, with proper component registration and validation. Use our powerful MCP abstractions to define tools, resources, or prompts in an elegant way. Our CLI makes getting started with your own MCP server a breeze.

[Read the full docs here](https://mcp-framework.com)

Get started fast with mcp-framework ⚡⚡⚡

## Features

- 🚀 Quick server creation with `mcp create server`
- 🛠️ Easy tool/prompt/resource addition with `mcp add` commands
- 📝 Zod schema validation built-in
- 🔒 Type-safe interfaces
- 📊 Consistent error handling
- 📝 Proper logging with path resolution
- 🔄 Automatic component registration
- 🏗️ Powerful abstractions with full type safety
- 🚀 Simple server setup and configuration

## Quick Start

```bash
# Create a new server
mcp create my-server
cd my-server

# Install dependencies
npm install

# Build the server
npm run build

# Run the server (note: base path argument is required)
node dist/index.js .
```

## CLI Usage

The framework provides a powerful CLI for managing your MCP server projects:

### Project Creation

```bash
# Create a new project
mcp create <your project name here>
```

Project names can include lowercase letters, numbers, and hyphens (e.g., "my-mcp-server", "data-processor").

### Adding Components

```bash
# Add a new tool
mcp add tool my-tool

# Add a new prompt
mcp add prompt my-prompt

# Add a new resource
mcp add resource my-resource
```

## Server Structure

```
my-server/
├── src/
│   ├── tools/          # Tool implementations
│   ├── prompts/        # Prompt implementations
│   ├── resources/      # Resource implementations
│   └── utils/          # Utility functions
├── package.json
└── tsconfig.json
```

## Using with MCP Clients

### Roo Cline

Add this configuration to your Roo Cline settings file:

**MacOS**: `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": [
        "/absolute/path/to/my-server/dist/index.js",
        "/absolute/path/to/my-server"
      ],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

### Claude Desktop

Add this configuration to your Claude Desktop config file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": [
        "/absolute/path/to/my-server/dist/index.js",
        "/absolute/path/to/my-server"
      ]
    }
  }
}
```

## Development Workflow

1. Create your project:
   ```bash
   mcp create my-server
   cd my-server
   ```

2. Add components as needed:
   ```bash
   mcp add tool data-fetcher
   mcp add prompt data-analysis
   mcp add resource data-source
   ```

3. Build and Run:
   ```bash
   npm run build
   node dist/index.js .
   ```

4. Add to MCP Client settings (see above)

## License

MIT
