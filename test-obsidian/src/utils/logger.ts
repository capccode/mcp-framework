import { createWriteStream, WriteStream } from "fs";
import { join } from "path";
import { mkdir } from "fs/promises";

export class Logger {
  private static instance: Logger;
  private logStream: WriteStream | null = null;
  private logFilePath: string;
  private logDir: string;
  private static basePath: string;

  private constructor() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.logDir = join(Logger.basePath || process.cwd(), "logs");
    this.logFilePath = join(this.logDir, `mcp-server-${timestamp}.log`);
    this.initializeLogDir();
  }

  private async initializeLogDir() {
    try {
      await mkdir(this.logDir, { recursive: true });
      this.logStream = createWriteStream(this.logFilePath, { flags: "a" });
      
      // Handle stream errors gracefully
      this.logStream.on('error', (err) => {
        console.error(`Error writing to log file: ${err.message}`);
        this.logStream = null; // Stop trying to write to file on error
      });
    } catch (err) {
      console.error(`Failed to create logs directory: ${err}`);
      // Continue without file logging
    }
  }

  public static setBasePath(path: string) {
    Logger.basePath = path;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: string, message: string): string {
    return `[${this.getTimestamp()}] [${level}] ${message}\n`;
  }

  private writeToStream(formattedMessage: string) {
    // Always write to stderr for CLI visibility
    process.stderr.write(formattedMessage);

    // Try to write to file if stream is available
    if (this.logStream) {
      try {
        this.logStream.write(formattedMessage);
      } catch (err) {
        console.error(`Error writing to log file: ${err}`);
        this.logStream = null; // Stop trying to write to file on error
      }
    }
  }

  public info(message: string): void {
    const formattedMessage = this.formatMessage("INFO", message);
    this.writeToStream(formattedMessage);
  }

  public error(message: string): void {
    const formattedMessage = this.formatMessage("ERROR", message);
    this.writeToStream(formattedMessage);
  }

  public warn(message: string): void {
    const formattedMessage = this.formatMessage("WARN", message);
    this.writeToStream(formattedMessage);
  }

  public debug(message: string): void {
    const formattedMessage = this.formatMessage("DEBUG", message);
    this.writeToStream(formattedMessage);
  }

  public close(): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }

  public getLogPath(): string | null {
    return this.logStream ? this.logFilePath : null;
  }
}

export const logger = Logger.getInstance();