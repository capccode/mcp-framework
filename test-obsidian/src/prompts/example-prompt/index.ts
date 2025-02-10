import { z } from "zod";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../../utils/logger.js";
import { MCPPrompt, PromptArgumentSchema } from "mcp-framework";

// Define input type
interface ExamplePromptInput {
  query: string;
}

// Extend MCPPrompt with input type for type safety
class ExamplePrompt extends MCPPrompt<ExamplePromptInput> {
  name = "example_prompt";
  description = "An example prompt that generates responses";

  // Schema is validated by base class
  protected schema: PromptArgumentSchema<ExamplePromptInput> = {
    query: {
      type: z.string(),  // Use z.string() directly
      description: "Query to process",
      required: true
    }
  };

  constructor(private basePath: string) {
    super();
    logger.debug(`Initializing ExamplePrompt with base path: ${basePath}`);
  }

  // Implementation with type-safe input
  protected async generateMessages(input: ExamplePromptInput) {
    const { query } = input;
    
    try {
      logger.debug(`Processing query: ${query}`);
      return [
        {
          role: "system",
          content: {
            type: "text",
            text: "You are a helpful assistant."
          }
        },
        {
          role: "user",
          content: {
            type: "text",
            text: query
          }
        }
      ];
    } catch (error: any) {
      logger.error(`ExamplePrompt execution failed: ${error.message}`);
      throw new McpError(
        ErrorCode.InternalError,
        `Prompt execution failed: ${error.message}`
      );
    }
  }
}

export default ExamplePrompt;