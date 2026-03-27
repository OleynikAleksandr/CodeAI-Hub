import type { Session } from "../session-manager";
import type { Logger } from "../telemetry/logger";
import { ContinuityMonitor } from "./continuity-monitor";
import { readContinuityChains } from "./continuity-store";
import { ContinuityTracker } from "./continuity-tracker";
import type { ContinuityChainSummary } from "./continuity-types";
import { buildHandoffPrompt } from "./handoff-prompt-builder";
import {
  buildHandoffReportPath,
  writeHandoffReport,
} from "./handoff-report-writer";
import { extractTokenUsage } from "./token-usage";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const extractMessageContent = (event: unknown): string | null => {
  if (!isRecord(event)) {
    return null;
  }
  if (typeof event.content === "string") {
    return event.content;
  }
  if (typeof event.data === "string") {
    return event.data;
  }
  return null;
};

const extractProviderSessionId = (event: unknown): string | null => {
  if (!isRecord(event)) {
    return null;
  }

  return (
    readString(event.providerSessionId) ??
    readString(event.claudeSessionId) ??
    null
  );
};

interface PendingHandoff {
  readonly rootSessionId: string;
  readonly stageId: string | null;
  readonly timestamp: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

interface ContinuityCallbacks {
  readonly createSession: (options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly context: {
      readonly initiativeSlug: string | null;
      readonly stage: string | null;
    };
    readonly rootSessionId: string;
  }) => Promise<Session | null>;
  readonly sendMessage: (sessionId: string, content: string) => Promise<void>;
}

export class SessionContinuityFacade {
  static readWorkspaceChains(options: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<ContinuityChainSummary[]> {
    return readContinuityChains(options);
  }

  static async readLastTokenUsageSnapshot(options: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
    readonly providerSessionId: string;
  }): Promise<import("./continuity-types").TokenUsageSnapshot | null> {
    const chains = await readContinuityChains({
      workspaceRoot: options.workspaceRoot,
      workspaceSlug: options.workspaceSlug,
    });

    let best: import("./continuity-types").TokenUsageSnapshot | null = null;
    for (const chain of chains) {
      for (const segment of chain.segments) {
        if (segment.providerSessionId !== options.providerSessionId) {
          continue;
        }
        const snapshot = segment.tokenUsage ?? null;
        if (!snapshot) {
          continue;
        }
        if (!best || snapshot.updatedAt > best.updatedAt) {
          best = snapshot;
        }
      }
    }

    return best;
  }

  private readonly logger: Logger;
  private readonly monitor: ContinuityMonitor;
  private readonly clock: () => string;
  private readonly callbacks: ContinuityCallbacks;
  private readonly tracker: ContinuityTracker;
  private readonly enableLegacyHandoff: boolean;
  private readonly pending = new Map<string, PendingHandoff>();
  private readonly sessionLookup: (sessionId: string) => Session | undefined;

  constructor(options: {
    readonly logger: Logger;
    readonly clock?: () => string;
    readonly remainingRatioThreshold?: number;
    readonly enableLegacyHandoff?: boolean;
    readonly callbacks: ContinuityCallbacks;
    readonly sessionLookup: (sessionId: string) => Session | undefined;
  }) {
    this.logger = options.logger;
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.monitor = new ContinuityMonitor({
      remainingRatioThreshold: options.remainingRatioThreshold,
    });
    this.callbacks = options.callbacks;
    this.sessionLookup = options.sessionLookup;
    this.enableLegacyHandoff = options.enableLegacyHandoff ?? false;
    this.tracker = new ContinuityTracker({
      logger: options.logger,
      clock: this.clock,
      sessionLookup: options.sessionLookup,
    });
  }

  registerSession(options: {
    readonly session: Session;
    readonly providerSessionId?: string | null;
    readonly rootSessionId?: string | null;
  }): void {
    this.tracker.registerSession({
      session: options.session,
      rootSessionId: options.rootSessionId ?? null,
    });
  }

  updateProviderSessionId(sessionId: string, providerSessionId: string): void {
    this.tracker.updateProviderSessionId(sessionId, providerSessionId);
  }

  ensureTrackedOnOutboundMessage(options: {
    readonly sessionId: string;
    readonly providerSessionId?: string | null;
  }): Promise<void> {
    return this.tracker.ensureTrackedOnOutboundMessage(options);
  }

