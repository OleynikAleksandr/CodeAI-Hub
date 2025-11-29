import { env } from "vscode";

const FILE_PATH_PATTERNS = [
  /^[a-zA-Z]:[\\/]/,
  /^\//,
  /^~\//,
  /^\.{0,2}[\\/]/,
] as const;

export class ClipboardHandler {
  private readonly platform: NodeJS.Platform;

  constructor() {
    this.platform = process.platform;
  }

  async copyPathToClipboard(filePath: string): Promise<void> {
    await env.clipboard.writeText(filePath);
  }

  async getClipboardPath(): Promise<string | null> {
    try {
      const text = await env.clipboard.readText();
      return this.isValidFilePath(text) ? text.trim() : null;
    } catch {
      return null;
    }
  }

  private isValidFilePath(text: string | undefined): boolean {
    if (!text) {
      return false;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return false;
    }

    return FILE_PATH_PATTERNS.some((pattern) => pattern.test(trimmed));
  }
}
