import type { SupervisorHealth } from "@codeai-hub/core-supervisor";
import { readHealth } from "@codeai-hub/core-supervisor";
import { resolvePreferredCorePort } from "./core-port-candidates";

type CoreHealthPayload = SupervisorHealth;

export type RunningCoreInfo =
  | {
      readonly kind: "match";
      readonly port: number;
      readonly version?: string;
      readonly pid?: number;
    }
  | {
      readonly kind: "mismatch";
      readonly port: number;
      readonly version?: string;
      readonly pid?: number;
    };

export type PortDecision =
  | { readonly kind: "running"; readonly port: number }
  | { readonly kind: "launch"; readonly port: number };

interface CorePortManagerOptions {
  readonly envPort: number;
  readonly host: string;
}

export class CorePortManager {
  private readonly host: string;

  private readonly envPort: number;

  constructor(options: CorePortManagerOptions) {
    this.host = options.host;
    this.envPort = options.envPort;
  }

  async resolve(
    targetVersion: string | undefined,
    preferredPort?: number
  ): Promise<PortDecision> {
    const port = await this.resolvePort(preferredPort);
    const health = await this.fetchCoreHealth(port);
    if (health && this.canReuseCore(health.version, targetVersion)) {
      return { kind: "running", port };
    }
    return { kind: "launch", port };
  }

  async detectRunning(
    targetVersion: string | undefined,
    preferredPort?: number
  ): Promise<RunningCoreInfo | null> {
    const port = await this.resolvePort(preferredPort);
    const health = await this.fetchCoreHealth(port);
    if (!health) {
      return null;
    }
    if (!targetVersion || health.version === targetVersion) {
      return {
        kind: "match",
        port,
        version: health.version,
        pid: health.pid,
      };
    }
    return {
      kind: "mismatch",
      port,
      version: health.version,
      pid: health.pid,
    };
  }

  private async resolvePort(preferredPort?: number): Promise<number> {
    return await resolvePreferredCorePort(this.envPort, preferredPort);
  }

  private async fetchCoreHealth(
    port: number
  ): Promise<CoreHealthPayload | null> {
    const health = await readHealth({ host: this.host, port });
    if (!health || health.status !== "ok") {
      return null;
    }
    return health;
  }

  private canReuseCore(
    healthVersion: string | undefined,
    targetVersion?: string
  ): boolean {
    const expectedVersion = targetVersion ?? healthVersion;
    return (
      typeof healthVersion === "string" &&
      typeof expectedVersion === "string" &&
      healthVersion === expectedVersion
    );
  }
}
