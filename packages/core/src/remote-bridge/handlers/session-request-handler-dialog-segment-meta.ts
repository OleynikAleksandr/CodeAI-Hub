import { homedir } from "node:os";
import path from "node:path";
import {
  buildSessionFilePath,
  readSessionEvents,
  sanitizeWorkspaceSlug,
} from "@codeai-hub/unified-session";
import { ContinuityChainStore } from "../../session-continuity/continuity-store";
import type { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import { computeRemainingPercent } from "../../session-continuity/token-usage";
import type {
  Session,
  SessionManager,
  SessionMessage,
} from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import type { BridgeEvent } from "../types";

const SESSION_ROOT = path.join(homedir(), ".codeai-hub", "sessions");
const DIALOG_SEGMENT_BOUNDARY_MARKER = "__CODEAIHUB_SEGMENT_BOUNDARY__";
const DIALOG_SEGMENT_META_MARKER = "__CODEAIHUB_SEGMENT_META__:";

interface UnifiedSessionSegmentSummaryPayload {
  readonly kind: "segment_summary";
  readonly segments: readonly {
    readonly index: number;
    readonly remainingPercent?: number;
  }[];
}

const isUnifiedSessionSegmentSummaryPayload = (
  value: unknown
): value is UnifiedSessionSegmentSummaryPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as {
    readonly kind?: unknown;
    readonly segments?: unknown;
  };
  if (record.kind !== "segment_summary" || !Array.isArray(record.segments)) {
    return false;
  }
  for (const segment of record.segments) {
    if (!segment || typeof segment !== "object") {
      return false;
    }
    const candidate = segment as {
      readonly index?: unknown;
      readonly remainingPercent?: unknown;
    };
    if (
      typeof candidate.index !== "number" ||
      !Number.isFinite(candidate.index)
    ) {
      return false;
    }
    if (
      candidate.remainingPercent !== undefined &&
      (typeof candidate.remainingPercent !== "number" ||
        !Number.isFinite(candidate.remainingPercent))
    ) {
      return false;
    }
  }
  return true;
};

interface SessionRequestHandlerDialogSegmentMetaDependencies {
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly continuity: SessionContinuityFacade;
  readonly continuityRootBySessionId: Map<string, string>;
  readonly logger: Logger;
  readonly sessionManager: SessionManager;
  readonly sessionStorage: UnifiedSessionStorage;
}

export class SessionRequestHandlerDialogSegmentMeta {
  private readonly deps: SessionRequestHandlerDialogSegmentMetaDependencies;
  private readonly writeInFlight = new Set<string>();

  constructor(deps: SessionRequestHandlerDialogSegmentMetaDependencies) {
    this.deps = deps;
  }

