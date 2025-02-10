import { ResourceProtocol } from "../resources/BaseResource.js";
import { join, dirname } from "path";
import { promises as fs } from "fs";
import { logger } from "../core/Logger.js";

export class ResourceLoader {
  private readonly RESOURCES_DIR: string;
  private readonly EXCLUDED_FILES: ReadonlyArray<string> = [
    "BaseResource.js",
    "*.test.js",
    "*.spec.js",
  ];

  constructor(basePath?: string) {
    const mainModulePath = basePath ?? process.argv[1] ?? process.cwd();
    this.RESOURCES_DIR = join(dirname(mainModulePath), "resources");
    logger.debug(
      `Initialized ResourceLoader with directory: ${this.RESOURCES_DIR}`
    );
  }

  async hasResources(): Promise<boolean> {
    try {
      const stats = await fs.stat(this.RESOURCES_DIR);
      if (!stats.isDirectory()) {
        logger.debug("Resources path exists but is not a directory");
        return false;
      }

      const files = await fs.readdir(this.RESOURCES_DIR);
      const hasValidFiles = files.some((file) => this.isResourceFile(file));
      logger.debug(`Resources directory has valid files: ${hasValidFiles}`);
      return hasValidFiles;
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        logger.debug("No resources directory found");
      } else {
        logger.warn(`Error checking resources: ${error instanceof Error ? error.message : String(error)}`);
      }
      return false;
    }
  }

  private isResourceFile(file: string): boolean {
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

  private validateResource(resource: unknown): resource is ResourceProtocol {
    if (!resource || typeof resource !== 'object') {
      logger.warn('Invalid resource: not an object');
      return false;
    }

    const hasUri = 'uri' in resource && typeof (resource as { uri: unknown }).uri === 'string';
    const hasName = 'name' in resource && typeof (resource as { name: unknown }).name === 'string';
    const hasDefinition = 'resourceDefinition' in resource &&
      typeof (resource as { resourceDefinition: unknown }).resourceDefinition === 'object' &&
      (resource as { resourceDefinition: unknown }).resourceDefinition !== null;
    const hasRead = 'read' in resource && typeof (resource as { read: unknown }).read === 'function';

    const isValid = hasUri && hasName && hasDefinition && hasRead;

    if (isValid) {
      logger.debug(`Validated resource: ${(resource as ResourceProtocol).name}`);
    } else {
      logger.warn(`Invalid resource: missing required properties - uri: ${hasUri}, name: ${hasName}, definition: ${hasDefinition}, read: ${hasRead}`);
    }

    return isValid;
  }

  async loadResources(): Promise<ResourceProtocol[]> {
    try {
      logger.debug(`Attempting to load resources from: ${this.RESOURCES_DIR}`);

      let stats;
      try {
        stats = await fs.stat(this.RESOURCES_DIR);
      } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
          logger.debug("No resources directory found");
        } else {
          logger.warn(`Error accessing resources directory: ${error instanceof Error ? error.message : String(error)}`);
        }
        return [];
      }

      if (!stats.isDirectory()) {
        logger.error(`Path is not a directory: ${this.RESOURCES_DIR}`);
        return [];
      }

      const files = await fs.readdir(this.RESOURCES_DIR);
      logger.debug(`Found files in directory: ${files.join(", ")}`);

      const resources: ResourceProtocol[] = [];

      for (const file of files) {
        if (!this.isResourceFile(file)) {
          continue;
        }

        try {
          const fullPath = join(this.RESOURCES_DIR, file);
          logger.debug(`Attempting to load resource from: ${fullPath}`);

          const importPath = `file://${fullPath}`;
          const module = await import(importPath) as { default?: new () => unknown };

          if (!module.default || typeof module.default !== 'function') {
            logger.warn(`No valid default export found in ${file}`);
            continue;
          }

          const resource = new module.default();
          if (this.validateResource(resource)) {
            resources.push(resource);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Error loading resource ${file}: ${errorMessage}`);
        }
      }

      logger.debug(
        `Successfully loaded ${resources.length} resources: ${resources
          .map((r) => r.name)
          .join(", ")}`
      );
      return resources;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to load resources: ${errorMessage}`);
      return [];
    }
  }
}
