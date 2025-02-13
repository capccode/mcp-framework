import { z } from "zod";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../../utils/logger.js";
import { MCPTool, ToolInputSchema } from "mcp-framework";

// Define input type
interface ExampleInput {
  message: string;
}

// Extend MCPTool with input type for type safety
class ExampleTool extends MCPTool<ExampleInput> {
  name = "example_tool";
  description = "An example tool that processes messages";

  // Schema is validated by base class
  protected schema: ToolInputSchema<ExampleInput> = {
    message: {
      type: z.string(),  // Use z.string() directly
      description: "Message to process",
    }
  };

  constructor(private basePath: string) {
    super();
    logger.debug(`Initializing ExampleTool with base path: ${basePath}`);
  }

  // Base execute method required by MCPTool
  public async execute(input: ExampleInput) {
    const { message } = input;
    
    try {
      logger.debug(`Processing message: ${message}`);
      return {
        content: [
          {
            type: "text",
            text: `Processed: ${message}`
          }
        ]
      };
    } catch (error: any) {
      logger.error(`ExampleTool execution failed: ${error.message}`);
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${error.message}`
      );
    }
  }

  // MCP protocol toolCall implementation
  public async toolCall(request: { params: { name: string; arguments?: Record<string, unknown> } }) {
    if (!request.params.arguments) {
      throw new McpError(ErrorCode.InvalidParams, "No arguments provided");
    }

    // Cast arguments to ExampleInput
    const input: ExampleInput = {
      message: String(request.params.arguments.message || "")
    };

    return this.execute(input);
  }
}

export default ExampleTool;