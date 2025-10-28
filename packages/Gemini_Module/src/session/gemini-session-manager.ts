import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { EventEmitter, once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import type { GeminiMessageProcessor } from "../messaging/message-processor";
import type {
  ActiveSession,
  SessionCreationOptions,
  SessionCreationResult,
} from "./types";

const EXIT_TIMEOUT_MS = 2000;
const FORCE_EXIT_TIMEOUT_MS = 1000;
const TIMEOUT_TOKEN = Symbol("gemini_exit_timeout");
const DEFAULT_MODEL = "gemini-2.5-pro";

export class GeminiSessionManager {
  private readonly sessions = new Map<string, ActiveSession>();

  private messageProcessor: GeminiMessageProcessor | null = null;

  setMessageProcessor(processor: GeminiMessageProcessor): void {
    this.messageProcessor = processor;
  }

  listSessions(): readonly ActiveSession[] {
    return Array.from(this.sessions.values());
  }

  getSession(sessionId: string): ActiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  createSession(options: SessionCreationOptions): SessionCreationResult {
    const sessionId = randomUUID();
    const process = this.spawnProcess(options);
    const eventEmitter = new EventEmitter();
    const session: ActiveSession = {
      sessionId,
      createdAt: Date.now(),
      eventEmitter,
      process,
      stdoutBuffer: "",
      status: "running",
      model: options.model ?? DEFAULT_MODEL,
      logger: options.logger ?? undefined,
      reporter: options.reporter,
    };

    this.sessions.set(sessionId, session);
    session.logger?.start(sessionId);
    this.bindProcess(session);
    return { sessionId, session };
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Gemini session ${sessionId} not found`);
    }
    if (session.status !== "running") {
      throw new Error(`Gemini session ${sessionId} is not accepting input`);
    }

    const payload = content.endsWith("\n") ? content : `${content}\n`;
    session.logger?.logUserInput?.({ content });
    await new Promise<void>((resolve, reject) => {
      session.process.stdin.write(payload, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    if (session.status === "closed") {
      this.sessions.delete(sessionId);
      return;
    }

    session.status = "closing";
    try {
      session.process.stdin.write("/exit\n");
      session.logger?.logEvent({ type: "control", command: "/exit" });
    } catch (error) {
      session.logger?.logError?.({ error, stage: "send_exit" });
    }

    const graceful = await this.waitForExit(session, EXIT_TIMEOUT_MS);
    if (graceful) {
      return;
    }

    session.reporter?.warn?.("Gemini CLI did not exit gracefully", {
      sessionId,
    });
    session.process.kill("SIGTERM");
    const terminated = await this.waitForExit(session, FORCE_EXIT_TIMEOUT_MS);
    if (terminated) {
      return;
    }

    session.reporter?.warn?.("Force killing Gemini CLI", { sessionId });
    session.process.kill("SIGKILL");
    await this.waitForExit(session, FORCE_EXIT_TIMEOUT_MS);
  }

  private spawnProcess(
    options: SessionCreationOptions
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

  private buildArgs(options: SessionCreationOptions): string[] {
    const args = ["--output-format", "json"];
    const model = options.model ?? DEFAULT_MODEL;
    if (model) {
      args.push("-m", model);
    }
    return args;
  }

  private bindProcess(session: ActiveSession): void {
    const { process, eventEmitter } = session;
    process.stdout.on("data", (chunk: Buffer | string) => {
      const buffer =
        typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
      session.logger?.logCliOutput?.({ stream: "stdout", size: buffer.length });
      if (this.messageProcessor) {
        this.messageProcessor.handleStdout(session, buffer);
      } else {
        session.stdoutBuffer += buffer.toString("utf8");
      }
    });

    process.stderr.on("data", (chunk: Buffer | string) => {
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

    process.once(
      "exit",
      (code: number | null, signal: NodeJS.Signals | null) => {
        this.finalizeSession(session, { code, signal });
      }
    );

    process.once("error", (error) => {
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
    if (session.status === "closed") {
      return;
    }
    session.status = "closed";
    this.sessions.delete(session.sessionId);
    session.logger?.end();
    session.eventEmitter.emit("message", {
      type: "system",
      provider: "gemini",
      content: this.describeExit(details),
      payload: details,
    });
    this.messageProcessor?.handleProcessExit(session, details);
    session.eventEmitter.removeAllListeners();
    session.process.stdout.removeAllListeners();
    session.process.stderr.removeAllListeners();
    session.process.removeAllListeners();
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
    if (session.status === "closed") {
      return true;
    }
    const result = await Promise.race([
      once(session.process, "exit"),
      delay(timeoutMs, TIMEOUT_TOKEN),
    ]);
    return result !== TIMEOUT_TOKEN;
  }
}
