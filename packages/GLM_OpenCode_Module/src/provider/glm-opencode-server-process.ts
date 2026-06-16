import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import type { GlmOpenCodeRuntimeProfile } from "./glm-opencode-runtime-profile";
import type { OpencodeClient } from "./glm-opencode-sdk-loader";
import { loadOpenCodeSdk } from "./glm-opencode-sdk-loader";

const LOCAL_SERVER_HOSTNAME = "127.0.0.1";
const SERVER_URL_PATTERN =
  /opencode server listening on\s+(https?:\/\/[^\s]+)/u;

export interface OpenCodeServerHandle {
  readonly child: ChildProcess;
  readonly client: OpencodeClient;
  readonly url: string;
}

const buildServerArgs = (): string[] => [
  "serve",
  "--hostname",
  LOCAL_SERVER_HOSTNAME,
  "--port",
  "0",
  "--print-logs",
  "--log-level",
  "INFO",
];

export class OpenCodeServerProcess {
  private handlePromise: Promise<OpenCodeServerHandle> | null = null;

  getHandle(profile: GlmOpenCodeRuntimeProfile): Promise<OpenCodeServerHandle> {
    if (this.handlePromise) {
      return this.handlePromise;
    }
    this.handlePromise = new Promise<OpenCodeServerHandle>(
      (resolve, reject) => {
        const child = spawn(profile.command, buildServerArgs(), {
          cwd: profile.workspacePath ?? process.cwd(),
          env: profile.environment,
          stdio: ["ignore", "pipe", "pipe"],
        });
        let output = "";
        let resolved = false;
        const finalizeFailure = (message: string): void => {
          if (resolved) {
            return;
          }
          resolved = true;
          this.handlePromise = null;
          reject(new Error(message));
        };
        const tryResolveFromOutput = async (chunk: string): Promise<void> => {
          output += chunk;
          const match = output.match(SERVER_URL_PATTERN);
          if (!match?.[1] || resolved) {
            return;
          }
          resolved = true;
          const sdk = await loadOpenCodeSdk();
          resolve({
            child,
            client: sdk.createOpencodeClient({ baseUrl: match[1] }),
            url: match[1],
          });
        };
        child.stdout.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => {
          tryResolveFromOutput(chunk).catch((error: unknown) => {
            finalizeFailure(
              error instanceof Error
                ? error.message
                : "OpenCode server transport failed."
            );
          });
        });
        child.stderr.setEncoding("utf8");
        child.stderr.on("data", (chunk: string) => {
          tryResolveFromOutput(chunk).catch((error: unknown) => {
            finalizeFailure(
              error instanceof Error
                ? error.message
                : "OpenCode server transport failed."
            );
          });
        });
        child.on("error", (error) => {
          finalizeFailure(
            `Failed to start OpenCode server transport: ${error.message}`
          );
        });
        child.on("exit", (code, signal) => {
          this.handlePromise = null;
          if (resolved) {
            return;
          }
          finalizeFailure(
            signal
              ? `OpenCode server transport exited with signal ${signal}.`
              : `OpenCode server transport exited with code ${code ?? "unknown"}.`
          );
        });
      }
    );
    return this.handlePromise;
  }
}
