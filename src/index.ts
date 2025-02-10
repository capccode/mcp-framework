// Export base classes
export { MCPTool } from './tools/BaseTool.js';
export { MCPPrompt, PromptArgumentSchema } from './prompts/BasePrompt.js';
export { MCPResource } from './resources/BaseResource.js';

// Export types
export type { ToolProtocol, SchemaDefinition } from './tools/BaseTool.js';
export type { PromptProtocol } from './prompts/BasePrompt.js';
export type {
  ResourceProtocol,
  ResourceContent,
  ResourceDefinition,
  ResourceTemplateDefinition
} from './resources/BaseResource.js';
