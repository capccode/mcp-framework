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
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { logger } from "../utils/logger.js";

interface PackageJson {
  name?: string;
  version?: string;
}

export interface MCPServerConfig {
  name?: string;
  version?: string;
  basePath?: string;
}

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

export class MCPServer {
  private server: Server;
  private tools: Map<string, Tool> = new Map();
  private prompts: Map<string, Prompt> = new Map();
  private resources: Map<string, Resource> = new Map();
  private serverName: string;
  private serverVersion: string;
  private basePath: string;

  constructor(config: MCPServerConfig = {}) {
    this.basePath = this.resolveBasePath(config.basePath);
    const defaultName = this.getDefaultName();
    const defaultVersion = this.getDefaultVersion();
    
    this.serverName = config.name ?? defaultName;
    this.serverVersion = config.version ?? defaultVersion;

    logger.info(
      `Initializing MCP Server: ${this.serverName}@${this.serverVersion}`
    );

    this.server = new Server(
      {
        name: this.serverName,
        version: this.serverVersion,
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

    this.setupHandlers();
  }

  private readPackageJson(): PackageJson | null {
    try {
      const packagePath = join(dirname(this.basePath), "package.json");
      const packageContent = readFileSync(packagePath, "utf-8");
      const packageJson = JSON.parse(packageContent) as PackageJson;
      logger.debug(`Successfully read package.json from: ${packagePath}`);
      return packageJson;
    } catch (error: unknown) {
      logger.warn(`Could not read package.json: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private getDefaultName(): string {
    const packageJson = this.readPackageJson();
    if (packageJson?.name) {
      logger.info(`Using name from package.json: ${packageJson.name}`);
      return packageJson.name;
    }
    return "unnamed-mcp-server";
  }

  private getDefaultVersion(): string {
    const packageJson = this.readPackageJson();
    if (packageJson?.version) {
      logger.info(`Using version from package.json: ${packageJson.version}`);
      return packageJson.version;
    }
    return "0.0.0";
  }

  private resolveBasePath(configPath?: string): string {
    return configPath ?? process.argv[1] ?? process.cwd();
  }

  registerTool(tool: Tool) {
    logger.debug(`Registering tool: ${tool.name}`);
    this.tools.set(tool.name, tool);
    logger.debug(`Current tools: ${Array.from(this.tools.keys()).join(', ')}`);
  }

  registerPrompt(prompt: Prompt) {
    logger.debug(`Registering prompt: ${prompt.name}`);
    this.prompts.set(prompt.name, prompt);
    logger.debug(`Current prompts: ${Array.from(this.prompts.keys()).join(', ')}`);
  }

  registerResource(resource: Resource) {
    logger.debug(`Registering resource: ${resource.name}`);
    this.resources.set(resource.name, resource);
    logger.debug(`Current resources: ${Array.from(this.resources.keys()).join(', ')}`);
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
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
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
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
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
        throw new McpError(ErrorCode.MethodNotFound, `Unknown prompt: ${name}`);
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
          `Prompt execution failed: ${error instanceof Error ? error.message : String(error)}`
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
          `Failed to list resources: ${error instanceof Error ? error.message : String(error)}`
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
        throw new McpError(ErrorCode.InvalidParams, `Unsupported resource type: ${scheme}`);
      }

      try {
        const contents = await resource.read();
        const content = contents.find((c: ResourceContent) => c.uri === uri);
        if (!content) {
          throw new McpError(ErrorCode.InvalidParams, `Resource not found: ${uri}`);
        }
        return { contents: [content] };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Resource read failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  public async start(): Promise<void> {
    try {
      logger.info(`Started ${this.serverName}@${this.serverVersion}`);

      if (this.tools.size > 0) {
        logger.info(`Tools (${this.tools.size}): ${Array.from(this.tools.keys()).join(", ")}`);
      }
      if (this.prompts.size > 0) {
        logger.info(`Prompts (${this.prompts.size}): ${Array.from(this.prompts.keys()).join(", ")}`);
      }
      if (this.resources.size > 0) {
        logger.info(`Resources (${this.resources.size}): ${Array.from(this.resources.keys()).join(", ")}`);
      }

      const transport = new StdioServerTransport();
      await this.server.connect(transport);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Server initialization error: ${errorMessage}`);
      throw error;
    }
  }
}
