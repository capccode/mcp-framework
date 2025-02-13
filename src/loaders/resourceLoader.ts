import { Resource } from "../resources/BaseResource.js";
import { ComponentLoader } from "../utils/componentLoader.js";
import { logger } from "../utils/logger.js";

export class ResourceLoader {
  private loader: ComponentLoader<Resource>;

  constructor(basePath: string) {
    this.loader = new ComponentLoader<Resource>(
      basePath,
      "resources",
      (component: unknown): component is Resource =>
        Boolean(
          component &&
          typeof component === 'object' &&
          component !== null &&
          'name' in component &&
          'description' in component &&
          'read' in component &&
          typeof (component as Resource).name === "string" &&
          typeof (component as Resource).description === "string" &&
          typeof (component as Resource).read === "function"
        )
    );
  }

  async hasResources(): Promise<boolean> {
    return this.loader.hasComponents();
  }

  async loadResources(): Promise<Resource[]> {
    return this.loader.loadComponents();
  }
}
