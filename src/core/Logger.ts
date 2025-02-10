import { createWriteStream, WriteStream } from "fs";
import { join } from "path";
import { mkdir } from "fs/promises";

export class Logger {
  private static instance: Logger;
  private logStream!: WriteStream;
  private logFilePath: string;
  private initialized = false;

  private constructor() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logDir = "logs";
    this.logFilePath = join(logDir, `mcp-server-${timestamp}.log`);

    this.initializeLogger(logDir).catch((error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      process.stderr.write(`Failed to initialize logger: ${errorMessage}\n`);
    });

    const handleExit = (signal: string) => {
      this.close();
      process.exit(signal === 'SIGINT' ? 130 : 0);
    };

    process.on("exit", () => this.close());
    process.on("SIGINT", () => handleExit('SIGINT'));
    process.on("SIGTERM", () => handleExit('SIGTERM'));
  }

  private async initializeLogger(logDir: string): Promise<void> {
    try {
      await mkdir(logDir, { recursive: true });
      this.logStream = createWriteStream(this.logFilePath, { flags: "a" });
      this.initialized = true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create logs directory: ${errorMessage}`);
    }
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

  private writeLog(formattedMessage: string): void {
    if (!this.initialized) {
      process.stderr.write(formattedMessage);
      return;
    }

    try {
      this.logStream.write(formattedMessage);
      process.stderr.write(formattedMessage);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      process.stderr.write(`Failed to write to log file: ${errorMessage}\n`);
      process.stderr.write(formattedMessage);
    }
  }

  public info(message: string): void {
    this.writeLog(this.formatMessage("INFO", message));
  }

  public log(message: string): void {
    this.info(message);
  }

  public error(message: string): void {
    this.writeLog(this.formatMessage("ERROR", message));
  }

  public warn(message: string): void {
    this.writeLog(this.formatMessage("WARN", message));
  }

  public debug(message: string): void {
    this.writeLog(this.formatMessage("DEBUG", message));
  }

  public close(): void {
    if (this.initialized && this.logStream) {
      try {
        this.logStream.end();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Failed to close log stream: ${errorMessage}\n`);
      }
    }
  }

  public getLogPath(): string {
    return this.logFilePath;
  }
}

export const logger = Logger.getInstance();
