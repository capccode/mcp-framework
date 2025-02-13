import { Tool } from "../tools/BaseTool.js";
import { ComponentLoader } from "../utils/componentLoader.js";
import { logger } from "../utils/logger.js";

export class ToolLoader {
  private loader: ComponentLoader<Tool>;

  constructor(basePath: string) {
    this.loader = new ComponentLoader<Tool>(
      basePath,
      "tools",
      (component: unknown): component is Tool =>
        Boolean(
          component &&
          typeof component === 'object' &&
          component !== null &&
          'name' in component &&
          'description' in component &&
          'inputSchema' in component &&
          'handler' in component &&
          typeof (component as Tool).name === "string" &&
          typeof (component as Tool).description === "string" &&
          typeof (component as Tool).handler === "function"
        )
    );
  }

  async hasTools(): Promise<boolean> {
    return this.loader.hasComponents();
  }

  async loadTools(): Promise<Tool[]> {
    return this.loader.loadComponents();
  }
}
