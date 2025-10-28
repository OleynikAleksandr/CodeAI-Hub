import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { EventEmitter, once } from "node:events";
import { readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { GeminiMessageProcessor } from "../messaging/message-processor";
import type {
  ActiveSession,
  SessionCreationOptions,
  SessionCreationResult,
  SessionRuntimeOptions,
} from "./types";

const EXIT_TIMEOUT_MS = 2000;
const FORCE_EXIT_TIMEOUT_MS = 1000;
const TIMEOUT_TOKEN = Symbol("gemini_exit_timeout");
const DEFAULT_MODEL = "gemini-2.5-pro";
const GEMINI_DIR_NAME = ".gemini";
const TMP_DIR_NAME = "tmp";
const LOGS_FILE_NAME = "logs.json";
const HANDSHAKE_COMMAND = "/stats";
const HANDSHAKE_TIMEOUT_MS = 5000;
const HANDSHAKE_INTERVAL_MS = 250;
const SESSION_FILE_PREFIX = "session-";

type GeminiLogEntry = {
  readonly sessionId?: unknown;
};

export class GeminiSessionManager {
  private readonly sessions = new Map<string, ActiveSession>();

  private messageProcessor: GeminiMessageProcessor | null = null;

  setMessageProcessor(processor: GeminiMessageProcessor): void {
    this.messageProcessor = processor;
  }

  private async performHandshake(session: ActiveSession): Promise<void> {
    if (!(session.process && session.logsPath)) {
      return;
    }

    try {
      await this.writeToProcess(session.process, `${HANDSHAKE_COMMAND}\n`);
    } catch (error) {
      session.reporter?.warn?.("Failed to send Gemini handshake command", {
        sessionId: session.sessionId,
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    const deadline = Date.now() + HANDSHAKE_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const entries = await this.readLogEntries(session.logsPath);
      if (entries.length > session.lastLogEntryCount) {
        session.lastLogEntryCount = entries.length;
        const latest = entries.at(-1);
        if (latest && typeof latest.sessionId === "string") {
          session.realSessionId = latest.sessionId;
          session.reporter?.info?.("Gemini CLI session ready", {
            sessionId: session.sessionId,
            geminiSessionId: session.realSessionId,
          });
          return;
        }
      }
      await delay(HANDSHAKE_INTERVAL_MS);
    }

    session.reporter?.warn?.("Unable to determine Gemini CLI session id", {
      sessionId: session.sessionId,
    });
  }

  private async readLogEntries(logsPath: string): Promise<GeminiLogEntry[]> {
    try {
      const payload = await readFile(logsPath, "utf8");
      if (payload.trim().length === 0) {
        return [];
      }
      const parsed = JSON.parse(payload);
      if (Array.isArray(parsed)) {
        return parsed as GeminiLogEntry[];
      }
    } catch {
      // ignore parse errors and treat as empty for handshake polling
    }
    return [];
  }

  private async countLogEntries(logsPath: string): Promise<number> {
    const entries = await this.readLogEntries(logsPath);
    return entries.length;
  }

  private async populateSessionIdFromChats(
    session: ActiveSession
  ): Promise<void> {
    if (session.realSessionId || !session.projectHash) {
      return;
    }
    const chatsDir = this.resolveChatsDirectory(session.projectHash);
    let entries: string[];
    try {
      entries = await readdir(chatsDir);
    } catch {
      return;
    }
    const candidates = entries
      .filter(
        (entry) =>
          entry.startsWith(SESSION_FILE_PREFIX) && entry.endsWith(".json")
      )
      .sort()
      .reverse();
    const latest = candidates[0];
    if (!latest) {
      return;
    }
    const filePath = path.join(chatsDir, latest);
    const contents = await readFile(filePath, "utf8");
    const parsed = JSON.parse(contents) as { sessionId?: unknown };
    if (parsed && typeof parsed.sessionId === "string") {
      session.realSessionId = parsed.sessionId;
      session.reporter?.info?.("Gemini CLI session identified", {
        sessionId: session.sessionId,
        geminiSessionId: session.realSessionId,
      });
    }
  }

  private async writeToProcess(
    process: ChildProcessWithoutNullStreams,
    payload: string
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      process.stdin.write(payload, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private computeProjectHash(workspacePath: string): string {
    return createHash("sha256").update(workspacePath).digest("hex");
  }

  private resolveProjectTempDir(projectHash: string): string {
    const home = os.homedir() || os.tmpdir();
    return path.join(home, GEMINI_DIR_NAME, TMP_DIR_NAME, projectHash);
  }

  private resolveLogsPath(projectHash: string): string {
    return path.join(this.resolveProjectTempDir(projectHash), LOGS_FILE_NAME);
  }

  private resolveChatsDirectory(projectHash: string): string {
    return path.join(this.resolveProjectTempDir(projectHash), "chats");
  }

  listSessions(): readonly ActiveSession[] {
    return Array.from(this.sessions.values());
  }

  getSession(sessionId: string): ActiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  createSession(options: SessionCreationOptions): SessionCreationResult {
    const sessionId = randomUUID();
    const eventEmitter = new EventEmitter();
    const runtimeOptions: SessionRuntimeOptions = {
      binaryPath: options.binaryPath,
      model: options.model,
      cwd: options.cwd,
      env: options.env,
    };
    const workspacePath = runtimeOptions.cwd ?? process.cwd();
    const projectHash = this.computeProjectHash(workspacePath);
    const logsPath = this.resolveLogsPath(projectHash);

    const session: ActiveSession = {
      sessionId,
      createdAt: Date.now(),
      eventEmitter,
      process: null,
      stdoutBuffer: "",
      status: "closed",
      model: options.model ?? DEFAULT_MODEL,
      logger: options.logger ?? undefined,
      reporter: options.reporter,
      runtimeOptions,
      realSessionId: null,
      handshakePending: false,
      handshakePromise: null,
      projectHash,
      logsPath,
      lastLogEntryCount: 0,
      markedForDeletion: false,
    };

    this.sessions.set(sessionId, session);
    this.startSessionProcess(session).catch((error) => {
      session.reporter?.error?.(
        "Failed to start Gemini CLI session",
        error instanceof Error ? error : new Error(String(error)),
        { sessionId }
      );
    });
    return { sessionId, session };
  }

  private async ensureSessionRunning(session: ActiveSession): Promise<void> {
    if (session.status === "running" && session.process) {
      if (session.handshakePromise) {
        await session.handshakePromise.catch(() => {
          /* noop */
        });
      }
      return;
    }
    await this.startSessionProcess(session);
  }

  private async startSessionProcess(session: ActiveSession): Promise<void> {
    if (session.handshakePromise) {
      await session.handshakePromise.catch(() => {
        /* noop */
      });
      if (session.status === "running" && session.process) {
        return;
      }
    }

    const launchPromise = (async () => {
      const process = this.spawnProcess(session.runtimeOptions);
      session.process = process;
      session.status = "running";
      session.stdoutBuffer = "";
      session.handshakePending = true;
      session.logger?.start(session.sessionId);
      this.bindProcess(session);

      session.lastLogEntryCount = session.logsPath
        ? await this.countLogEntries(session.logsPath)
        : 0;

      try {
        await this.performHandshake(session);
      } catch (error) {
        session.reporter?.warn?.("Gemini CLI handshake failed", {
          sessionId: session.sessionId,
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        session.handshakePending = false;
      }
    })();

    session.handshakePromise = launchPromise.finally(() => {
      session.handshakePromise = null;
    });

    await session.handshakePromise;
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Gemini session ${sessionId} not found`);
    }
    if (session.status === "closing") {
      throw new Error(`Gemini session ${sessionId} is not accepting input`);
    }
    await this.ensureSessionRunning(session);
    if (!session.process) {
      throw new Error(`Gemini session ${sessionId} is not accepting input`);
    }
    const payload = content.endsWith("\n") ? content : `${content}\n`;
    session.logger?.logUserInput?.({ content });
    await this.writeToProcess(session.process, payload);
    if (!session.realSessionId) {
      this.populateSessionIdFromChats(session).catch((error) => {
        session.reporter?.warn?.("Failed to resolve Gemini session id", {
          sessionId,
          message: error instanceof Error ? error.message : String(error),
        });
      });
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    if (session.process === null) {
      this.sessions.delete(sessionId);
      session.eventEmitter.removeAllListeners();
      return;
    }

    session.status = "closing";
    session.markedForDeletion = true;
    try {
      await this.writeToProcess(session.process, "/exit\n");
      session.logger?.logEvent({ type: "control", command: "/exit" });
    } catch (error) {
      session.logger?.logError?.({ error, stage: "send_exit" });
    }

    const graceful = await this.waitForExit(session, EXIT_TIMEOUT_MS);
    if (!graceful && session.process) {
      session.reporter?.warn?.("Gemini CLI did not exit gracefully", {
        sessionId,
      });
      session.process.kill("SIGTERM");
      const terminated = await this.waitForExit(session, FORCE_EXIT_TIMEOUT_MS);
      if (!terminated && session.process) {
        session.reporter?.warn?.("Force killing Gemini CLI", { sessionId });
        session.process.kill("SIGKILL");
        await this.waitForExit(session, FORCE_EXIT_TIMEOUT_MS);
      }
    }
  }

  private spawnProcess(
    options: SessionRuntimeOptions
  ): ChildProcessWithoutNullStreams {
    const args = this.buildArgs(options);
    const child = spawn(options.binaryPath, args, {
      cwd: options.cwd,
      env: {
        ...process.env,
        NO_COLOR: "1",
        ...options.env,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (!(child.stdin && child.stdout && child.stderr)) {
      child.kill("SIGKILL");
      throw new Error("Gemini CLI returned null stdio streams");
    }

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdin.setDefaultEncoding("utf8");
    return child as ChildProcessWithoutNullStreams;
  }

  private buildArgs(options: SessionRuntimeOptions): string[] {
    const args = ["--output-format", "json"];
    const model = options.model ?? DEFAULT_MODEL;
    if (model) {
      args.push("-m", model);
    }
    return args;
  }

  private bindProcess(session: ActiveSession): void {
    const child = session.process;
    if (!child) {
      throw new Error("Gemini CLI process not attached");
    }
    const { eventEmitter } = session;
    child.stdout.on("data", (chunk: Buffer | string) => {
      const buffer =
        typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
      session.logger?.logCliOutput?.({ stream: "stdout", size: buffer.length });
      if (this.messageProcessor) {
        this.messageProcessor.handleStdout(session, buffer);
      } else {
        session.stdoutBuffer += buffer.toString("utf8");
      }
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      session.logger?.logCliOutput?.({ stream: "stderr", text });
      session.reporter?.warn?.("Gemini CLI stderr", {
        sessionId: session.sessionId,
        text,
      });
      eventEmitter.emit("error", {
        type: "stderr",
        provider: "gemini",
        payload: { text },
      });
    });

    child.once("exit", (code: number | null, signal: NodeJS.Signals | null) => {
      this.finalizeSession(session, { code, signal });
    });

    child.once("error", (error) => {
      session.logger?.logError?.({ error, stage: "process" });
      session.reporter?.error?.("Gemini CLI process error", error, {
        sessionId: session.sessionId,
      });
      eventEmitter.emit("error", {
        type: "process_error",
        provider: "gemini",
        payload: { message: error.message },
      });
    });
  }

  private finalizeSession(
    session: ActiveSession,
    details: { code: number | null; signal: NodeJS.Signals | null }
  ): void {
    session.status = "closed";
    session.handshakePending = false;
    session.handshakePromise = null;
    session.stdoutBuffer = "";
    session.logger?.end();
    session.eventEmitter.emit("message", {
      type: "system",
      provider: "gemini",
      content: this.describeExit(details),
      payload: details,
    });
    this.messageProcessor?.handleProcessExit(session, details);
    if (session.process) {
      session.process.stdout.removeAllListeners();
      session.process.stderr.removeAllListeners();
      session.process.removeAllListeners();
    }
    session.process = null;

    if (session.markedForDeletion) {
      this.sessions.delete(session.sessionId);
      session.eventEmitter.removeAllListeners();
      session.markedForDeletion = false;
    }
  }

  private describeExit(details: {
    code: number | null;
    signal: NodeJS.Signals | null;
  }): string {
    if (details.signal) {
      return `Gemini CLI exited via signal ${details.signal}`;
    }
    return `Gemini CLI exited with code ${details.code ?? "unknown"}`;
  }

  private async waitForExit(
    session: ActiveSession,
    timeoutMs: number
  ): Promise<boolean> {
    if (!session.process) {
      return true;
    }
    const result = await Promise.race([
      once(session.process, "exit"),
      delay(timeoutMs, TIMEOUT_TOKEN),
    ]);
    return result !== TIMEOUT_TOKEN;
  }
}
