import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ToolProtocol } from "../tools/BaseTool.js";
import { PromptProtocol } from "../prompts/BasePrompt.js";
import { ResourceProtocol } from "../resources/BaseResource.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { logger } from "./Logger.js";
import { ToolLoader } from "../loaders/toolLoader.js";
import { PromptLoader } from "../loaders/promptLoader.js";
import { ResourceLoader } from "../loaders/resourceLoader.js";

interface PackageJson {
  name?: string;
  version?: string;
}

export interface MCPServerConfig {
  name?: string;
  version?: string;
  basePath?: string;
}

export type ServerCapabilities = {
  tools?: {
    enabled: true;
  };
  schemas?: {
    enabled: true;
  };
  prompts?: {
    enabled: true;
  };
  resources?: {
    enabled: true;
  };
};

interface ToolRequest {
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
  method: 'tools/call';
}

export class MCPServer {
  private server: Server;
  private toolsMap: Map<string, ToolProtocol> = new Map();
  private promptsMap: Map<string, PromptProtocol> = new Map();
  private resourcesMap: Map<string, ResourceProtocol> = new Map();
  private toolLoader: ToolLoader;
  private promptLoader: PromptLoader;
  private resourceLoader: ResourceLoader;
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

    this.toolLoader = new ToolLoader(this.basePath);
    this.promptLoader = new PromptLoader(this.basePath);
    this.resourceLoader = new ResourceLoader(this.basePath);

    this.server = new Server(
      {
        name: this.serverName,
        version: this.serverVersion,
      },
      {
        capabilities: {
          tools: { enabled: true },
          prompts: { enabled: false },
          resources: { enabled: false },
        },
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

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Array.from(this.toolsMap.values()).map((tool) => tool.toolDefinition),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const tool = this.toolsMap.get(request.params.name);
      if (!tool) {
        throw new Error(
          `Unknown tool: ${request.params.name}. Available tools: ${Array.from(this.toolsMap.keys()).join(", ")}`
        );
      }

      const toolRequest: ToolRequest = {
        params: {
          name: request.params.name,
          arguments: request.params.arguments ?? {}
        },
        method: "tools/call",
      };

      return tool.toolCall(toolRequest);
    });

    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: Array.from(this.promptsMap.values()).map((prompt) => prompt.promptDefinition),
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const prompt = this.promptsMap.get(request.params.name);
      if (!prompt) {
        throw new Error(
          `Unknown prompt: ${request.params.name}. Available prompts: ${Array.from(this.promptsMap.keys()).join(", ")}`
        );
      }

      return {
        messages: await prompt.getMessages(request.params.arguments ?? {}),
      };
    });

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: Array.from(this.resourcesMap.values()).map((resource) => resource.resourceDefinition),
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request: { params: { uri: string } }) => {
      const resource = this.resourcesMap.get(request.params.uri);
      if (!resource) {
        throw new Error(
          `Unknown resource: ${request.params.uri}. Available resources: ${Array.from(this.resourcesMap.keys()).join(", ")}`
        );
      }

      return {
        contents: await resource.read(),
      };
    });

    this.server.setRequestHandler(SubscribeRequestSchema, async (request: { params: { uri: string } }) => {
      const resource = this.resourcesMap.get(request.params.uri);
      if (!resource) {
        throw new Error(`Unknown resource: ${request.params.uri}`);
      }

      if (!resource.subscribe) {
        throw new Error(`Resource ${request.params.uri} does not support subscriptions`);
      }

      await resource.subscribe();
      return {};
    });

    this.server.setRequestHandler(UnsubscribeRequestSchema, async (request: { params: { uri: string } }) => {
      const resource = this.resourcesMap.get(request.params.uri);
      if (!resource) {
        throw new Error(`Unknown resource: ${request.params.uri}`);
      }

      if (!resource.unsubscribe) {
        throw new Error(`Resource ${request.params.uri} does not support subscriptions`);
      }

      await resource.unsubscribe();
      return {};
    });
  }

  private async detectCapabilities(): Promise<ServerCapabilities> {
    const capabilities: ServerCapabilities = {};
    
    const [hasTools, hasPrompts, hasResources] = await Promise.all([
      this.toolLoader.hasTools(),
      this.promptLoader.hasPrompts(),
      this.resourceLoader.hasResources()
    ]);

    if (hasTools) {
      capabilities.tools = { enabled: true };
      logger.debug("Tools capability enabled");
    }

    if (hasPrompts) {
      capabilities.prompts = { enabled: true };
      logger.debug("Prompts capability enabled");
    }

    if (hasResources) {
      capabilities.resources = { enabled: true };
      logger.debug("Resources capability enabled");
    }

    return capabilities;
  }

  public async start(): Promise<void> {
    try {
      const [tools, prompts, resources] = await Promise.all([
        this.toolLoader.loadTools(),
        this.promptLoader.loadPrompts(),
        this.resourceLoader.loadResources()
      ]);

      this.toolsMap = new Map(tools.map((tool) => [tool.name, tool]));
      this.promptsMap = new Map(prompts.map((prompt) => [prompt.name, prompt]));
      this.resourcesMap = new Map(resources.map((resource) => [resource.uri, resource]));

      const capabilities = await this.detectCapabilities();
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      logger.info(`Started ${this.serverName}@${this.serverVersion}`);

      if (tools.length > 0) {
        logger.info(`Tools (${tools.length}): ${Array.from(this.toolsMap.keys()).join(", ")}`);
      }
      if (prompts.length > 0) {
        logger.info(`Prompts (${prompts.length}): ${Array.from(this.promptsMap.keys()).join(", ")}`);
      }
      if (resources.length > 0) {
        logger.info(`Resources (${resources.length}): ${Array.from(this.resourcesMap.keys()).join(", ")}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Server initialization error: ${errorMessage}`);
      throw error;
    }
  }
}