  async appendDialogSegmentBoundaryMeta(options: {
    readonly session: Session;
    readonly workspaceSlug: string;
    readonly stageId: string;
    readonly silent: boolean;
  }): Promise<void> {
    if (options.silent) {
      return;
    }

    const rootDialogId =
      this.deps.continuityRootBySessionId.get(options.session.id) ??
      options.session.id;

    try {
      const workspaceKey = sanitizeWorkspaceSlug(options.session.workspacePath);
      const jsonlPath = buildSessionFilePath({
        rootDirectory: SESSION_ROOT,
        workspaceSlug: workspaceKey,
        provider: options.session.providerId,
        sessionId: sanitizeWorkspaceSlug(rootDialogId),
      });

      await this.deps.continuity.ensureTrackedOnOutboundMessage({
        sessionId: options.session.id,
        providerSessionId: options.session.providerSessionId,
      });

      const store = new ContinuityChainStore({
        workspaceRoot: options.session.workspacePath,
        workspaceSlug: options.workspaceSlug,
        stage: options.stageId,
        rootSessionId: rootDialogId,
      });

      const chain = await store.read();
      if (!chain || chain.segments.length <= 1) {
        return;
      }

      const inFlightKey = `${jsonlPath}#${chain.segments.length}`;
      if (this.writeInFlight.has(inFlightKey)) {
        this.deps.logger.warn(
          "Skipping dialog segment meta append (in-flight)",
          {
            dialogId: rootDialogId,
            sessionId: options.session.id,
            segments: chain.segments.length,
          }
        );
        return;
      }
      this.writeInFlight.add(inFlightKey);
      try {
        const latestSummary = await this.readLatestSegmentSummary(jsonlPath);
        if (
          latestSummary &&
          latestSummary.segments.length === chain.segments.length
        ) {
          this.deps.logger.info("Dialog segment meta already up-to-date", {
            dialogId: rootDialogId,
            sessionId: options.session.id,
            segments: chain.segments.length,
          });
          return;
        }

        const segments = chain.segments.map((segment, index) => {
          const snapshot = segment.tokenUsage ?? null;
          const remainingPercent = snapshot
            ? computeRemainingPercent(snapshot)
            : null;
          return {
            index: index + 1,
            providerId: segment.providerId,
            providerSessionId: segment.providerSessionId,
            ...(remainingPercent === null ? {} : { remainingPercent }),
          } as const;
        });

        const payload = {
          kind: "segment_summary",
          dialogId: rootDialogId,
          segments,
        } as const;

        const content = [
          DIALOG_SEGMENT_BOUNDARY_MARKER,
          "Новая сессия",
          `${DIALOG_SEGMENT_META_MARKER}${JSON.stringify(payload)}`,
        ].join("\n");

        const metaMessage = this.deps.sessionManager.appendMessage(
          options.session.id,
          "system",
          content
        );
        if (!metaMessage) {
          return;
        }
        await this.deps.sessionStorage.appendMessage(
          options.session.id,
          metaMessage
        );
        this.deps.broadcaster({
          type: "session:message",
          payload: metaMessage,
        });
        this.broadcastDialogMessage(options.session.id, metaMessage);
      } finally {
        this.writeInFlight.delete(inFlightKey);
      }
    } catch (error: unknown) {
      this.deps.logger.warn("Failed to append dialog segment meta", {
        dialogId: rootDialogId,
        sessionId: options.session.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private broadcastDialogMessage(
    sessionId: string,
    message: SessionMessage
  ): void {
    const dialogId = this.deps.continuityRootBySessionId.get(sessionId) ?? null;
    if (!dialogId) {
      return;
    }
    this.deps.broadcaster({
      type: "dialog:message",
      payload: {
        dialogId,
        sessionId,
        message,
      },
    });
  }

  private tryParseSegmentSummaryPayloadFromBoundaryMessage(
    content: string
  ): UnifiedSessionSegmentSummaryPayload | null {
    const lines = content.split("\n").map((line) => line.trim());
    if (lines[0] !== DIALOG_SEGMENT_BOUNDARY_MARKER) {
      return null;
    }
    const metaLine = lines.find((line) =>
      line.startsWith(DIALOG_SEGMENT_META_MARKER)
    );
    if (!metaLine) {
      return null;
    }
    const json = metaLine.slice(DIALOG_SEGMENT_META_MARKER.length).trim();
    if (!json) {
      return null;
    }
    try {
      const parsed = JSON.parse(json) as unknown;
      return isUnifiedSessionSegmentSummaryPayload(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private async readLatestSegmentSummary(
    jsonlPath: string
  ): Promise<UnifiedSessionSegmentSummaryPayload | null> {
    const existingRecords = await readSessionEvents(jsonlPath);
    let latestSummary: UnifiedSessionSegmentSummaryPayload | null = null;
    for (const record of existingRecords) {
      if (record.type !== "message" || record.role !== "system") {
        continue;
      }
      const parsed = this.tryParseSegmentSummaryPayloadFromBoundaryMessage(
        record.content
      );
      if (parsed) {
        latestSummary = parsed;
      }
    }
    return latestSummary;
  }
}
