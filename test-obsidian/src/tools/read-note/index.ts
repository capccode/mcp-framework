import { z } from "zod";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../../utils/logger.js";
import { MCPTool, ToolInputSchema } from "mcp-framework";

// Define input type with strict typing
interface ReadNoteInput {
  // Define your tool's input parameters here
  param: string;
}

// Define response type for better type safety
interface ReadNoteResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

// Extend MCPTool with input type for type safety
class ReadNoteTool extends MCPTool<ReadNoteInput> {
  name = "read-note";
  description = "ReadNote tool description";

  // Schema is validated by base class
  protected schema: ToolInputSchema<ReadNoteInput> = {
    param: {
      type: z.string().min(1, "Parameter must not be empty"),
      description: "Parameter description",
    }
  };

  constructor(private basePath: string) {
    super();
    logger.debug(`Initializing ReadNoteTool with base path: ${basePath}`);
  }

  // Implementation with type-safe input and response
  protected async execute(input: ReadNoteInput): Promise<ReadNoteResponse> {
    const { param } = input;
    
    try {
      logger.debug(`Executing ReadNoteTool with param: ${param}`);
      
      // Add your tool implementation here
      // This is just a sample implementation
      const processedResult = await this.processParam(param);
      
      return {
        content: [
          {
            type: "text",
            text: processedResult
          }
        ]
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`ReadNoteTool execution failed: ${errorMessage}`);
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${errorMessage}`
      );
    }
  }

  // Example helper method - replace with your actual implementation
  private async processParam(param: string): Promise<string> {
    // Add your processing logic here
    return `ReadNote processed: ${param}`;
  }
}

export default ReadNoteTool;