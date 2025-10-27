import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { SessionLogger } from "../session/types";

const LOG_ROOT = path.join(homedir(), ".codeai-hub", "logs", "codex");

export class CodexSessionLogger implements SessionLogger {
  private logFilePath: string | null = null;

  public start(sessionId: string): void {
    this.logFilePath = this.resolveLogPath(sessionId);
    void fs
      .mkdir(LOG_ROOT, { recursive: true })
      .then(() => fs.writeFile(this.logFilePath as string, "", { flag: "w" }))
      .catch(() => {});
    this.append({ type: "session_start", sessionId, timestamp: Date.now() });
  }

  public end(): void {
    this.append({ type: "session_end", timestamp: Date.now() });
    this.logFilePath = null;
  }

  public renameSession(oldId: string, newId: string): void {
    if (!this.logFilePath) {
      return;
    }
    const nextPath = this.resolveLogPath(newId);
    void fs
      .mkdir(LOG_ROOT, { recursive: true })
      .then(() => fs.rename(this.logFilePath as string, nextPath))
      .catch(() => {});
    this.logFilePath = nextPath;
    this.append({
      type: "session_promoted",
      oldId,
      newId,
      timestamp: Date.now(),
    });
  }

  public logUserInput(content: string): void {
    this.append({ type: "user_input", content, timestamp: Date.now() });
  }

  public logSDKEvent(scope: string, payload: unknown): void {
    this.append({ type: `sdk:${scope}`, payload, timestamp: Date.now() });
  }

  public logAssistantResponse(payload: unknown): void {
    this.append({ type: "assistant", payload, timestamp: Date.now() });
  }

  private resolveLogPath(sessionId: string): string {
    const safeId = sessionId.replace(/[^a-zA-Z0-9]/gu, "-");
    return path.join(LOG_ROOT, `session-${safeId}.jsonl`);
  }

  private append(entry: unknown): void {
    if (!this.logFilePath) {
      return;
    }
    const line = `${JSON.stringify(entry)}\n`;
    void fs.appendFile(this.logFilePath, line, "utf8").catch(() => {});
  }
}
