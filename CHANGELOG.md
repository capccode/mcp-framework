# Changelog

## [0.2.0] - 2025-02-09

### Overview
This release focuses on comprehensive type safety improvements across the entire framework, enhancing error handling, and improving validation.

### Added
- Added comprehensive type safety features:
  - Proper unknown type handling
  - Type-safe error discrimination
  - Nullish coalescing for optional values
  - Type-safe dynamic imports
  - Strict type guards
- Added enhanced error handling:
  - Proper error type discrimination
  - Type-safe error messages
  - Improved stack traces
  - Error context preservation
- Added type-safe component loading:
  - Type-safe dynamic imports
  - Strict validation for loaded components
  - Error-handled loading process
- Added type safety testing utilities:
  - Type guard testing helpers
  - Error handling test framework
  - Type safety assertion utilities

### Changed
- Updated base classes with strict type safety:
  - Enhanced MCPTool type validation
  - Improved MCPPrompt type checking
  - Strengthened MCPResource type safety
- Improved error handling across components:
  - Added unknown type handling
  - Enhanced error discrimination
  - Added type-safe error messages
- Enhanced component loaders:
  - Added type-safe dynamic loading
  - Improved validation checks
  - Better error handling
- Updated documentation with type safety focus:
  - Added type safety examples
  - Enhanced error handling guides
  - Improved validation documentation

### Fixed
- Fixed type safety issues in base models
- Fixed error handling in component loaders
- Fixed type inference in dynamic imports
- Fixed validation type safety
- Fixed error message type safety
- Fixed optional parameter handling
- Fixed dynamic loading type safety
- Fixed project template class name generation:
  - Properly converts hyphenated project names to PascalCase
  - Ensures valid JavaScript/TypeScript class names
  - Maintains consistent naming throughout generated code

### Migration Guide
See the Type Safety Migration Guide in the documentation for detailed instructions on updating your components to use the new type safety features.

## [0.1.0] - 2025-01-02

### Overview
This release focuses on improving type safety and base model implementations, along with better documentation for MCP client configuration.

### Breaking Changes
- Removed dependency on custom MCP server implementation in favor of official SDK
- Changed project template to use @modelcontextprotocol/sdk instead of mcp-framework internals
- Moved component loaders to optional utilities

### Added
- Added @modelcontextprotocol/sdk as a peer dependency
- Added improved error handling in project templates
- Added proper TypeScript type definitions (@types/node, @types/prompts)
- Added comprehensive prompt support in project templates with proper schema and execution
- Added resource type safety with Resource and ResourceContents interfaces
- Added detailed post-creation instructions for tools, prompts, and resources
- Added proper validation for MCP project structure
- Added proper capabilities declaration for tools, prompts, and resources
- Added improved component auto-discovery:
  - Automatic loading of tools, prompts, and resources
  - Proper path handling for compiled code
  - Validation of component interfaces
- Added robust logging system:
  - File-based logging with timestamps
  - Error-resilient log file handling
  - Console mirroring for debugging
  - Automatic logs directory creation on server start
  - Proper .gitignore configuration for logs
- Added example resource implementation with file system support
- Added modular template system:
  - Separated templates into logical groups (utils, components, config)
  - Added template generation functions for better maintainability
  - Improved code organization in project creation
- Added detailed MCP client configuration documentation:
  - Roo Cline settings file location and format
  - Base path configuration requirements
  - Security settings explanation

### Changed
- Updated create project template to use official SDK patterns
- Updated example tool template to use base classes with proper typing
- Modified package.json template to include required SDK dependencies
- Changed build script to use standard tsc instead of custom mcp-build
- Updated TypeScript configuration for better ES module support
- Improved project validation with specific error messages
- Enhanced component creation with proper TypeScript interfaces
- Improved error handling in tool, prompt, and resource implementations
- Enhanced project creation:
  - Added utils directory with logger and component loader
  - Improved example components with proper typing
  - Added automatic component registration
  - Added .gitignore with proper log file patterns
- Refactored project creation:
  - Moved templates to separate files
  - Added template generation functions
  - Reduced create.ts from ~1000 to ~130 lines
  - Improved maintainability without changing functionality

### Fixed
- Fixed issue where mcp create command fails without manual npm install
- Fixed missing peer dependencies in generated projects
- Fixed TypeScript compilation errors in generated code
- Improved project template stability by using official SDK patterns
- Fixed resource handling to properly use Resource and ResourceContents types
- Fixed prompt template to follow MCP protocol specifications
- Fixed component loading in compiled code
- Fixed logger initialization errors
- Fixed base model implementation to properly use Zod for schema validation in tools, prompts, and resources
- Fixed type safety issues by properly exporting ResourceContent and other types from base models
- Fixed documentation to clarify base path requirement when running server
- Fixed component loading issues by properly documenting base path configuration

### Known Issues
- The Roo Cline MCP client may not fully support prompt operations
- The Roo Cline server view UI may not properly display MCP tools and resources, though they are functional through the API

### Removed
- Removed git initialization from project creation (non-essential)
- Removed custom MCPServer class usage from templates
- Removed mcp-build script dependency
- Removed manual component registration requirement
- Removed inline template strings from create.ts

### Migration Guide
For existing projects created with older versions:

1. Update dependencies:
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.6.1"
  }
}
```

2. Update your server implementation:
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
```

3. Update your tool implementations to use base classes:
```typescript
import { MCPTool, ToolInputSchema } from "mcp-framework";

interface ExampleInput {
  message: string;
}

class ExampleTool extends MCPTool<ExampleInput> {
  name = "example_tool";
  description = "An example tool that processes messages";

  protected schema: ToolInputSchema<ExampleInput> = {
    message: {
      type: z.string(),
      description: "Message to process",
    }
  };

  protected async execute(input: ExampleInput) {
    return `Processed: ${input.message}`;
  }
}
```

4. Update your prompt implementations to use base classes:
```typescript
import { MCPPrompt, PromptArgumentSchema } from "mcp-framework";

interface PromptInput {
  query: string;
}

class ExamplePrompt extends MCPPrompt<PromptInput> {
  name = "example_prompt";
  description = "An example prompt";

  protected schema: PromptArgumentSchema<PromptInput> = {
    query: {
      type: z.string(),
      description: "Query to process",
      required: true
    }
  };

  protected async generateMessages(input: PromptInput) {
    return [
      {
        role: "system",
        content: { type: "text", text: "You are a helpful assistant." }
      },
      {
        role: "user",
        content: { type: "text", text: input.query }
      }
    ];
  }
}
```

5. Update your resource implementations to use base classes:
```typescript
import { MCPResource } from "mcp-framework";

class ExampleResource extends MCPResource {
  name = "example";
  description = "An example resource";
  uri = "example://";

  async read() {
    return [
      {
        uri: this.uri,
        text: "Example content"
      }
    ];
  }
}
```

6. Add logger and component loader:
```typescript
// Add utils/logger.ts and utils/componentLoader.ts from new project template
// Update server to use auto-loading:
const toolLoader = new ComponentLoader<Tool>(basePath, "tools", validateTool);
const tools = await toolLoader.loadComponents();
```

7. Update .gitignore for logs:
```bash
echo "logs/*.log" >> .gitignore
```

Note: The logs directory will be created automatically when the server starts.