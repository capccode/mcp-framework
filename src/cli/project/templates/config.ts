export function generatePackageJson(projectName: string): string {
  const packageJson = {
    name: projectName,
    version: "0.1.0",
    description: `${projectName} MCP server`,
    type: "module",
    bin: {
      [projectName]: "./dist/index.js",
    },
    files: ["dist"],
    scripts: {
      build: "tsc && chmod +x dist/index.js",
      start: "node dist/index.js",
      dev: "tsc --watch"
    },
    dependencies: {
      "@modelcontextprotocol/sdk": "^0.6.1",
      "zod": "^3.22.4",
      "zod-to-json-schema": "^3.22.4"
    },
    devDependencies: {
      "@types/node": "^20.11.24",
      "typescript": "^5.3.3"
    }
  };

  return JSON.stringify(packageJson, null, 2);
}

export function generateTsConfig(): string {
  const tsconfig = {
    compilerOptions: {
      target: "ES2020",
      module: "ES2020",
      moduleResolution: "node",
      outDir: "./dist",
      rootDir: "./src",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      sourceMap: true,
      allowJs: true,
      declaration: true
    },
    include: ["src/**/*.ts"],
    exclude: ["node_modules", "dist"]
  };

  return JSON.stringify(tsconfig, null, 2);
}

export function generateGitIgnore(): string {
  return `node_modules/
dist/
logs/*.log
`;
}