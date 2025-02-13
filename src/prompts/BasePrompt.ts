import { McpError } from "@modelcontextprotocol/sdk/types.js";

export interface Prompt {
  name: string;
  description: string;
  inputSchema: any;
  getMessages: (args: any) => Promise<Array<{
    role: "user" | "assistant";
    content: {
      type: "text";
      text: string;
    };
  }>>;
}

export interface PromptResponse {
  messages: Array<{
    role: "user" | "assistant";
    content: {
      type: "text";
      text: string;
    };
  }>;
}

export class MCPError extends McpError {
  constructor(code: number, message: string) {
    super(code, message);
    this.name = "MCPError";
  }
}
