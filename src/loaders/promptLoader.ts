import { Prompt } from "../prompts/BasePrompt.js";
import { ComponentLoader } from "../utils/componentLoader.js";
import { logger } from "../utils/logger.js";

export class PromptLoader {
  private loader: ComponentLoader<Prompt>;

  constructor(basePath: string) {
    this.loader = new ComponentLoader<Prompt>(
      basePath,
      "prompts",
      (component: unknown): component is Prompt =>
        Boolean(
          component &&
          typeof component === 'object' &&
          component !== null &&
          'name' in component &&
          'description' in component &&
          'inputSchema' in component &&
          'getMessages' in component &&
          typeof (component as Prompt).name === "string" &&
          typeof (component as Prompt).description === "string" &&
          typeof (component as Prompt).getMessages === "function"
        )
    );
  }

  async hasPrompts(): Promise<boolean> {
    return this.loader.hasComponents();
  }

  async loadPrompts(): Promise<Prompt[]> {
    return this.loader.loadComponents();
  }
}