  async handleProviderEvent(sessionId: string, event: unknown): Promise<void> {
    const session = this.sessionLookup(sessionId);
    if (!session) {
      return;
    }

    const usage = extractTokenUsage(event, this.clock());
    if (usage) {
      await this.persistTokenUsageSnapshot(session, event, usage);
      if (this.enableLegacyHandoff) {
        const decision = this.monitor.record(sessionId, usage);
        if (decision.shouldHandoff) {
          await this.requestHandoff(session);
        }
      }
    }

    if (this.enableLegacyHandoff && this.pending.has(sessionId)) {
      const content = extractMessageContent(event);
      if (content) {
        await this.finalizeHandoff(session, content);
      }
    }
  }

  private async persistTokenUsageSnapshot(
    session: Session,
    event: unknown,
    usage: import("./continuity-types").TokenUsageSnapshot
  ): Promise<void> {
    if (!session.initiativeSlug) {
      return;
    }

    const providerSessionId =
      session.providerSessionId ?? extractProviderSessionId(event);
    if (!providerSessionId) {
      return;
    }

    await this.tracker.ensureTrackedOnOutboundMessage({
      sessionId: session.id,
      providerSessionId,
    });

    const rootSessionId = this.tracker.getRootSessionId(session.id);
    await this.tracker.updateChain(session, rootSessionId, (chain) => {
      const updated = chain.segments.map((segment) =>
        segment.providerSessionId === providerSessionId
          ? { ...segment, tokenUsage: usage }
          : segment
      );
      return { ...chain, segments: updated, updatedAt: this.clock() };
    });
  }

  private async requestHandoff(session: Session): Promise<void> {
    const workspaceSlug = session.initiativeSlug;
    if (!workspaceSlug) {
      return;
    }
    if (this.pending.has(session.id)) {
      return;
    }

    const rootSessionId = this.tracker.getRootSessionId(session.id);
    const timestamp = this.clock();
    this.pending.set(session.id, {
      rootSessionId,
      workspaceRoot: session.workspacePath,
      workspaceSlug,
      stageId: session.stage ?? null,
      timestamp,
    });

    const reportPath = buildHandoffReportPath({
      workspaceRoot: session.workspacePath,
      workspaceSlug,
      stageId: session.stage ?? null,
      rootSessionId,
      timestamp,
    });
    const prompt = buildHandoffPrompt({
      agentId: session.providerId,
      stageId: session.stage ?? null,
      reportPath,
    });

    try {
      await this.callbacks.sendMessage(session.id, prompt);
    } catch (error) {
      this.pending.delete(session.id);
      this.logger.warn("Failed to send handoff prompt", {
        sessionId: session.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async finalizeHandoff(
    session: Session,
    content: string
  ): Promise<void> {
    const pending = this.pending.get(session.id);
    if (!pending) {
      return;
    }
    this.pending.delete(session.id);

    let reportPath: string;
    try {
      reportPath = await writeHandoffReport({
        workspaceRoot: pending.workspaceRoot,
        workspaceSlug: pending.workspaceSlug,
        stageId: pending.stageId,
        rootSessionId: pending.rootSessionId,
        timestamp: pending.timestamp,
        content,
      });
    } catch (error) {
      this.logger.warn("Failed to write handoff report", {
        sessionId: session.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    try {
      await this.tracker.updateChain(
        session,
        pending.rootSessionId,
        (chain) => {
          const updated = chain.segments.map((segment) =>
            segment.sessionId === session.id
              ? { ...segment, handoffReportPath: reportPath }
              : segment
          );
          return { ...chain, segments: updated, updatedAt: this.clock() };
        }
      );
    } catch (error) {
      this.logger.warn("Failed to update continuity chain", {
        sessionId: session.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const nextSession = await this.callbacks.createSession({
      providerId: session.providerId,
      workspacePath: session.workspacePath,
      context: {
        initiativeSlug: session.initiativeSlug,
        stage: session.stage,
      },
      rootSessionId: pending.rootSessionId,
    });

    if (!nextSession) {
      return;
    }

    const resumePrompt = [
      "You are continuing work using this handoff report.",
      "",
      content.trim(),
    ].join("\n");

    try {
      await this.callbacks.sendMessage(nextSession.id, resumePrompt);
    } catch (error) {
      this.logger.warn("Failed to send handoff resume prompt", {
        sessionId: nextSession.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
