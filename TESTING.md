# Testing Guide for MCP Framework

## Type Safety Testing

### 1. Type Guard Testing
```typescript
// Test type guards
describe('Type Guards', () => {
  it('should properly narrow unknown types', () => {
    const unknownValue: unknown = { name: 'test' };
    if (isToolProtocol(unknownValue)) {
      // TypeScript should recognize narrowed type
      expect(unknownValue.name).toBeDefined();
    }
  });

  it('should handle null and undefined', () => {
    expect(isToolProtocol(null)).toBe(false);
    expect(isToolProtocol(undefined)).toBe(false);
  });
});
```

### 2. Error Handling Type Safety
```typescript
// Test error discrimination
describe('Error Handling', () => {
  it('should properly type errors', async () => {
    try {
      throw new Error('test');
    } catch (error: unknown) {
      // Should handle unknown type
      if (error instanceof Error) {
        expect(error.message).toBe('test');
      }
    }
  });
});
```

### 3. Dynamic Import Type Safety
```typescript
// Test dynamic imports
describe('Dynamic Imports', () => {
  it('should maintain type safety', async () => {
    const module = await import('./test-tool') as { default?: new () => unknown };
    expect(typeof module.default).toBe('function');
  });
});
```

### 4. Nullish Handling
```typescript
// Test optional values
describe('Optional Values', () => {
  it('should handle optional properties', () => {
    const config = {
      name: 'test',
      options: undefined
    };
    const result = config.options ?? 'default';
    expect(result).toBe('default');
  });
});
```

## Core Functionality Tests

### 1. Project Creation with Type Safety
```bash
# Test project creation with different name formats
mcp create test-server
cd test-server

# Verify directory structure
ls -la
# Should see:
# - src/
# - package.json
# - tsconfig.json

# Verify class name conversion in src/index.ts
cat src/index.ts
# Should see:
# - class TestServer (PascalCase) instead of test-server (hyphenated)
# - Consistent naming throughout the file

# Test hyphenated names
cd ..
mcp create my-complex-server
cd my-complex-server
cat src/index.ts
# Should see:
# - class MyComplexServer (PascalCase)
# - No hyphens in class names or identifiers

# Verify dependencies
npm install
# Should install without errors
```

Test cases for project names:
1. Simple names (e.g., "testserver")
2. Hyphenated names (e.g., "test-server")
3. Multiple hyphens (e.g., "my-complex-server")
4. Numbers (e.g., "server-v2")

### 2. Component Generation

#### Test Tool Creation
```bash
# Create a test tool
mcp add tool test-tool

# Verify:
# 1. File created in src/tools/
# 2. Proper TypeScript types
# 3. Zod validation schema
# 4. Example implementation
```

#### Test Prompt Creation
```bash
# Create a test prompt
mcp add prompt test-prompt

# Verify:
# 1. File created in src/prompts/
# 2. Argument validation
# 3. Message generation setup
```

#### Test Resource Creation
```bash
# Create a test resource
mcp add resource test-resource

# Verify:
# 1. File created in src/resources/
# 2. URI handling
# 3. MIME type support
# 4. Subscription setup
```

### 3. Build Process
```bash
# Build the project
npm run build

# Verify:
# 1. No TypeScript errors
# 2. dist/ directory created
# 3. All components compiled
```

### 4. Server Operation

#### Basic Server Start
```bash
# Start the server
node dist/index.js .

# Verify:
# 1. Server starts without errors
# 2. Components are discovered
# 3. Proper logging output
```

## Component Testing

### 1. Tool Testing

Test your tool implementation with comprehensive type safety:
```typescript
// src/tools/test-tool.ts
interface TestInput {
  input: string;
  options?: {
    format: 'json' | 'text';
    pretty?: boolean;
  };
}

class TestTool extends MCPTool<TestInput> {
  name = "test_tool";
  description = "Test tool implementation";

  protected schema = {
    input: {
      type: z.string().min(1),
      description: "Test input"
    },
    options: {
      type: z.object({
        format: z.enum(['json', 'text']),
        pretty: z.boolean().optional()
      }).optional(),
      description: "Output options"
    }
  };

  protected async execute(input: TestInput) {
    try {
      const result = await this.processInput(input);
      return this.formatOutput(result, input.options);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Processing failed: ${errorMessage}`);
    }
  }

  private async processInput(input: TestInput): Promise<unknown> {
    // Implementation
    return `Processed: ${input.input}`;
  }

  private formatOutput(result: unknown, options?: TestInput['options']): string {
    if (options?.format === 'json') {
      return JSON.stringify(result, null, options.pretty ? 2 : 0);
    }
    return String(result);
  }
}

