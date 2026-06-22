import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import {
  createInterface,
  type Interface as ReadlineInterface,
} from "node:readline";

export interface KimiWireProcessBridgeOptions {
  readonly args: readonly string[];
  readonly command?: string;
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly onLine?: (line: string) => void;
  readonly onStderr?: (line: string) => void;
}

export class KimiWireProcessBridge {
  private child: ChildProcessWithoutNullStreams | null = null;
  private readonly options: KimiWireProcessBridgeOptions;
  private stderrReader: ReadlineInterface | null = null;
  private stdoutReader: ReadlineInterface | null = null;

  constructor(options: KimiWireProcessBridgeOptions) {
    this.options = options;
  }

  get isRunning(): boolean {
    return this.child !== null && this.child.exitCode === null;
  }

  start(): Promise<void> {
    if (this.child) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const command = this.options.command ?? "kimi";
      const child = spawn(command, [...this.options.args], {
        cwd: this.options.cwd,
        env: this.options.env,
        stdio: ["pipe", "pipe", "pipe"],
      });
      this.child = child;

      const rejectStartup = (error: Error): void => {
        this.cleanup();
        reject(new Error(`Kimi ACP process failed to start: ${error.message}`));
      };

      child.once("error", rejectStartup);
      child.once("spawn", () => {
        child.off("error", rejectStartup);
        this.attachReaders(child);
        resolve();
      });
      child.once("exit", (code, signal) => {
        this.cleanup();
        if (code !== 0 && code !== null) {
          this.options.onStderr?.(`Kimi ACP process exited with code ${code}.`);
        } else if (signal) {
          this.options.onStderr?.(
            `Kimi ACP process exited with signal ${signal}.`
          );
        }
      });
    });
  }

  sendJson(message: unknown): void {
    const child = this.requireChild();
    child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  stop(): Promise<void> {
    const child = this.child;
    if (!child) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      child.once("exit", () => resolve());
      child.kill("SIGTERM");
      setTimeout(() => {
        if (this.isRunning) {
          child.kill("SIGKILL");
        }
      }, 1000).unref();
    });
  }

  private attachReaders(child: ChildProcessWithoutNullStreams): void {
    this.stdoutReader = createInterface({ input: child.stdout });
    this.stderrReader = createInterface({ input: child.stderr });
    this.stdoutReader.on("line", (line) => this.options.onLine?.(line));
    this.stderrReader.on("line", (line) => this.options.onStderr?.(line));
  }

  private cleanup(): void {
    this.stdoutReader?.close();
    this.stderrReader?.close();
    this.stdoutReader = null;
    this.stderrReader = null;
    this.child = null;
  }

  private requireChild(): ChildProcessWithoutNullStreams {
    if (!this.child) {
      throw new Error("Cannot write to Kimi ACP process before it is started.");
    }
    return this.child;
  }
}
