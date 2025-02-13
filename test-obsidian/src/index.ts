#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./utils/logger.js";
import { mkdir } from 'fs/promises';
import { join } from 'path';

// Ensure logs directory exists
const logsDir = join(process.cwd(), 'logs');
mkdir(logsDir, { recursive: true }).catch(error => {
  console.error(`Failed to create logs directory: ${error}`);
});

// Initialize server
const server = new Server(
  {
    name: "test-obsidian",
    version: "0.0.1",
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "example_tool",
      description: "An example tool that processes messages",
      inputSchema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Message to process"
          }
        },
        required: ["message"]
      }
    }
  ]
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "example_tool") {
    const message = args?.message;
    if (typeof message !== "string") {
      throw new McpError(ErrorCode.InvalidParams, "Message must be a string");
    }

    return {
      content: [
        {
          type: "text",
          text: `Processed: ${message}`
        }
      ]
    };
  }

  throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
});

// Error handling
server.onerror = (error) => {
  logger.error(`[MCP Error] ${error}`);
};

// Connect transport and start server
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  logger.info("test-obsidian MCP Server running on stdio");
}).catch(error => {
  logger.error(`Failed to start server: ${error}`);
  process.exit(1);
});