import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from "../../utils/logger.js";
import { MCPResource } from "mcp-framework";

// Extend MCPResource for type safety and protocol compliance
class ExampleResource extends MCPResource {
  name = "example";
  description = "An example resource provider";
  uri = "example://";  // Base URI for this resource
  private resourceDir: string;

  constructor(private basePath: string) {
    super();
    logger.debug(`Initializing ExampleResource with base path: ${basePath}`);
    this.resourceDir = path.join(basePath, 'resources');
    this.initializeResourceDir();
  }

  private async initializeResourceDir() {
    try {
      await fs.mkdir(this.resourceDir, { recursive: true });
      const files = await fs.readdir(this.resourceDir);
      if (files.length === 0) {
        const sampleContent = "This is a sample resource file.\nYou can add more files to the resources directory.";
        await fs.writeFile(path.join(this.resourceDir, 'sample.txt'), sampleContent);
      }
    } catch (error) {
      logger.error(`Failed to initialize resource directory: ${error}`);
    }
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
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

  async list() {
    try {
      logger.debug('Listing example resources');
      const files = await fs.readdir(this.resourceDir);
      return files.map(file => ({
        uri: `${this.uri}${file}`,
        name: file,
        description: `Example resource file: ${file}`,
        mimeType: this.getMimeType(file)
      }));
    } catch (error: any) {
      logger.error(`Failed to list resources: ${error.message}`);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list resources: ${error.message}`
      );
    }
  }

  async read() {
    try {
      logger.debug('Reading example resources');
      const files = await fs.readdir(this.resourceDir);
      const contents = [];

      for (const file of files) {
        const filePath = path.join(this.resourceDir, file);
        const mimeType = this.getMimeType(file);
        const isText = this.isTextFile(mimeType);
        const uri = `${this.uri}${file}`;

        if (isText) {
          const content = await fs.readFile(filePath, 'utf-8');
          contents.push({
            uri,
            mimeType,
            text: content
          });
        } else {
          const content = await fs.readFile(filePath);
          contents.push({
            uri,
            mimeType,
            blob: content.toString('base64')
          });
        }
      }

      return contents;
    } catch (error: any) {
      logger.error(`Failed to read resources: ${error.message}`);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to read resources: ${error.message}`
      );
    }
  }
}

export default ExampleResource;