describe('TestTool Type Safety', () => {
  let tool: TestTool;

  beforeEach(() => {
    tool = new TestTool();
  });

  it('should enforce type safety at compile time', () => {
    // @ts-expect-error - Should catch missing required input
    tool.execute({});

    // @ts-expect-error - Should catch wrong input type
    tool.execute({ input: 123 });

    // @ts-expect-error - Should catch invalid enum value
    tool.execute({ input: 'test', options: { format: 'yaml' } });
  });

  it('should handle optional properties safely', async () => {
    // Should work with minimal input
    await tool.execute({ input: 'test' });

    // Should work with partial options
    await tool.execute({
      input: 'test',
      options: { format: 'json' }
    });

    // Should work with full options
    await tool.execute({
      input: 'test',
      options: { format: 'json', pretty: true }
    });
  });

  it('should handle errors with proper typing', async () => {
    try {
      await tool.execute({ input: '' }); // Should fail min(1)
    } catch (error: unknown) {
      expect(error instanceof Error).toBe(true);
      if (error instanceof Error) {
        expect(error.message).toContain('Processing failed');
      }
    }
  });

  it('should maintain type safety with dynamic values', async () => {
    const dynamicInput: unknown = {
      input: 'test',
      options: { format: 'json' }
    };

    if (isValidToolInput(dynamicInput)) {
      await tool.execute(dynamicInput);
    }
  });
});
```

### 2. Prompt Testing

Test your prompt implementation:
```typescript
// src/prompts/test-prompt.ts
class TestPrompt extends MCPPrompt<{
  query: z.ZodString
}> {
  name = "test_prompt";
  description = "Test prompt implementation";

  protected schema = {
    query: {
      type: z.string(),
      description: "Test query"
    }
  };

  protected async generateMessages({ query }) {
    return [{
      role: "user",
      content: { type: "text", text: query }
    }];
  }
}

// Test cases:
// 1. Valid arguments - should generate messages
// 2. Invalid arguments - should fail with validation error
// 3. Message format - should follow MCP spec
```

### 3. Resource Testing

Test your resource implementation:
```typescript
// src/resources/test-resource.ts
class TestResource extends MCPResource {
  uri = "test://data";
  name = "Test Resource";
  mimeType = "application/json";

  async read(): Promise<ResourceContent[]> {
    return [{
      uri: this.uri,
      mimeType: this.mimeType,
      text: JSON.stringify({ test: "data" })
    }];
  }
}

// Test cases:
// 1. Read operation - should return valid content
// 2. URI format - should be valid
// 3. MIME type - should be correct
// 4. Subscription (if implemented) - should work
```

## Integration Testing

### 1. MCP Client Integration

Test with Roo Cline:
1. Add server configuration to settings
2. Verify server appears in client
3. Test tool execution
4. Test prompt generation
5. Test resource access

Test with Claude Desktop:
1. Add server configuration
2. Verify server connection
3. Test component functionality

### 2. Error Handling

Test error scenarios:
1. Invalid tool input
2. Missing arguments
3. Resource not found
4. Network failures
5. Subscription errors

### 3. Performance

Monitor:
1. Server startup time
2. Component loading speed
3. Tool execution latency
4. Resource access speed
5. Memory usage

## Security Testing

1. Input Validation
- Test with malformed input
- Try injection attacks
- Test with unexpected types

2. Resource Access
- Verify URI validation
- Test path traversal prevention
- Check MIME type handling

3. Error Exposure
- Verify error messages are safe
- Check stack trace exposure
- Test error propagation

## Compatibility Testing

1. Node.js Versions
- Test with LTS versions
- Test with latest version

2. Operating Systems
- Test on macOS
- Test on Windows
- Test on Linux

3. TypeScript Versions
- Test with minimum supported version
- Test with latest version

## Documentation Testing

1. Verify Examples
- Test all README examples
- Check CLI documentation
- Validate error messages

2. API Documentation
- Test type definitions
- Verify exported interfaces
- Check JSDoc comments

Remember to:
- Run tests before commits
- Update tests when adding features
- Document any workarounds
- Report issues to the framework