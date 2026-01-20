import type { Session } from "../session-manager";
import type { Logger } from "../telemetry/logger";
import { ContinuityMonitor } from "./continuity-monitor";
import { ContinuityChainStore } from "./continuity-store";
import type { ContinuityChain, ContinuitySegment } from "./continuity-types";
import { buildHandoffPrompt } from "./handoff-prompt-builder";
import {
  buildHandoffReportPath,
  writeHandoffReport,
} from "./handoff-report-writer";
import { extractTokenUsage } from "./token-usage";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

type PendingHandoff = {
  readonly rootSessionId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly stageId: string | null;
  readonly timestamp: string;
};

type ContinuityCallbacks = {
  readonly sendMessage: (sessionId: string, content: string) => Promise<void>;
  readonly createSession: (options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly context: {
      readonly initiativeSlug: string | null;
      readonly stage: string | null;
    };
    readonly rootSessionId: string;
  }) => Promise<Session | null>;
};

export class SessionContinuityFacade {
  private readonly logger: Logger;
  private readonly monitor = new ContinuityMonitor();
  private readonly clock: () => string;
  private readonly callbacks: ContinuityCallbacks;
  private readonly rootBySessionId = new Map<string, string>();
  private readonly pending = new Map<string, PendingHandoff>();
  private readonly sessionLookup: (sessionId: string) => Session | undefined;

  constructor(options: {
    readonly logger: Logger;
    readonly clock?: () => string;
    readonly callbacks: ContinuityCallbacks;
    readonly sessionLookup: (sessionId: string) => Session | undefined;
  }) {
    this.logger = options.logger;
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.callbacks = options.callbacks;
    this.sessionLookup = options.sessionLookup;
  }

  registerSession(options: {
    readonly session: Session;
    readonly providerSessionId?: string | null;
    readonly rootSessionId?: string | null;
  }): void {
    const session = options.session;
    const rootSessionId =
      options.rootSessionId ??
      this.rootBySessionId.get(session.id) ??
      session.id;
    this.rootBySessionId.set(session.id, rootSessionId);

    const workspaceSlug = session.initiativeSlug;
    if (!workspaceSlug) {
      return;
    }
    const providerSessionId =
      options.providerSessionId ?? session.providerSessionId ?? "unknown";

    const store = this.createStore(session, rootSessionId);
    const segment: ContinuitySegment = {
      sessionId: session.id,
      providerId: session.providerId,
      providerSessionId,
      createdAt: session.createdAt,
    };

    store.appendSegment(segment).catch((error: unknown) => {
      this.logger.warn("Failed to append continuity segment", {
        sessionId: session.id,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  updateProviderSessionId(sessionId: string, providerSessionId: string): void {
    const session = this.sessionLookup(sessionId);
    if (!session) {
      return;
    }
    const rootSessionId = this.rootBySessionId.get(sessionId);
    if (!(rootSessionId && session.initiativeSlug)) {
      return;
    }

    this.updateChain(session, rootSessionId, (chain) => {
      const updated = chain.segments.map((segment) =>
        segment.sessionId === sessionId
          ? { ...segment, providerSessionId }
          : segment
      );
      return { ...chain, segments: updated, updatedAt: this.clock() };
    }).catch((error: unknown) => {
      this.logger.warn("Failed to update continuity provider session id", {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  async handleProviderEvent(sessionId: string, event: unknown): Promise<void> {
    const session = this.sessionLookup(sessionId);
    if (!session) {
      return;
    }

    const usage = extractTokenUsage(event, this.clock());
    if (usage) {
      const decision = this.monitor.record(sessionId, usage);
      if (decision.shouldHandoff) {
        await this.requestHandoff(session);
      }
    }

    if (this.pending.has(sessionId)) {
      const content = extractMessageContent(event);
      if (content) {
        await this.finalizeHandoff(session, content);
      }
    }
  }

  private async requestHandoff(session: Session): Promise<void> {
    const workspaceSlug = session.initiativeSlug;
    if (!workspaceSlug) {
      return;
    }
    if (this.pending.has(session.id)) {
      return;
    }

    const rootSessionId = this.rootBySessionId.get(session.id) ?? session.id;
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
      await this.updateChain(session, pending.rootSessionId, (chain) => {
        const updated = chain.segments.map((segment) =>
          segment.sessionId === session.id
            ? { ...segment, handoffReportPath: reportPath }
            : segment
        );
        return { ...chain, segments: updated, updatedAt: this.clock() };
      });
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

  private createStore(
    session: Session,
    rootSessionId: string
  ): ContinuityChainStore {
    return new ContinuityChainStore({
      workspaceRoot: session.workspacePath,
      workspaceSlug: session.initiativeSlug ?? "unknown",
      stage: session.stage,
      rootSessionId,
    });
  }

  private async updateChain(
    session: Session,
    rootSessionId: string,
    update: (chain: ContinuityChain) => ContinuityChain
  ): Promise<void> {
    if (!session.initiativeSlug) {
      return;
    }
    const store = this.createStore(session, rootSessionId);
    const existing = await store.read();
    if (!existing) {
      return;
    }
    const next = update(existing);
    await store.save(next);
  }
}
