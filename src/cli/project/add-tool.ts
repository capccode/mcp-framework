import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import prompts from "prompts";
import { validateMCPProject } from "../utils/validate-project.js";
import { toPascalCase } from "../utils/string-utils.js";

export async function addTool(name?: string) {
  await validateMCPProject();

  let toolName: string;

  if (!name) {
    const response = await prompts({
      type: "text",
      name: "toolName",
      message: "What is the name of your tool?",
      validate: (value: string) =>
        /^[a-z0-9-]+$/.test(value)
          ? true
          : "Tool name can only contain lowercase letters, numbers, and hyphens",
    });

    if (!response.toolName) {
      console.log("Tool creation cancelled");
      process.exit(1);
    }

    toolName = response.toolName;
  } else {
    toolName = name;
  }

  if (!toolName) {
    throw new Error("Tool name is required");
  }

  const className = toPascalCase(toolName);
  const toolDir = join(process.cwd(), "src/tools", toolName);

  try {
    console.log("Creating tool directory...");
    await mkdir(toolDir, { recursive: true });

    const toolContent = `import { z } from "zod";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../../utils/logger.js";
import { MCPTool, ToolInputSchema } from "mcp-framework";

// Define input type with strict typing
interface ${className}Input {
  // Define your tool's input parameters here
  param: string;
}

// Define response type for better type safety
interface ${className}Response {
  content: Array<{
    type: string;
    text: string;
  }>;
}

// Extend MCPTool with input type for type safety
class ${className}Tool extends MCPTool<${className}Input> {
  name = "${toolName}";
  description = "${className} tool description";

  // Schema is validated by base class
  protected schema: ToolInputSchema<${className}Input> = {
    param: {
      type: z.string().min(1, "Parameter must not be empty"),
      description: "Parameter description",
    }
  };

  constructor(private basePath: string) {
    super();
    logger.debug(\`Initializing ${className}Tool with base path: \${basePath}\`);
  }

  // Implementation with type-safe input and response
  protected async execute(input: ${className}Input): Promise<${className}Response> {
    const { param } = input;
    
    try {
      logger.debug(\`Executing ${className}Tool with param: \${param}\`);
      
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
      logger.error(\`${className}Tool execution failed: \${errorMessage}\`);
      throw new McpError(
        ErrorCode.InternalError,
        \`Tool execution failed: \${errorMessage}\`
      );
    }
  }

  // Example helper method - replace with your actual implementation
  private async processParam(param: string): Promise<string> {
    // Add your processing logic here
    return \`${className} processed: \${param}\`;
  }
}

export default ${className}Tool;`;

    await writeFile(join(toolDir, "index.ts"), toolContent);

    console.log(
      `Tool ${toolName} created successfully at src/tools/${toolName}/index.ts`
    );

    console.log(`
Tool will be automatically discovered and loaded by the server.
You can now:
1. Implement your tool logic in the execute method
2. Add any necessary input parameters to ${className}Input
3. Update the schema and description as needed

The tool extends MCPTool which provides:
- Type-safe input handling
- Automatic schema validation
- Protocol compliance
- Error handling
    `);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating tool:", errorMessage);
    process.exit(1);
  }
}
