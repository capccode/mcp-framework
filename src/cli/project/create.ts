import { spawnSync } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import prompts from "prompts";
import { generateReadme } from "./templates/readme.js";
import { generateLogger, generateComponentLoader } from "./templates/utils.js";
import { generateExampleTool, generateExamplePrompt, generateExampleResource } from "./templates/components.js";
import { generatePackageJson, generateTsConfig, generateGitIgnore, generateIndexTs } from "./templates/config.js";
import { toPascalCase } from "../utils/string-utils.js";

export async function createProject(name?: string) {
  let projectName: string;

  if (!name) {
    const response = await prompts({
      type: "text",
      name: "projectName",
      message: "What is the name of your MCP server project?",
      validate: (value: string) =>
        /^[a-z0-9-]+$/.test(value)
          ? true
          : "Project name can only contain lowercase letters, numbers, and hyphens",
    });

    if (!response.projectName) {
      console.log("Project creation cancelled");
      process.exit(1);
    }

    projectName = response.projectName;
  } else {
    projectName = name;
  }

  if (!projectName) {
    throw new Error("Project name is required");
  }

  const className = toPascalCase(projectName);
  const projectDir = join(process.cwd(), projectName);
  const srcDir = join(projectDir, "src");
  const utilsDir = join(srcDir, "utils");
  const toolsDir = join(srcDir, "tools");
  const promptsDir = join(srcDir, "prompts");
  const resourcesDir = join(srcDir, "resources");
  const exampleToolDir = join(toolsDir, "example-tool");
  const examplePromptDir = join(promptsDir, "example-prompt");
  const exampleResourceDir = join(resourcesDir, "example-resource");
  const logsDir = join(projectDir, "logs");

  try {
    console.log("Creating project structure...");
    await Promise.all([
      mkdir(projectDir, { recursive: true }),
      mkdir(srcDir, { recursive: true }),
      mkdir(utilsDir, { recursive: true }),
      mkdir(toolsDir, { recursive: true }),
      mkdir(promptsDir, { recursive: true }),
      mkdir(resourcesDir, { recursive: true }),
      mkdir(exampleToolDir, { recursive: true }),
      mkdir(examplePromptDir, { recursive: true }),
      mkdir(exampleResourceDir, { recursive: true }),
      mkdir(logsDir, { recursive: true }),
    ]).catch((error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create project directories: ${errorMessage}`);
    });

    console.log("Creating project files...");
    await Promise.all([
      writeFile(
        join(projectDir, "package.json"),
        generatePackageJson(projectName)
      ),
      writeFile(
        join(projectDir, "tsconfig.json"),
        generateTsConfig()
      ),
      writeFile(
        join(projectDir, ".gitignore"),
        generateGitIgnore()
      ),
      writeFile(join(projectDir, "README.md"), generateReadme(projectName)),
      writeFile(join(srcDir, "index.ts"), generateIndexTs(projectName)),
      writeFile(join(utilsDir, "logger.ts"), generateLogger()),
      writeFile(join(utilsDir, "componentLoader.ts"), generateComponentLoader()),
      writeFile(join(exampleToolDir, "index.ts"), generateExampleTool()),
      writeFile(join(examplePromptDir, "index.ts"), generateExamplePrompt()),
      writeFile(join(exampleResourceDir, "index.ts"), generateExampleResource()),
    ]).catch((error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create project files: ${errorMessage}`);
    });

    console.log("Installing dependencies...");
    const npmInstall = spawnSync("npm", ["install"], {
      cwd: projectDir,
      stdio: "inherit",
      shell: true,
      encoding: 'utf-8'
    });

    if (npmInstall.error) {
      throw new Error(`Failed to install dependencies: ${npmInstall.error.message}`);
    }
    if (npmInstall.status !== 0) {
      throw new Error(`Failed to install dependencies (exit code: ${npmInstall.status})`);
    }

    console.log("Building project...");
    const npmBuild = spawnSync("npm", ["run", "build"], {
      cwd: projectDir,
      stdio: "inherit",
      shell: true,
      encoding: 'utf-8'
    });

    if (npmBuild.error) {
      throw new Error(`Failed to build project: ${npmBuild.error.message}`);
    }
    if (npmBuild.status !== 0) {
      throw new Error(`Failed to build project (exit code: ${npmBuild.status})`);
    }

    console.log(`
Project ${projectName} created and built successfully!

You can now:
1. cd ${projectName}
2. Add more tools using:
   mcp add tool <name>
3. Add more prompts using:
   mcp add prompt <name>
4. Add more resources using:
   mcp add resource <name>

Components will be automatically discovered and loaded!
    `);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating project:", errorMessage);
    process.exit(1);
  }
}
