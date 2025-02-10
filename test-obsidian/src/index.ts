#!/usr/bin/env node
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
import { ComponentLoader } from "./utils/componentLoader.js";
import { MCPTool, MCPPrompt, MCPResource } from "mcp-framework";

// Utility to expand home directory
function expandHome(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

class TestObsidianServer {
  private server: Server;
  private tools: Map<string, MCPTool> = new Map();
  private prompts: Map<string, MCPPrompt> = new Map();
  private resources: Map<string, MCPResource> = new Map();

  constructor(private basePath: string) {
    // Validate and set up base path
    const expandedPath = expandHome(basePath);
    this.basePath = path.resolve(expandedPath);

    logger.info(`Initializing server with base path: ${this.basePath}`);

    // Initialize server
    this.server = new Server(
      {
        name: "test-obsidian",
        version: "0.0.1",
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
          resources: {}
        }
      }
    );

    // Set up handlers
    this.setupHandlers();

    // Error handling
    this.server.onerror = (error) => {
      logger.error(`[MCP Error] ${error}`);
    };

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await this.stop();
      process.exit(0);
    });

    process.on('uncaughtException', async (error) => {
      logger.error(`[Uncaught Exception] ${error}`);
      await this.stop();
      process.exit(1);
    });
  }

  private async loadComponents() {
    // Initialize loaders
    const toolLoader = new ComponentLoader<MCPTool>(
      this.basePath,
      "tools",
      (component): component is MCPTool =>
        Boolean(
          component &&
          typeof component.name === "string" &&
          typeof component.description === "string" &&
          component.inputSchema &&
          typeof component.toolCall === "function"
        )
    );

    const promptLoader = new ComponentLoader<MCPPrompt>(
      this.basePath,
      "prompts",
      (component): component is MCPPrompt =>
        Boolean(
          component &&
          typeof component.name === "string" &&
          typeof component.description === "string" &&
          component.promptDefinition &&
          typeof component.getMessages === "function"
        )
    );

    const resourceLoader = new ComponentLoader<MCPResource>(
      this.basePath,
      "resources",
      (component): component is MCPResource =>
        Boolean(
          component &&
          typeof component.name === "string" &&
          typeof component.description === "string" &&
          typeof component.read === "function"
        )
    );

    // Load components
    const tools = await toolLoader.loadComponents();
    this.tools = new Map(tools.map(tool => [tool.name, tool]));
    logger.info(`Loaded tools: ${Array.from(this.tools.keys()).join(", ")}`);

    const prompts = await promptLoader.loadComponents();
    this.prompts = new Map(prompts.map(prompt => [prompt.name, prompt]));
    logger.info(`Loaded prompts: ${Array.from(this.prompts.keys()).join(", ")}`);

    const resources = await resourceLoader.loadComponents();
    this.resources = new Map(resources.map(resource => [resource.name, resource]));
    logger.info(`Loaded resources: ${Array.from(this.resources.keys()).join(", ")}`);
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Array.from(this.tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
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
        return await tool.toolCall(request);
      } catch (error: any) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: Array.from(this.prompts.values()).map(prompt => ({
        name: prompt.name,
        description: prompt.description,
        inputSchema: prompt.promptDefinition
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
      } catch (error: any) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Prompt execution failed: ${error.message}`
        );
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const allResources = [];
      for (const resource of this.resources.values()) {
        const resources = await resource.read();
        allResources.push(...resources);
      }
      return { resources: allResources };
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
        const content = contents.find(c => c.uri === uri);
        if (!content) {
          throw new McpError(ErrorCode.InvalidParams, `Resource not found: ${uri}`);
        }
        return { contents: [content] };
      } catch (error: any) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Resource read failed: ${error.message}`
        );
      }
    });
  }

  async start() {
    try {
      // Load all components
      await this.loadComponents();

      // Connect transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info("test-obsidian MCP Server running on stdio");
    } catch (error) {
      logger.error(`Failed to start server: ${error}`);
      throw error;
    }
  }

  async stop() {
    await this.server.close();
    logger.info("test-obsidian MCP Server stopped");
  }
}

// Start server if this is the main module
if (import.meta.url === new URL(import.meta.url).href) {
  const basePath = process.argv[2];
  if (!basePath) {
    logger.error("Please provide the base path as an argument");
    process.exit(1);
  }

  const server = new TestObsidianServer(basePath);
  server.start().catch(error => {
    logger.error(`Failed to start server: ${error}`);
    process.exit(1);
  });
}