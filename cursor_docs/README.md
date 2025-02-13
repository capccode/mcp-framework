# MCP Framework Implementation Guide

## Core Concepts

### Direct Interface Implementation

Instead of using base classes, components directly implement interfaces:

```typescript
interface Tool {
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
```

### Schema Validation

Using Zod for schema validation:

```typescript
const schema = z.object({
  param: z.string()
    .min(1, "Parameter must not be empty")
    .describe("Parameter description")
}).strict();

type MyInput = z.infer<typeof schema>;

inputSchema = {
  parse: (args: unknown) => schema.parse(args),
  jsonSchema: zodToJsonSchema(schema)
};
```

### Component Registration

Server automatically registers components:

```typescript
registerTool(tool: Tool) {
  logger.debug(`Registering tool: ${tool.name}`);
  this.tools.set(tool.name, tool);
}

registerPrompt(prompt: Prompt) {
  logger.debug(`Registering prompt: ${prompt.name}`);
  this.prompts.set(prompt.name, prompt);
}

registerResource(resource: Resource) {
  logger.debug(`Registering resource: ${resource.name}`);
  this.resources.set(resource.name, resource);
}
```

### Error Handling

Consistent error handling with MCPError:

```typescript
try {
  // Your code
} catch (error) {
  throw new McpError(
    ErrorCode.InternalError,
    `Operation failed: ${error instanceof Error ? error.message : String(error)}`
  );
}
```

### Logging

Path-aware logging system:

```typescript
const scriptDir = dirname(process.argv[1]);
this.logDir = join(scriptDir, "..", "logs");
this.logFilePath = join(this.logDir, `mcp-server-${timestamp}.log`);
```

## Component Loading

The ComponentLoader handles dynamic loading:

```typescript
async loadComponents(): Promise<T[]> {
  const componentDirs = await fs.readdir(this.componentDir);
  const components: T[] = [];

  for (const dir of componentDirs) {
    const { default: ComponentClass } = await import(relativeImportPath);
    const component = new ComponentClass(this.basePath);
    
    if (this.validateComponent(component)) {
      components.push(component);
    }
  }

  return components;
}
```

## Server Capabilities

Server capabilities are explicitly defined:

```typescript
capabilities: {
  tools: {
    list: true,
    call: true
  },
  prompts: {
    list: true,
    get: true
  },
  resources: {
    list: true,
    read: true
  }
}
```

## Request Handling

Type-safe request handling:

```typescript
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = this.tools.get(name);
  
  if (!tool) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }

  const validatedArgs = tool.inputSchema.parse(args || {});
  return await tool.handler(validatedArgs);
});
```

## Best Practices

1. Always use strict schemas:
```typescript
const schema = z.object({...}).strict();
```

2. Validate unknown inputs:
```typescript
(component: unknown): component is Tool => {
  return Boolean(
    component &&
    typeof component === 'object' &&
    'name' in component &&
    'handler' in component
  );
}
```

3. Use proper error handling:
```typescript
try {
  // Your code
} catch (error) {
  if (error instanceof McpError) {
    throw error;
  }
  throw new McpError(
    ErrorCode.InternalError,
    `Operation failed: ${error instanceof Error ? error.message : String(error)}`
  );
}
```

4. Log important operations:
```typescript
logger.debug(`Loading component: ${name}`);
logger.info(`Server started on ${port}`);
logger.error(`Operation failed: ${error}`);
```

5. Use type inference:
```typescript
type MyInput = z.infer<typeof schema>;
```

## Common Issues

1. Path Resolution:
   - Always use dirname(process.argv[1]) for script directory
   - Use path.join for cross-platform compatibility

2. Component Loading:
   - Handle missing directories gracefully
   - Validate components before registration
   - Log loading failures for debugging

3. Error Handling:
   - Always wrap external calls in try/catch
   - Use proper error codes
   - Include detailed error messages

4. Schema Validation:
   - Always use .strict() for schemas
   - Include descriptive error messages
   - Handle optional fields properly