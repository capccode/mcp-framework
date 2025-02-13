import { join } from "path";
import { promises as fs } from "fs";
import { logger } from "./logger.js";

// Base interface for all components
interface BaseComponent {
  name: string;
}

export class ComponentLoader<T extends BaseComponent> {
  private readonly EXCLUDED_FILES = ["*.test.js", "*.spec.js"];
  private readonly componentDir: string;

  constructor(
    private basePath: string,
    private componentType: string,
    private validateComponent: (component: unknown) => component is T
  ) {
    this.componentDir = join(basePath, "src", componentType);
    logger.debug(
      `Initialized ${componentType} loader with directory: ${this.componentDir}`
    );
  }

  async hasComponents(): Promise<boolean> {
    try {
      const stats = await fs.stat(this.componentDir);
      if (!stats.isDirectory()) {
        logger.debug("Component path exists but is not a directory");
        return false;
      }

      const files = await fs.readdir(this.componentDir);
      const hasValidFiles = files.some((dir) => this.isComponentDirectory(dir));
      logger.debug(`Component directory has valid directories: ${hasValidFiles}`);
      return hasValidFiles;
    } catch (error) {
      logger.debug("No component directory found");
      return false;
    }
  }

  private isComponentDirectory(dir: string): boolean {
    return !dir.startsWith('.') && !this.EXCLUDED_FILES.includes(dir);
  }

  async loadComponents(): Promise<T[]> {
    try {
      logger.debug(`Attempting to load components from: ${this.componentDir}`);

      let stats;
      try {
        stats = await fs.stat(this.componentDir);
      } catch (error) {
        logger.debug("No component directory found");
        return [];
      }

      if (!stats.isDirectory()) {
        logger.error(`Path is not a directory: ${this.componentDir}`);
        return [];
      }

      // Get component directories (example-tool, my-tool, etc.)
      const componentDirs = await fs.readdir(this.componentDir);
      logger.debug(`Found component directories: ${componentDirs.join(", ")}`);

      const components: T[] = [];

      for (const dir of componentDirs) {
        if (!this.isComponentDirectory(dir)) {
          continue;
        }

        try {
          // Use relative import path from current directory (dist/utils)
          const relativeImportPath = `../src/${this.componentType}/${dir}/index.js`;
          logger.debug(`Using import path: ${relativeImportPath}`);
          
          const { default: ComponentClass } = await import(relativeImportPath);

          if (!ComponentClass) {
            logger.warn(`No default export found in ${dir}`);
            continue;
          }

          // Pass the basePath to the component constructor
          const component = new ComponentClass(this.basePath);
          if (this.validateComponent(component)) {
            logger.debug(`Successfully loaded component: ${component.name}`);
            components.push(component);
          } else {
            logger.warn(`Component validation failed for: ${dir}`);
          }
        } catch (error) {
          logger.error(`Error loading component ${dir}: ${error}`);
        }
      }

      logger.debug(
        `Successfully loaded ${components.length} components: ${components.map(c => c.name).join(', ')}`
      );
      return components;
    } catch (error) {
      logger.error(`Failed to load components: ${error}`);
      return [];
    }
  }
}