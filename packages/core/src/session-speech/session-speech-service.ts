import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Logger } from "../telemetry/logger";

const APPLE_SPEECH_HELPER_RELATIVE_PATH = [
  "native",
  "apple-speech-helper",
  ".build",
  "release",
  "apple-speech-helper",
] as const;

const DEFAULT_RATE = 1;
const MAX_RATE = 2;
const MIN_RATE = 0.75;
const DEFAULT_SPEAK_TIMEOUT_MS = 5 * 60 * 1000;

export type SessionSpeechStatus =
  | "error"
  | "finished"
  | "idle"
  | "speaking"
  | "starting"
  | "stopping";

export interface SessionSpeechSpeakRequest {
  readonly language?: string | null;
  readonly messageId: string;
  readonly providerId?: string | null;
  readonly rate?: number | null;
  readonly sessionId: string;
  readonly text: string;
}

export interface SessionSpeechStopRequest {
  readonly messageId?: string | null;
  readonly sessionId?: string | null;
}

export interface SessionSpeechState {
  readonly error?: string;
  readonly helperPath?: string;
  readonly messageId: string | null;
  readonly normalizedRate?: number;
  readonly sessionId: string | null;
  readonly status: SessionSpeechStatus;
  readonly updatedAt: string;
}

interface AppleSpeechHelperResponse {
  readonly diagnostic?: string;
  readonly errorCode?: string;
  readonly helperStatus?: string;
  readonly message?: string;
  readonly normalizedRate?: number;
  readonly ok?: boolean;
  readonly userMessageCode?: string;
}

type SpeechProcessFactory = (
  helperPath: string
) => ChildProcessWithoutNullStreams;

type StateListener = (state: SessionSpeechState) => void;

interface ActiveSpeechProcess {
  readonly child: ChildProcessWithoutNullStreams;
  readonly messageId: string;
  readonly sessionId: string;
  stopRequested: boolean;
  readonly timeout: NodeJS.Timeout;
}

export interface SessionSpeechServiceOptions {
  readonly helperPathCandidates?: readonly string[];
  readonly logger?: Pick<Logger, "info" | "warn">;
  readonly now?: () => string;
  readonly onStateChange?: StateListener;
  readonly processFactory?: SpeechProcessFactory;
  readonly speakTimeoutMs?: number;
}

const isExecutableFile = (path: string): boolean => {
  try {
    return existsSync(path) && statSync(path).isFile();
  } catch {
    return false;
  }
};

const defaultAppleSpeechHelperPathCandidates = (): readonly string[] => [
  ...(process.env.CODEAI_APPLE_SPEECH_HELPER_PATH
    ? [process.env.CODEAI_APPLE_SPEECH_HELPER_PATH]
    : []),
  ...(process.argv[1]
    ? [
        join(
          dirname(process.argv[1]),
          "..",
          ...APPLE_SPEECH_HELPER_RELATIVE_PATH
        ),
      ]
    : []),
  join(process.cwd(), ...APPLE_SPEECH_HELPER_RELATIVE_PATH),
];

export const resolveAppleSpeechHelperPath = (
  candidates: readonly string[] = defaultAppleSpeechHelperPathCandidates()
): string | null => candidates.find(isExecutableFile) ?? null;

export const normalizeSpeechRate = (
  rate: number | null | undefined
): number => {
  if (typeof rate !== "number" || !Number.isFinite(rate)) {
    return DEFAULT_RATE;
  }
  return Math.min(MAX_RATE, Math.max(MIN_RATE, rate));
};

export const parseAppleSpeechHelperResponse = (
  stdout: string
): AppleSpeechHelperResponse | null => {
  for (const line of stdout.split("\n").reverse()) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) {
      continue;
    }
    try {
      return JSON.parse(trimmed) as AppleSpeechHelperResponse;
    } catch {
      return null;
    }
  }
  return null;
};

const createProcess: SpeechProcessFactory = (helperPath) =>
  spawn(helperPath, { stdio: ["pipe", "pipe", "pipe"] });

export class SessionSpeechService {
  private activeProcess: ActiveSpeechProcess | null = null;
  private readonly helperPathCandidates?: readonly string[];
  private readonly logger?: Pick<Logger, "info" | "warn">;
  private readonly now: () => string;
  private stateListener?: StateListener;
  private readonly processFactory: SpeechProcessFactory;
  private readonly speakTimeoutMs: number;
  private state: SessionSpeechState;

  constructor(options: SessionSpeechServiceOptions = {}) {
    this.helperPathCandidates = options.helperPathCandidates;
    this.logger = options.logger;
    this.now = options.now ?? (() => new Date().toISOString());
    this.stateListener = options.onStateChange;
    this.processFactory = options.processFactory ?? createProcess;
    this.speakTimeoutMs = options.speakTimeoutMs ?? DEFAULT_SPEAK_TIMEOUT_MS;
    this.state = this.createState({
      messageId: null,
      sessionId: null,
      status: "idle",
    });
  }

