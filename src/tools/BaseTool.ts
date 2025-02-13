import { McpError } from "@modelcontextprotocol/sdk/types.js";

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    parse: (args: any) => any;
    jsonSchema: any;
  };
  handler: (args: any) => Promise<{
    content: Array<{
      type: "text";
      text: string;
    }>;
  }>;
}

export interface ToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
}

export class MCPError extends McpError {
  constructor(code: number, message: string) {
    super(code, message);
    this.name = "MCPError";
  }
}
