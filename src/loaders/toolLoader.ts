import { ToolProtocol } from "../tools/BaseTool.js";
import { join, dirname } from "path";
import { promises as fs } from "fs";
import { logger } from "../core/Logger.js";

export class ToolLoader {
  private readonly TOOLS_DIR: string;
  private readonly EXCLUDED_FILES: ReadonlyArray<string> = ["BaseTool.js", "*.test.js", "*.spec.js"];

  constructor(basePath?: string) {
    const mainModulePath = basePath ?? process.argv[1] ?? process.cwd();
    this.TOOLS_DIR = join(dirname(mainModulePath), "tools");
    logger.debug(`Initialized ToolLoader with directory: ${this.TOOLS_DIR}`);
  }

  async hasTools(): Promise<boolean> {
    try {
      const stats = await fs.stat(this.TOOLS_DIR);
      if (!stats.isDirectory()) {
        logger.debug("Tools path exists but is not a directory");
        return false;
      }

      const files = await fs.readdir(this.TOOLS_DIR);
      const hasValidFiles = files.some((file) => this.isToolFile(file));
      logger.debug(`Tools directory has valid files: ${hasValidFiles}`);
      return hasValidFiles;
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        logger.debug("No tools directory found");
      } else {
        logger.warn(`Error checking tools: ${error instanceof Error ? error.message : String(error)}`);
      }
      return false;
    }
  }

  private isToolFile(file: string): boolean {
    if (!file.endsWith(".js")) return false;
    const isExcluded = this.EXCLUDED_FILES.some((pattern) => {
      if (pattern.includes("*")) {
        const regex = new RegExp(pattern.replace("*", ".*"));
        return regex.test(file);
      }
      return file === pattern;
    });

    logger.debug(
      `Checking file ${file}: ${isExcluded ? "excluded" : "included"}`
    );
    return !isExcluded;
  }

  private validateTool(tool: unknown): tool is ToolProtocol {
    if (!tool || typeof tool !== 'object') {
      logger.warn('Invalid tool: not an object');
      return false;
    }

    const hasName = 'name' in tool && typeof (tool as { name: unknown }).name === 'string';
    const hasDefinition = 'toolDefinition' in tool &&
      typeof (tool as { toolDefinition: unknown }).toolDefinition === 'object' &&
      (tool as { toolDefinition: unknown }).toolDefinition !== null;
    const hasToolCall = 'toolCall' in tool && typeof (tool as { toolCall: unknown }).toolCall === 'function';

    const isValid = hasName && hasDefinition && hasToolCall;

    if (isValid) {
      logger.debug(`Validated tool: ${(tool as ToolProtocol).name}`);
    } else {
      logger.warn(`Invalid tool: missing required properties - name: ${hasName}, definition: ${hasDefinition}, toolCall: ${hasToolCall}`);
    }

    return isValid;
  }

  async loadTools(): Promise<ToolProtocol[]> {
    try {
      logger.debug(`Attempting to load tools from: ${this.TOOLS_DIR}`);

      let stats;
      try {
        stats = await fs.stat(this.TOOLS_DIR);
      } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
          logger.debug("No tools directory found");
        } else {
          logger.warn(`Error accessing tools directory: ${error instanceof Error ? error.message : String(error)}`);
        }
        return [];
      }

      if (!stats.isDirectory()) {
        logger.error(`Path is not a directory: ${this.TOOLS_DIR}`);
        return [];
      }

      const files = await fs.readdir(this.TOOLS_DIR);
      logger.debug(`Found files in directory: ${files.join(", ")}`);

      const tools: ToolProtocol[] = [];

      for (const file of files) {
        if (!this.isToolFile(file)) {
          continue;
        }

        try {
          const fullPath = join(this.TOOLS_DIR, file);
          logger.debug(`Attempting to load tool from: ${fullPath}`);

          const importPath = `file://${fullPath}`;
          const module = await import(importPath) as { default?: new () => unknown };

          if (!module.default || typeof module.default !== 'function') {
            logger.warn(`No valid default export found in ${file}`);
            continue;
          }

          const tool = new module.default();
          if (this.validateTool(tool)) {
            tools.push(tool);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Error loading tool ${file}: ${errorMessage}`);
        }
      }

      logger.debug(
        `Successfully loaded ${tools.length} tools: ${tools
          .map((t) => t.name)
          .join(", ")}`
      );
      return tools;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to load tools: ${errorMessage}`);
      return [];
    }
  }
}
