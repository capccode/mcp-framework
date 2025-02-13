import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import prompts from "prompts";
import { validateMCPProject } from "../utils/validate-project.js";
import { toPascalCase } from "../utils/string-utils.js";
import { createToolTemplate } from "./templates/components.js";

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

    const toolContent = createToolTemplate(toolName, className);
    await writeFile(join(toolDir, "index.ts"), toolContent);

    console.log(
      `Tool ${toolName} created successfully at src/tools/${toolName}/index.ts`
    );

    console.log(`
Tool will be automatically discovered and loaded by the server.
You can now:
1. Update the schema with your tool's input parameters
2. Implement your tool logic in the performOperation function
3. Update the description and error handling as needed

The tool uses:
- Zod schema validation
- JSON Schema conversion
- Type-safe input handling
- Standardized error handling
    `);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating tool:", errorMessage);
    process.exit(1);
  }
}
