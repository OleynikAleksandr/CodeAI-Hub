import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type ExtensionLogLevel = "info" | "warn" | "error" | "debug";

type ExtensionLogPayload = Record<string, unknown> | undefined;

class ExtensionLogger {
  private readonly stream: fs.WriteStream;

  constructor() {
    const logsRoot = path.join(
      os.homedir(),
      ".codeai-hub",
      "logs",
      "extension"
    );
    fs.mkdirSync(logsRoot, { recursive: true });
    const filePath = path.join(logsRoot, "extension.log");
    this.stream = fs.createWriteStream(filePath, { flags: "a" });
  }

  log(
    event: string,
    payload?: ExtensionLogPayload,
    level: ExtensionLogLevel = "info"
  ): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      ...payload,
    };
    try {
      this.stream.write(`${JSON.stringify(entry)}\n`);
    } catch {
      // Ignore logging failures to avoid impacting extension behavior.
    }
  }

  info(event: string, payload?: ExtensionLogPayload): void {
    this.log(event, payload, "info");
  }

  warn(event: string, payload?: ExtensionLogPayload): void {
    this.log(event, payload, "warn");
  }

  error(event: string, payload?: ExtensionLogPayload): void {
    this.log(event, payload, "error");
  }

  debug(event: string, payload?: ExtensionLogPayload): void {
    this.log(event, payload, "debug");
  }

  dispose(): void {
    try {
      this.stream.end();
    } catch {
      // Ignore disposal failures.
    }
  }
}

let sharedLogger: ExtensionLogger | null = null;

export const getExtensionLogger = (): ExtensionLogger => {
  if (!sharedLogger) {
    sharedLogger = new ExtensionLogger();
  }
  return sharedLogger;
};

export const disposeExtensionLogger = (): void => {
  if (!sharedLogger) {
    return;
  }
  sharedLogger.dispose();
  sharedLogger = null;
};
