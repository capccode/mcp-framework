import { readFile } from "fs/promises";
import { join } from "path";

interface PackageJson {
  dependencies?: {
    "@modelcontextprotocol/sdk"?: string;
  };
}

export async function validateMCPProject(): Promise<void> {
  try {
    const packageJsonPath = join(process.cwd(), "package.json");
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    
    let packageJson: PackageJson;
    try {
      packageJson = JSON.parse(packageJsonContent) as PackageJson;
    } catch (parseError) {
      throw new Error("Invalid package.json: Failed to parse JSON");
    }

    if (!packageJson.dependencies?.["@modelcontextprotocol/sdk"]) {
      throw new Error(
        "This directory is not an MCP project (@modelcontextprotocol/sdk not found in dependencies)"
      );
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("ENOENT")) {
        console.error("Error: package.json not found in current directory");
      } else {
        console.error(`Error: ${error.message}`);
      }
    } else {
      console.error("Error: Must be run from an MCP project directory");
    }
    process.exit(1);
  }
}
