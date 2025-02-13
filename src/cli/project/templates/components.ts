export function generateExampleTool(): string {
  return `import { z } from "zod";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../../utils/logger.js";
import { zodToJsonSchema } from "zod-to-json-schema";

// Define input schema
const schema = z.object({
  message: z.string()
    .min(1, "Message must not be empty")
    .describe("Message to process")
}).strict();

type ExampleInput = z.infer<typeof schema>;

// Create tool class that implements Tool interface
export default class ExampleTool {
  name = "example_tool";
  description = "An example tool that processes messages";

  // Schema handler with validation and JSON Schema conversion
  inputSchema = {
    parse: (args: unknown) => schema.parse(args),
    jsonSchema: zodToJsonSchema(schema, {
      target: 'jsonSchema7',
      definitionPath: 'schemas'
    })
  };

  constructor(private basePath: string) {
    logger.debug(\`Initializing ExampleTool with base path: \${basePath}\`);
  }

  async handler(input: ExampleInput): Promise<{
    content: Array<{
      type: "text";
      text: string;
    }>;
  }> {
    const { message } = input;
    
    try {
      logger.debug(\`Processing message: \${message}\`);
      return {
        content: [
          {
            type: "text" as const,
            text: \`Processed: \${message}\`
          }
        ]
      };
    } catch (error) {
      logger.error(\`ExampleTool execution failed: \${error instanceof Error ? error.message : String(error)}\`);
      throw new McpError(
        ErrorCode.InternalError,
        \`Tool execution failed: \${error instanceof Error ? error.message : String(error)}\`
      );
    }
  }
}`;
}

// For backward compatibility with add-tool.ts
export const createToolTemplate = (toolName: string, className: string): string => {
  return `import { z } from "zod";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../../utils/logger.js";
import { zodToJsonSchema } from "zod-to-json-schema";

// Define input schema
const schema = z.object({
  param: z.string()
    .min(1, "Parameter must not be empty")
    .describe("Parameter description")
}).strict();

type ${className}Input = z.infer<typeof schema>;

// Create tool class that implements Tool interface
export default class ${className}Tool {
  name = "${toolName}";
  description = "${className} tool description";

  // Schema handler with validation and JSON Schema conversion
  inputSchema = {
    parse: (args: unknown) => schema.parse(args),
    jsonSchema: zodToJsonSchema(schema, {
      target: 'jsonSchema7',
      definitionPath: 'schemas'
    })
  };

  constructor(private basePath: string) {
    logger.debug(\`Initializing ${className}Tool with base path: \${basePath}\`);
  }

  async handler(input: ${className}Input): Promise<{
    content: Array<{
      type: "text";
      text: string;
    }>;
  }> {
    const { param } = input;
    
    try {
      logger.debug(\`Processing param: \${param}\`);
      return {
        content: [
          {
            type: "text" as const,
            text: \`${className} processed: \${param}\`
          }
        ]
      };
    } catch (error) {
      logger.error(\`${className}Tool execution failed: \${error instanceof Error ? error.message : String(error)}\`);
      throw new McpError(
        ErrorCode.InternalError,
        \`Tool execution failed: \${error instanceof Error ? error.message : String(error)}\`
      );
    }
  }
}`;
};

export function generateExamplePrompt(): string {
  return `import { z } from "zod";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../../utils/logger.js";
import { zodToJsonSchema } from "zod-to-json-schema";

// Define input schema
const schema = z.object({
  param: z.string()
    .min(1, "Parameter must not be empty")
    .describe("Parameter description")
}).strict();

type ExamplePromptInput = z.infer<typeof schema>;

// Create prompt class that implements Prompt interface
export default class ExamplePrompt {
  name = "example_prompt";
  description = "Example prompt description";

  // Schema for prompt input
  inputSchema = zodToJsonSchema(schema, {
    target: 'jsonSchema7',
    definitionPath: 'schemas'
  });

  constructor(private basePath: string) {
    logger.debug(\`Initializing ExamplePrompt with base path: \${basePath}\`);
  }

  // Get messages for the prompt
  async getMessages(args: unknown): Promise<Array<{
    role: "user" | "assistant";
    content: {
      type: "text";
      text: string;
    };
  }>> {
    try {
      const input = schema.parse(args);
      
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: \`Example prompt with param: \${input.param}\`
          }
        }
      ];
    } catch (error) {
      logger.error(\`ExamplePrompt execution failed: \${error instanceof Error ? error.message : String(error)}\`);
      throw new McpError(
        ErrorCode.InternalError,
        \`Prompt execution failed: \${error instanceof Error ? error.message : String(error)}\`
      );
    }
  }
}`;
}

export function generateExampleResource(): string {
  return `import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../../utils/logger.js";

// Create resource class that implements Resource interface
export default class ExampleResource {
  name = "example";
  description = "Example resource description";

  constructor(private basePath: string) {
    logger.debug(\`Initializing ExampleResource with base path: \${basePath}\`);
  }

  // Read resource content
  async read(): Promise<Array<{
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
    text: string;
  }>> {
    try {
      return [
        {
          uri: "example://sample",
          name: "Example Resource",
          description: "A sample resource",
          mimeType: "text/plain",
          text: "This is an example resource"
        }
      ];
    } catch (error) {
      logger.error(\`ExampleResource read failed: \${error instanceof Error ? error.message : String(error)}\`);
      throw new McpError(
        ErrorCode.InternalError,
        \`Resource read failed: \${error instanceof Error ? error.message : String(error)}\`
      );
    }
  }
}`;
}