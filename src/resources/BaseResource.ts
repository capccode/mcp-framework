import { McpError } from "@modelcontextprotocol/sdk/types.js";

export interface Resource {
  name: string;
  description: string;
  read: () => Promise<Array<ResourceContent>>;
}

export interface ResourceContent {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  text: string;
}

export class MCPError extends McpError {
  constructor(code: number, message: string) {
    super(code, message);
    this.name = "MCPError";
  }
}