  getState(): SessionSpeechState {
    return this.state;
  }

  setStateListener(listener: StateListener | undefined): void {
    this.stateListener = listener;
  }

  speak(request: SessionSpeechSpeakRequest): SessionSpeechState {
    const text = request.text.trim();
    const normalizedRate = normalizeSpeechRate(request.rate);
    if (text.length === 0) {
      return this.updateState({
        error: "Text-to-Speech received an empty message.",
        messageId: request.messageId,
        normalizedRate,
        sessionId: request.sessionId,
        status: "error",
      });
    }

    if (this.activeProcess) {
      this.stop({
        messageId: request.messageId,
        sessionId: request.sessionId,
      });
    }

    const helperPath = resolveAppleSpeechHelperPath(this.helperPathCandidates);
    if (!helperPath) {
      this.logger?.warn("Apple Text-to-Speech helper unavailable", {
        messageId: request.messageId,
        sessionId: request.sessionId,
      });
      return this.updateState({
        error: "Apple Text-to-Speech helper is unavailable.",
        messageId: request.messageId,
        normalizedRate,
        sessionId: request.sessionId,
        status: "error",
      });
    }

    const child = this.processFactory(helperPath);
    const timeout = setTimeout(() => {
      const active = this.activeProcess;
      if (active?.child === child) {
        active.stopRequested = true;
      }
      child.kill("SIGTERM");
    }, this.speakTimeoutMs);
    this.activeProcess = {
      child,
      messageId: request.messageId,
      sessionId: request.sessionId,
      stopRequested: false,
      timeout,
    };
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      this.finishActiveProcess(child, {
        error: error.message,
        normalizedRate,
        request,
        status: "error",
      });
    });
    child.on("close", () => {
      const active = this.activeProcess;
      if (active?.child === child && active.stopRequested) {
        this.finishActiveProcess(child, {
          normalizedRate,
          request,
          status: "idle",
        });
        return;
      }
      const response = parseAppleSpeechHelperResponse(stdout);
      if (response?.ok === true) {
        this.finishActiveProcess(child, {
          normalizedRate:
            typeof response.normalizedRate === "number"
              ? response.normalizedRate
              : normalizedRate,
          request,
          status: "finished",
        });
        return;
      }
      this.finishActiveProcess(child, {
        error:
          response?.message ??
          response?.diagnostic ??
          stderr.trim() ??
          "Apple Text-to-Speech helper failed.",
        normalizedRate,
        request,
        status: "error",
      });
    });
    child.stdin.end(
      JSON.stringify({
        command: "speak",
        language: request.language ?? undefined,
        rate: normalizedRate,
        text,
      })
    );

    this.logger?.info("Apple Text-to-Speech started", {
      helperPath,
      messageId: request.messageId,
      providerId: request.providerId ?? null,
      sessionId: request.sessionId,
    });
    return this.updateState({
      helperPath,
      messageId: request.messageId,
      normalizedRate,
      sessionId: request.sessionId,
      status: "speaking",
    });
  }

  stop(request: SessionSpeechStopRequest = {}): SessionSpeechState {
    const active = this.activeProcess;
    if (!active) {
      return this.updateState({
        messageId: request.messageId ?? this.state.messageId,
        sessionId: request.sessionId ?? this.state.sessionId,
        status: "idle",
      });
    }

    active.stopRequested = true;
    clearTimeout(active.timeout);
    active.child.kill("SIGTERM");
    return this.updateState({
      messageId: active.messageId,
      sessionId: active.sessionId,
      status: "stopping",
    });
  }

  private createState(input: {
    readonly error?: string;
    readonly helperPath?: string;
    readonly messageId: string | null;
    readonly normalizedRate?: number;
    readonly sessionId: string | null;
    readonly status: SessionSpeechStatus;
  }): SessionSpeechState {
    return {
      ...input,
      updatedAt: this.now(),
    };
  }

  private finishActiveProcess(
    child: ChildProcessWithoutNullStreams,
    result: {
      readonly error?: string;
      readonly normalizedRate: number;
      readonly request: SessionSpeechSpeakRequest;
      readonly status: SessionSpeechStatus;
    }
  ): void {
    const active = this.activeProcess;
    if (active?.child !== child) {
      return;
    }
    clearTimeout(active.timeout);
    this.activeProcess = null;
    this.updateState({
      error: result.error,
      messageId: result.request.messageId,
      normalizedRate: result.normalizedRate,
      sessionId: result.request.sessionId,
      status: result.status,
    });
  }

  private updateState(input: {
    readonly error?: string;
    readonly helperPath?: string;
    readonly messageId: string | null;
    readonly normalizedRate?: number;
    readonly sessionId: string | null;
    readonly status: SessionSpeechStatus;
  }): SessionSpeechState {
    this.state = this.createState(input);
    this.stateListener?.(this.state);
    return this.state;
  }
}
