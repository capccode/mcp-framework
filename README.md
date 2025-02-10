# mcp-framework

MCP is a framework for building Model Context Protocol (MCP) servers elegantly in TypeScript.

MCP-Framework gives you architecture out of the box, with automatic directory-based discovery for tools, resources, and prompts. Use our powerful MCP abstractions to define tools, resources, or prompts in an elegant way. Our cli makes getting started with your own MCP server a breeze

[Read the full docs here](https://mcp-framework.com)

Get started fast with mcp-framework ⚡⚡⚡

## Features

- 🛠️ Automatic directory-based discovery and loading for tools, prompts, and resources
- 🏗️ Powerful abstractions with full type safety
- 🚀 Simple server setup and configuration
- 📦 CLI for rapid development and project scaffolding

## Quick Start

### Using the CLI (Recommended)

```bash
# Using npx (easiest)
npx -y mcp-framework create my-mcp-server
cd my-mcp-server
npm install
npm run build

# Or install globally
npm install -g mcp-framework
mcp create my-mcp-server
cd my-mcp-server
npm install
npm run build

# Your server is ready to use!
# Note: When running the server directly, you must provide the base path:
# node dist/index.js .

# For development, you can also use npx to run your server:
# npx my-mcp-server
```

### Manual Installation

```bash
npm install mcp-framework
```

## CLI Usage

The framework provides a powerful CLI for managing your MCP server projects:

### Project Creation

```bash
# Create a new project
mcp create <your project name here>
```

Project names can include lowercase letters, numbers, and hyphens (e.g., "my-mcp-server", "data-processor"). The framework will automatically convert hyphenated names to PascalCase for class names (e.g., "my-mcp-server" becomes "MyMcpServer") to ensure valid TypeScript/JavaScript identifiers.

### Adding a Tool

```bash
# Add a new tool
mcp add tool price-fetcher
```

### Adding a Prompt

```bash
# Add a new prompt
mcp add prompt price-analysis
```

### Adding a Resource

```bash
# Add a new prompt
mcp add resource market-data
```

## Development Workflow

### Local Framework Development

If you're developing the framework itself:

```bash
# Clone the repository
git clone <repository-url>
cd mcp-framework

# Install dependencies
npm install

# Build the framework
npm run build

# Link for local development
npm link

# Now you can use the local version globally
mcp create test-project
```

The `npm link` command creates a symbolic link from your global npm folder to the local framework, allowing you to test changes immediately without publishing to npm.

### Project Development

1. Create your project:

```bash
  mcp create my-mcp-server
  cd my-mcp-server
```

2. Add tools as needed:

   ```bash
   mcp add tool data-fetcher
   mcp add tool data-processor
   mcp add tool report-generator
   ```

3. Build and Run:

   ```bash
   # Build the TypeScript code
   npm run build

   # Run the server (note: base path argument is required)
   node dist/index.js .
   ```

4. Add to MCP Client (Read below for Claude Desktop example)

### Future Package Management

While currently using npm, we plan to explore additional package management solutions:
- Poetry for Python integration
- Better monorepo support
- Improved dependency management
- Enhanced local development workflow

Note: When running the server directly with node, you must always provide the base path as an argument. The base path tells the server where to look for tools, prompts, and resources. Using '.' means "current directory".

## Using with MCP Clients

The framework is compatible with any MCP client that follows the specification. However, some clients may have limitations:

### Roo Cline

Add this configuration to your Roo Cline settings file:

**MacOS**: `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "test-obsidian": {
      "command": "npx",
      "args": ["-y", "test-obsidian"],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

For local development, you can also use:
```json
{
  "mcpServers": {
    "test-obsidian": {
      "command": "node",
      "args": [
        "/absolute/path/to/test-obsidian/dist/index.js",
        "/absolute/path/to/test-obsidian"
      ],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

Note:
- For published packages, use npx for easier installation and updates
- For local development, use node with absolute paths
- The base path argument is required and should point to your project root
- Set disabled to false to enable the server
- alwaysAllow can be left as an empty array for default security settings

### Claude Desktop

Add this configuration to your Claude Desktop config file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

#### Published Package
```json
{
  "mcpServers": {
    "test-obsidian": {
      "command": "npx",
      "args": ["-y", "test-obsidian"]
    }
  }
}
```

#### Local Development
```json
{
  "mcpServers": {
    "test-obsidian": {
      "command": "node",
      "args": [
        "/absolute/path/to/test-obsidian/dist/index.js",
        "/absolute/path/to/test-obsidian"
      ]
    }
  }
}
```

### Known Client Limitations

- Some MCP clients may not fully support prompt operations
- The server view UI in certain clients may not properly display all MCP tools and resources, though they remain functional through the API
- Always test your server with your target client to ensure compatibility

## Building and Testing

1. Make changes to your tools
2. Run \`npm run build\` to compile
3. The server will automatically load your tools on startup

## Components Overview

### 1. Tools (Main Component)

Tools are the primary way to extend an LLM's capabilities. Each tool should perform a specific function:

```typescript
import { MCPTool } from "mcp-framework";
import { z } from "zod";

interface ExampleInput {
  message: string;
}

class ExampleTool extends MCPTool<ExampleInput> {
  name = "example_tool";
  description = "An example tool that processes messages";

  schema = {
    message: {
      type: z.string(),
      description: "Message to process",
    },
  };

  async execute(input: ExampleInput) {
    return `Processed: ${input.message}`;
  }
}

export default ExampleTool;
```

### 2. Prompts (Optional)

Prompts help structure conversations with Claude:

```typescript
import { MCPPrompt } from "mcp-framework";
import { z } from "zod";

interface GreetingInput {
  name: string;
  language?: string;
}

class GreetingPrompt extends MCPPrompt<GreetingInput> {
  name = "greeting";
  description = "Generate a greeting in different languages";

  schema = {
    name: {
      type: z.string(),
      description: "Name to greet",
      required: true,
    },
    language: {
      type: z.string().optional(),
      description: "Language for greeting",
      required: false,
    },
  };

  async generateMessages({ name, language = "English" }: GreetingInput) {
    return [
      {
        role: "user",
        content: {
          type: "text",
          text: `Generate a greeting for ${name} in ${language}`,
        },
      },
    ];
  }
}

export default GreetingPrompt;
```

### 3. Resources (Optional)

Resources provide data access capabilities:

```typescript
import { MCPResource, ResourceContent } from "mcp-framework";

class ConfigResource extends MCPResource {
  uri = "config://app/settings";
  name = "Application Settings";
  description = "Current application configuration";
  mimeType = "application/json";

  async read(): Promise<ResourceContent[]> {
    const config = {
      theme: "dark",
      language: "en",
    };

    return [
      {
        uri: this.uri,
        mimeType: this.mimeType,
        text: JSON.stringify(config, null, 2),
      },
    ];
  }
}

export default ConfigResource;
```

## Project Structure

```
your-project/
├── src/
│   ├── tools/          # Tool implementations (Required)
│   │   └── ExampleTool.ts
│   ├── prompts/        # Prompt implementations (Optional)
│   │   └── GreetingPrompt.ts
│   ├── resources/      # Resource implementations (Optional)
│   │   └── ConfigResource.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

## Automatic Feature Discovery

The framework automatically discovers and loads:

- Tools from the `src/tools` directory
- Prompts from the `src/prompts` directory (if present)
- Resources from the `src/resources` directory (if present)

Each feature should be in its own file and export a default class that extends the appropriate base class:

- `MCPTool` for tools
- `MCPPrompt` for prompts
- `MCPResource` for resources

### Base Classes

#### MCPTool

- Handles input validation using Zod
- Provides error handling and response formatting
- Includes fetch helper for HTTP requests

#### MCPPrompt

- Manages prompt arguments and validation
- Generates message sequences for LLM interactions
- Supports dynamic prompt templates

#### MCPResource

- Exposes data through URI-based system
- Supports text and binary content
- Optional subscription capabilities for real-time updates

## Type Safety and Schema Validation

The framework provides comprehensive type safety through TypeScript and runtime validation with Zod:

### Enhanced Type Safety Features
- Strict type checking with unknown type handling
- Proper error discrimination and type guards
- Nullish coalescing for optional values
- Type-safe dynamic imports
- Comprehensive error handling

### Base Model Integration
- All base models (MCPTool, MCPPrompt, MCPResource) feature:
  - Type-safe Zod schema integration
  - Automatic input validation
  - Type inference from schemas
  - Error-handled operations
  - Safe dynamic loading

### Schema Definition Example
```typescript
schema = {
  parameter: {
    type: z.string().email(),
    description: "User email address",
  },
  count: {
    type: z.number().min(1).max(100),
    description: "Number of items",
  },
  options: {
    type: z.object({
      format: z.enum(["json", "text"]),
      pretty: z.boolean().optional()
    }),
    description: "Output options",
  }
};
```

### Type Safety Benefits
- Compile-time type checking with strict mode
- Runtime validation with detailed error messages
- Complete IDE support with accurate type inference
- Safe handling of optional values and nulls
- Proper error handling with type discrimination
- Type-safe dynamic component loading
- Automatic schema validation

## License

MIT
