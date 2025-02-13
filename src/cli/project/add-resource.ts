import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import prompts from "prompts";
import { validateMCPProject } from "../utils/validate-project.js";
import { toPascalCase } from "../utils/string-utils.js";

export async function addResource(name?: string) {
  await validateMCPProject();

  let resourceName: string;

  if (!name) {
    const response = await prompts({
      type: "text",
      name: "resourceName",
      message: "What is the name of your resource?",
      validate: (value: string) =>
        /^[a-z0-9-]+$/.test(value)
          ? true
          : "Resource name can only contain lowercase letters, numbers, and hyphens",
    });

    if (!response.resourceName) {
      console.log("Resource creation cancelled");
      process.exit(1);
    }

    resourceName = response.resourceName;
  } else {
    resourceName = name;
  }

  if (!resourceName) {
    throw new Error("Resource name is required");
  }

  const className = toPascalCase(resourceName);
  const resourceDir = join(process.cwd(), "src/resources", resourceName);

  try {
    console.log("Creating resource directory...");
    await mkdir(resourceDir, { recursive: true });

    const resourceContent = `import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from "../../utils/logger.js";
import { MCPResource, ResourceContent } from "mcp-framework";

// Create resource class that extends MCPResource
export default class ${className}Resource extends MCPResource {
  name = "${resourceName}";
  description = "${className} resource description";
  uri = "${resourceName}://";  // Base URI for this resource
  mimeType = "text/plain";     // Default MIME type
  private resourceDir: string;

  constructor(private basePath: string) {
    super();
    logger.debug(\`Initializing ${className}Resource with base path: \${basePath}\`);
    this.resourceDir = path.join(basePath, 'resources');
    this.initializeResourceDir().catch((error: unknown) => {
      logger.error(\`Failed to initialize resource directory: \${
        error instanceof Error ? error.message : String(error)
      }\`);
    });
  }

  private async initializeResourceDir(): Promise<void> {
    try {
      await fs.mkdir(this.resourceDir, { recursive: true });
      const files = await fs.readdir(this.resourceDir);
      if (files.length === 0) {
        const sampleContent = "This is a sample resource file.\\nYou can add more files to the resources directory.";
        await fs.writeFile(path.join(this.resourceDir, 'sample.txt'), sampleContent);
      }
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        \`Failed to initialize resource directory: \${
          error instanceof Error ? error.message : String(error)
        }\`
      );
    }
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.md': 'text/markdown',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.html': 'text/html',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  private isTextFile(mimeType: string): boolean {
    return mimeType.startsWith('text/') ||
           mimeType === 'application/json' ||
           mimeType === 'application/javascript' ||
           mimeType === 'application/typescript';
  }

  async read(): Promise<ResourceContent[]> {
    try {
      logger.debug('Reading ${className} resources');
      const files = await fs.readdir(this.resourceDir);
      const contents: ResourceContent[] = [];

      for (const file of files) {
        const filePath = path.join(this.resourceDir, file);
        const mimeType = this.getMimeType(file);
        const isText = this.isTextFile(mimeType);
        const uri = \`\${this.uri}\${file}\`;

        try {
          if (isText) {
            const content = await fs.readFile(filePath, 'utf-8');
            contents.push(this.createSuccessResponse({
              uri,
              mimeType,
              text: content
            }));
          } else {
            const content = await fs.readFile(filePath);
            contents.push(this.createSuccessResponse({
              uri,
              mimeType,
              blob: content.toString('base64')
            }));
          }
        } catch (error) {
          logger.warn(\`Failed to read file \${file}: \${
            error instanceof Error ? error.message : String(error)
          }\`);
          // Continue with other files even if one fails
          continue;
        }
      }

      if (contents.length === 0) {
        throw new McpError(
          ErrorCode.NotFound,
          'No readable resources found'
        );
      }

      return contents;
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        \`Failed to read resources: \${
          error instanceof Error ? error.message : String(error)
        }\`
      );
    }
  }

  protected createSuccessResponse(content: ResourceContent): ResourceContent {
    return {
      uri: content.uri,
      mimeType: content.mimeType || this.mimeType,
      text: content.text,
      blob: content.blob
    };
  }
}`;

    await writeFile(join(resourceDir, "index.ts"), resourceContent);

    console.log(
      `Resource ${resourceName} created successfully at src/resources/${resourceName}/index.ts`
    );

    console.log(`
Resource will be automatically discovered and loaded by the server.
You can now:
1. Customize resource content handling
2. Add additional file types and MIME types
3. Update the URI pattern and description
4. Add any resource-specific functionality

The resource provides:
- Standardized content handling
- Proper error handling with McpError
- Automatic MIME type detection
- Helper methods for responses
    `);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating resource:", errorMessage);
    process.exit(1);
  }
}
