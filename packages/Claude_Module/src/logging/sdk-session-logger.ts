import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { SessionLogger } from "../session/types";

const LOG_ROOT = path.join(homedir(), ".codeai-hub", "logs", "claude");

export class SDKSessionLoggerFacade implements SessionLogger {
  private logFilePath: string | null = null;

  public start(sessionId: string): void {
    this.logFilePath = this.buildLogFilePath(sessionId);
    void fs
      .mkdir(LOG_ROOT, { recursive: true })
      .then(() => fs.writeFile(this.logFilePath as string, "", { flag: "w" }));
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
    const nextPath = this.buildLogFilePath(newId);
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

  public logSDKMessage(type: string, payload: unknown): void {
    this.append({ type: `sdk:${type}`, payload, timestamp: Date.now() });
  }

  public logSystemMessage(payload: unknown): void {
    this.append({ type: "system", payload, timestamp: Date.now() });
  }

  public logResultMessage(payload: unknown): void {
    this.append({ type: "result", payload, timestamp: Date.now() });
  }

  public logAssistantResponse(payload: unknown): void {
    this.append({ type: "assistant", payload, timestamp: Date.now() });
  }

  private buildLogFilePath(sessionId: string): string {
    const safeId = sessionId.replace(/[^a-zA-Z0-9]/g, "-");
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
