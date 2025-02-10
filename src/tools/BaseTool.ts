import { z } from "zod";
import { Tool as SDKTool } from "@modelcontextprotocol/sdk/types.js";

export type SchemaDefinition<T> = {
  [K in keyof T]: {
    type: z.ZodType<T[K]>;
    description: string;
  };
};

export interface ToolProtocol extends SDKTool {
  name: string;
  description: string;
  toolDefinition: {
    name: string;
    description: string;
    inputSchema: {
      type: "object";
      properties?: Record<string, unknown>;
    };
  };
  toolCall(request: {
    params: { name: string; arguments?: Record<string, unknown> };
  }): Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

export abstract class MCPTool<TInput extends Record<string, unknown> = Record<string, never>>
  implements ToolProtocol
{
  abstract name: string;
  abstract description: string;
  protected abstract schema: SchemaDefinition<TInput>;
  [key: string]: unknown;

  private get zodSchema(): z.ZodObject<{ [K in keyof TInput]: z.ZodType<TInput[K]> }> {
    return z.object(
      Object.fromEntries(
        Object.entries(this.schema).map(([key, schema]) => [key, schema.type])
      )
    ) as z.ZodObject<{ [K in keyof TInput]: z.ZodType<TInput[K]> }>;
  }

  get inputSchema(): { type: "object"; properties?: Record<string, unknown> } {
    return {
      type: "object" as const,
      properties: Object.fromEntries(
        Object.entries(this.schema).map(([key, schema]) => [
          key,
          {
            type: this.getJsonSchemaType(schema.type),
            description: schema.description,
          },
        ])
      ),
    };
  }

  get toolDefinition() {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.inputSchema,
    };
  }

  protected abstract execute(input: TInput): Promise<unknown>;

  async toolCall(request: {
    params: { name: string; arguments?: Record<string, unknown> };
  }): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const args = request.params.arguments ?? {};
      const validatedInput = await this.validateInput(args);
      const result = await this.execute(validatedInput);
      return this.createSuccessResponse(result);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return this.createErrorResponse(new Error(`Invalid input: ${error.errors.map(e => e.message).join(', ')}`));
      }
      return this.createErrorResponse(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async validateInput(args: Record<string, unknown>): Promise<TInput> {
    try {
      const result = await this.zodSchema.parseAsync(args);
      return result as TInput;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  private getJsonSchemaType(zodType: z.ZodType<unknown>): string {
    if (zodType instanceof z.ZodString) return "string";
    if (zodType instanceof z.ZodNumber) return "number";
    if (zodType instanceof z.ZodBoolean) return "boolean";
    if (zodType instanceof z.ZodArray) return "array";
    if (zodType instanceof z.ZodObject) return "object";
    if (zodType instanceof z.ZodEnum) return "string";
    if (zodType instanceof z.ZodUnion) return "string";
    if (zodType instanceof z.ZodNullable) return this.getJsonSchemaType(zodType.unwrap());
    if (zodType instanceof z.ZodOptional) return this.getJsonSchemaType(zodType.unwrap());
    return "string";
  }

  protected createSuccessResponse(data: unknown) {
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  }

  protected createErrorResponse(error: Error) {
    return {
      content: [{ type: "error", text: error.message }],
    };
  }

  protected async fetch<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
}
