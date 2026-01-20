import { spawn } from "node:child_process";
import type { Logger } from "../../telemetry/logger";
import type {
  WorkflowGateEvent,
  WorkflowStageCompletedEvent,
  WorkflowStageId,
  WorkflowWatcherEvent,
} from "../watcher/watcher-types";

export type WorkflowGateDefinition = {
  readonly gateId: string;
  readonly command: string;
};

export type WorkflowGatesConfig = {
  readonly global?: readonly WorkflowGateDefinition[];
  readonly stages?: Partial<
    Record<WorkflowStageId, readonly WorkflowGateDefinition[]>
  >;
};

export type WorkflowGateRunResult = {
  readonly gateId: string;
  readonly ok: boolean;
  readonly detail?: string;
};

export type WorkflowGateEmitter = (event: WorkflowGateEvent) => void;

const DEFAULT_MAX_OUTPUT = 4000;

const appendChunk = (
  current: string,
  chunk: string,
  maxLength: number
): string => {
  if (current.length >= maxLength) {
    return current;
  }
  const remaining = maxLength - current.length;
  return `${current}${chunk.slice(0, remaining)}`;
};

const buildFailureDetail = (params: {
  readonly command: string;
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
}): string => {
  const parts = [
    `Command: ${params.command}`,
    `Exit code: ${params.exitCode ?? "unknown"}`,
  ];
  const output =
    params.stderr.trim().length > 0 ? params.stderr : params.stdout;
  if (output.trim().length > 0) {
    parts.push(`Output: ${output.trim()}`);
  }
  return parts.join("\n");
};

export class WorkflowGatesRunner {
  private readonly logger: Logger;
  private readonly maxOutput: number;

  constructor(options: {
    readonly logger: Logger;
    readonly maxOutput?: number;
  }) {
    this.logger = options.logger;
    this.maxOutput = options.maxOutput ?? DEFAULT_MAX_OUTPUT;
  }

  runGate(params: {
    readonly gate: WorkflowGateDefinition;
    readonly workspacePath: string;
  }): Promise<WorkflowGateRunResult> {
    return new Promise((resolve) => {
      let resolved = false;
      let stdout = "";
      let stderr = "";

      const child = spawn(params.gate.command, {
        cwd: params.workspacePath,
        shell: true,
        env: process.env,
      });

      child.stdout?.on("data", (chunk: Buffer) => {
        stdout = appendChunk(stdout, chunk.toString("utf8"), this.maxOutput);
      });

      child.stderr?.on("data", (chunk: Buffer) => {
        stderr = appendChunk(stderr, chunk.toString("utf8"), this.maxOutput);
      });

      child.on("error", (error) => {
        if (resolved) {
          return;
        }
        resolved = true;
        this.logger.error("Workflow gate command failed", error, {
          gateId: params.gate.gateId,
          command: params.gate.command,
        });
        resolve({
          gateId: params.gate.gateId,
          ok: false,
          detail: error instanceof Error ? error.message : String(error),
        });
      });

      child.on("close", (code) => {
        if (resolved) {
          return;
        }
        resolved = true;
        if (code === 0) {
          resolve({ gateId: params.gate.gateId, ok: true });
          return;
        }
        resolve({
          gateId: params.gate.gateId,
          ok: false,
          detail: buildFailureDetail({
            command: params.gate.command,
            exitCode: code,
            stdout,
            stderr,
          }),
        });
      });
    });
  }
}

const buildRunKey = (event: WorkflowStageCompletedEvent): string =>
  `${event.workspaceSlug}:${event.stage}`;

const resolveStageGates = (
  config: WorkflowGatesConfig,
  stage: WorkflowStageCompletedEvent["stage"]
): readonly WorkflowGateDefinition[] => [
  ...(config.global ?? []),
  ...(config.stages?.[stage] ?? []),
];

export class WorkflowGatesFacade {
  private readonly config: WorkflowGatesConfig;
  private readonly logger: Logger;
  private readonly runner: WorkflowGatesRunner;
  private readonly emitGateEvent: WorkflowGateEmitter;
  private readonly clock: () => string;
  private readonly workspacePath: string;
  private readonly inFlight = new Set<string>();

  constructor(options: {
    readonly workspacePath: string;
    readonly logger: Logger;
    readonly emitGateEvent: WorkflowGateEmitter;
    readonly config?: WorkflowGatesConfig;
    readonly runner?: WorkflowGatesRunner;
    readonly clock?: () => string;
  }) {
    this.workspacePath = options.workspacePath;
    this.logger = options.logger;
    this.emitGateEvent = options.emitGateEvent;
    this.config = options.config ?? {};
    this.runner =
      options.runner ??
      new WorkflowGatesRunner({
        logger: options.logger,
      });
    this.clock = options.clock ?? (() => new Date().toISOString());
  }

  handle(event: WorkflowWatcherEvent): void {
    if (event.type !== "workflow.stage.completed") {
      return;
    }
    const runKey = buildRunKey(event);
    if (this.inFlight.has(runKey)) {
      return;
    }
    const gates = resolveStageGates(this.config, event.stage);
    if (gates.length === 0) {
      return;
    }
    this.inFlight.add(runKey);
    this.runStageGates(event, gates).finally(() => {
      this.inFlight.delete(runKey);
    });
  }

  private async runStageGates(
    event: WorkflowStageCompletedEvent,
    gates: readonly WorkflowGateDefinition[]
  ): Promise<void> {
    for (const gate of gates) {
      this.emitGateEvent({
        type: "workflow.gate.started",
        timestamp: this.clock(),
        workspaceSlug: event.workspaceSlug,
        gateId: gate.gateId,
        stage: event.stage,
      });

      const result = await this.runner.runGate({
        gate,
        workspacePath: this.workspacePath,
      });

      if (!result.ok) {
        this.logger.warn("Workflow gate failed", {
          gateId: gate.gateId,
          stage: event.stage,
          detail: result.detail,
        });
        this.emitGateEvent({
          type: "workflow.gate.failed",
          timestamp: this.clock(),
          workspaceSlug: event.workspaceSlug,
          gateId: gate.gateId,
          stage: event.stage,
          detail: result.detail,
        });
        return;
      }

      this.emitGateEvent({
        type: "workflow.gate.passed",
        timestamp: this.clock(),
        workspaceSlug: event.workspaceSlug,
        gateId: gate.gateId,
        stage: event.stage,
      });
    }
  }
}
