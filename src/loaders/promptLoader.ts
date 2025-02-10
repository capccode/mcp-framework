import { PromptProtocol } from "../prompts/BasePrompt.js";
import { join, dirname } from "path";
import { promises as fs } from "fs";
import { logger } from "../core/Logger.js";

export class PromptLoader {
  private readonly PROMPTS_DIR: string;
  private readonly EXCLUDED_FILES: ReadonlyArray<string> = ["BasePrompt.js", "*.test.js", "*.spec.js"];

  constructor(basePath?: string) {
    const mainModulePath = basePath ?? process.argv[1] ?? process.cwd();
    this.PROMPTS_DIR = join(dirname(mainModulePath), "prompts");
    logger.debug(
      `Initialized PromptLoader with directory: ${this.PROMPTS_DIR}`
    );
  }

  async hasPrompts(): Promise<boolean> {
    try {
      const stats = await fs.stat(this.PROMPTS_DIR);
      if (!stats.isDirectory()) {
        logger.debug("Prompts path exists but is not a directory");
        return false;
      }

      const files = await fs.readdir(this.PROMPTS_DIR);
      const hasValidFiles = files.some((file) => this.isPromptFile(file));
      logger.debug(`Prompts directory has valid files: ${hasValidFiles}`);
      return hasValidFiles;
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        logger.debug("No prompts directory found");
      } else {
        logger.warn(`Error checking prompts: ${error instanceof Error ? error.message : String(error)}`);
      }
      return false;
    }
  }

  private isPromptFile(file: string): boolean {
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

  private validatePrompt(prompt: unknown): prompt is PromptProtocol {
    if (!prompt || typeof prompt !== 'object') {
      logger.warn('Invalid prompt: not an object');
      return false;
    }

    const hasName = 'name' in prompt && typeof (prompt as { name: unknown }).name === 'string';
    const hasDefinition = 'promptDefinition' in prompt &&
      typeof (prompt as { promptDefinition: unknown }).promptDefinition === 'object' &&
      (prompt as { promptDefinition: unknown }).promptDefinition !== null;
    const hasGetMessages = 'getMessages' in prompt &&
      typeof (prompt as { getMessages: unknown }).getMessages === 'function';

    const isValid = hasName && hasDefinition && hasGetMessages;

    if (isValid) {
      logger.debug(`Validated prompt: ${(prompt as PromptProtocol).name}`);
    } else {
      logger.warn(`Invalid prompt: missing required properties - name: ${hasName}, definition: ${hasDefinition}, getMessages: ${hasGetMessages}`);
    }

    return isValid;
  }

  async loadPrompts(): Promise<PromptProtocol[]> {
    try {
      logger.debug(`Attempting to load prompts from: ${this.PROMPTS_DIR}`);

      let stats;
      try {
        stats = await fs.stat(this.PROMPTS_DIR);
      } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
          logger.debug("No prompts directory found");
        } else {
          logger.warn(`Error accessing prompts directory: ${error instanceof Error ? error.message : String(error)}`);
        }
        return [];
      }

      if (!stats.isDirectory()) {
        logger.error(`Path is not a directory: ${this.PROMPTS_DIR}`);
        return [];
      }

      const files = await fs.readdir(this.PROMPTS_DIR);
      logger.debug(`Found files in directory: ${files.join(", ")}`);

      const prompts: PromptProtocol[] = [];

      for (const file of files) {
        if (!this.isPromptFile(file)) {
          continue;
        }

        try {
          const fullPath = join(this.PROMPTS_DIR, file);
          logger.debug(`Attempting to load prompt from: ${fullPath}`);

          const importPath = `file://${fullPath}`;
          const module = await import(importPath) as { default?: new () => unknown };

          if (!module.default || typeof module.default !== 'function') {
            logger.warn(`No valid default export found in ${file}`);
            continue;
          }

          const prompt = new module.default();
          if (this.validatePrompt(prompt)) {
            prompts.push(prompt);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Error loading prompt ${file}: ${errorMessage}`);
        }
      }

      logger.debug(
        `Successfully loaded ${prompts.length} prompts: ${prompts
          .map((p) => p.name)
          .join(", ")}`
      );
      return prompts;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to load prompts: ${errorMessage}`);
      return [];
    }
  }
}
