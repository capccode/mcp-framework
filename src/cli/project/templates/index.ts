export function generateIndexTs(projectName: string): string {
  const className = projectName.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  
  return `#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  McpError,
  ErrorCode
} from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

import { logger } from "./utils/logger.js";

// Import example components
import ExampleTool from "./tools/example-tool/index.js";
import ExamplePrompt from "./prompts/example-prompt/index.js";
import ExampleResource from "./resources/example-resource/index.js";

// Define interfaces to match MCP protocol
interface Tool {
  name: string;
  description: string;
  inputSchema: {
    parse: (args: any) => any;
    jsonSchema: any;
  };
  handler: (args: any) => Promise<{
    content: Array<{
      type: "text";
      text: string;
    }>;
  }>;
}

interface Prompt {
  name: string;
  description: string;
  inputSchema: any;
  getMessages: (args: any) => Promise<any>;
}

interface Resource {
  name: string;
  description: string;
  read: () => Promise<any>;
}

// Resource content interface
interface ResourceContent {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  text: string;
}

// Utility to expand home directory
function expandHome(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

class ${className}Server {
  private server: Server;
  private tools: Map<string, Tool> = new Map();
  private prompts: Map<string, Prompt> = new Map();
  private resources: Map<string, Resource> = new Map();

  constructor(private basePath: string) {
    // Validate and set up base path
    const expandedPath = expandHome(basePath);
    this.basePath = path.resolve(expandedPath);

    logger.info(\`Initializing server with base path: \${this.basePath}\`);

    // Initialize server with capabilities
    this.server = new Server(
      {
        name: "${projectName}",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {
            list: true,
            call: true
          },
          prompts: {
            list: true,
            get: true
          },
          resources: {
            list: true,
            read: true
          }
        }
      }
    );

    // Set up handlers
    this.setupHandlers();

    // Error handling
    this.server.onerror = (error) => {
      logger.error(\`[MCP Error] \${error}\`);
    };

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await this.stop();
      process.exit(0);
    });

    process.on('uncaughtException', async (error) => {
      logger.error(\`[Uncaught Exception] \${error}\`);
      await this.stop();
      process.exit(1);
    });
  }

  registerTool(tool: Tool) {
    logger.debug(\`Registering tool: \${tool.name}\`);
    this.tools.set(tool.name, tool);
    logger.debug(\`Current tools: \${Array.from(this.tools.keys()).join(', ')}\`);
  }

  registerPrompt(prompt: Prompt) {
    logger.debug(\`Registering prompt: \${prompt.name}\`);
    this.prompts.set(prompt.name, prompt);
    logger.debug(\`Current prompts: \${Array.from(this.prompts.keys()).join(', ')}\`);
  }

  registerResource(resource: Resource) {
    logger.debug(\`Registering resource: \${resource.name}\`);
    this.resources.set(resource.name, resource);
    logger.debug(\`Current resources: \${Array.from(this.resources.keys()).join(', ')}\`);
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Array.from(this.tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema.jsonSchema
      }))
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const tool = this.tools.get(name);
      if (!tool) {
        throw new McpError(ErrorCode.MethodNotFound, \`Unknown tool: \${name}\`);
      }

      try {
        // Validate and transform arguments using tool's schema handler
        const validatedArgs = tool.inputSchema.parse(args || {});
        
        // Execute tool with validated arguments
        const result = await tool.handler(validatedArgs);
        
        return {
          _meta: {
            toolName: name,
            timestamp: new Date().toISOString(),
            success: true
          },
          ...result
        };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          \`Tool execution failed: \${error instanceof Error ? error.message : String(error)}\`
        );
      }
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: Array.from(this.prompts.values()).map(prompt => ({
        name: prompt.name,
        description: prompt.description,
        inputSchema: prompt.inputSchema
      }))
    }));

    // Handle prompt requests
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const prompt = this.prompts.get(name);
      if (!prompt) {
        throw new McpError(ErrorCode.MethodNotFound, \`Unknown prompt: \${name}\`);
      }

      try {
        return {
          messages: await prompt.getMessages(args)
        };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          \`Prompt execution failed: \${error instanceof Error ? error.message : String(error)}\`
        );
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      try {
        const allResources = [];
        for (const resource of this.resources.values()) {
          const contents = await resource.read();
          allResources.push(...contents);
        }
        return { resources: allResources };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          \`Failed to list resources: \${error instanceof Error ? error.message : String(error)}\`
        );
      }
    });

    // Handle resource requests
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params?.uri;
      if (!uri || typeof uri !== 'string') {
        throw new McpError(ErrorCode.InvalidParams, "Missing or invalid URI parameter");
      }

      // Find the resource handler based on URI scheme
      const scheme = uri.split('://')[0];
      const resource = this.resources.get(scheme);
      if (!resource) {
        throw new McpError(ErrorCode.InvalidParams, \`Unsupported resource type: \${scheme}\`);
      }

      try {
        const contents = await resource.read();
        const content = contents.find((c: ResourceContent) => c.uri === uri);
        if (!content) {
          throw new McpError(ErrorCode.InvalidParams, \`Resource not found: \${uri}\`);
        }
        return { contents: [content] };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          \`Resource read failed: \${error instanceof Error ? error.message : String(error)}\`
        );
      }
    });
  }

  async start() {
    try {
      // Create and register components
      const tools: Tool[] = [
        new ExampleTool(this.basePath)
      ];

      const prompts: Prompt[] = [
        new ExamplePrompt(this.basePath)
      ];

      const resources: Resource[] = [
        new ExampleResource(this.basePath)
      ];

      // Register components
      for (const tool of tools) {
        try {
          this.registerTool(tool);
        } catch (error) {
          logger.error(\`Error registering tool \${tool.name}: \${error instanceof Error ? error.message : String(error)}\`);
          throw error;
        }
      }

      for (const prompt of prompts) {
        try {
          this.registerPrompt(prompt);
        } catch (error) {
          logger.error(\`Error registering prompt \${prompt.name}: \${error instanceof Error ? error.message : String(error)}\`);
          throw error;
        }
      }

      for (const resource of resources) {
        try {
          this.registerResource(resource);
        } catch (error) {
          logger.error(\`Error registering resource \${resource.name}: \${error instanceof Error ? error.message : String(error)}\`);
          throw error;
        }
      }

      logger.info("All components registered successfully");

      // Connect transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info("${projectName} MCP Server running on stdio");
    } catch (error) {
      logger.error(\`Failed to start server: \${error}\`);
      throw error;
    }
  }

  async stop() {
    await this.server.close();
    logger.info("${projectName} MCP Server stopped");
  }
}

// Start server if this is the main module
if (import.meta.url === new URL(import.meta.url).href) {
  const basePath = process.argv[2];
  if (!basePath) {
    logger.error("Please provide the base path as an argument");
    process.exit(1);
  }

  const server = new ${className}Server(basePath);
  server.start().catch(error => {
    logger.error(\`Failed to start server: \${error}\`);
    process.exit(1);
  });
}`;
}