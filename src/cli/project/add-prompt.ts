import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import prompts from "prompts";
import { validateMCPProject } from "../utils/validate-project.js";
import { toPascalCase } from "../utils/string-utils.js";

export async function addPrompt(name?: string) {
  await validateMCPProject();

  let promptName: string;

  if (!name) {
    const response = await prompts({
      type: "text",
      name: "promptName",
      message: "What is the name of your prompt?",
      validate: (value: string) =>
        /^[a-z0-9-]+$/.test(value)
          ? true
          : "Prompt name can only contain lowercase letters, numbers, and hyphens",
    });

    if (!response.promptName) {
      console.log("Prompt creation cancelled");
      process.exit(1);
    }

    promptName = response.promptName;
  } else {
    promptName = name;
  }

  if (!promptName) {
    throw new Error("Prompt name is required");
  }

  const className = toPascalCase(promptName);
  const promptDir = join(process.cwd(), "src/prompts", promptName);

  try {
    console.log("Creating prompt directory...");
    await mkdir(promptDir, { recursive: true });

    const promptContent = `import { z } from "zod";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../../utils/logger.js";
import { MCPPrompt } from "mcp-framework";

// Define input type with strict typing
interface ${className}Input {
  query: string;
}

// Create prompt class that extends MCPPrompt with input type
export default class ${className}Prompt extends MCPPrompt<${className}Input> {
  name = "${promptName}";
  description = "${className} prompt description";

  // Define schema using Zod directly
  protected schema = z.object({
    query: z.string()
      .min(1, "Query must not be empty")
      .describe("Query to process")
  }).strict();

  constructor(private basePath: string) {
    super();
    logger.debug(\`Initializing ${className}Prompt with base path: \${basePath}\`);
  }

  // Implementation with type-safe input
  protected async generateMessages(input: ${className}Input) {
    const { query } = input;
    
    try {
      logger.debug(\`Generating messages for ${className}Prompt with query: \${query}\`);

      // Return array of messages using helper methods
      return [
        this.createSuccessMessage("You are a helpful assistant.", "system"),
        this.createSuccessMessage(query, "user")
      ];
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        \`Prompt failed: \${error instanceof Error ? error.message : String(error)}\`
      );
    }
  }
}`;

    await writeFile(join(promptDir, "index.ts"), promptContent);

    console.log(
      `Prompt ${promptName} created successfully at src/prompts/${promptName}/index.ts`
    );

    console.log(`
Prompt will be automatically discovered and loaded by the server.
You can now:
1. Update the schema with your prompt's input parameters
2. Implement your message generation logic
3. Use helper methods for creating messages:
   - createSuccessMessage(text, role)
   - createResourceMessage(text, resource, role)
4. Customize the system message and response format

The prompt provides:
- Type-safe input handling with Zod
- Automatic schema validation
- Protocol compliance
- Standardized error handling
    `);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating prompt:", errorMessage);
    process.exit(1);
  }
}
