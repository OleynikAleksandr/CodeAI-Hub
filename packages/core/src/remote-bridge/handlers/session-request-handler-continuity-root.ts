import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import {
  buildSessionFilePath,
  sanitizeWorkspaceSlug,
} from "@codeai-hub/unified-session";
import { promoteContinuityChainRootIfPresent } from "../../session-continuity/continuity-store";
import { normalizeContinuityStageId } from "../../session-continuity/continuity-types";
import { buildHumanReadableDialogId } from "../../session-continuity/dialog-id";
import { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";

const SESSION_ROOT = `${homedir()}/.codeai-hub/sessions`;

export interface ContinuityRootResolutionOptions {
  readonly context: {
    readonly initiativeSlug: string | null;
    readonly providerSessionId: string | null;
    readonly runSlug: string | null;
    readonly stage: string | null;
  };
  readonly providerId: string;
  readonly rootSessionIdOverride: string | null;
  readonly sessionId: string;
  readonly workspaceRoot: string;
}

interface ExistingContinuityRootResolutionOptions {
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly stageId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

interface LegacyDescriptionRootPromotionOptions {
  readonly providerId: string;
  readonly rootSessionId: string;
  readonly stageId: string | null;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string | null;
}

interface SessionRequestHandlerContinuityRootDependencies {
  readonly logger: Logger;
  readonly sessionStorage: UnifiedSessionStorage;
}

export { normalizeContinuityStageId } from "../../session-continuity/continuity-types";

export class SessionRequestHandlerContinuityRoot {
  private readonly deps: SessionRequestHandlerContinuityRootDependencies;

  constructor(deps: SessionRequestHandlerContinuityRootDependencies) {
    this.deps = deps;
  }

  async resolveContinuityRootSessionId(
    options: ContinuityRootResolutionOptions
  ): Promise<string> {
    if (options.rootSessionIdOverride) {
      return await this.maybePromoteLegacyDescriptionAgentRootId({
        rootSessionId: options.rootSessionIdOverride,
        workspaceRoot: options.workspaceRoot,
        providerId: options.providerId,
        workspaceSlug: options.context.initiativeSlug,
        stageId: options.context.stage,
      });
    }

    const workspaceSlug = options.context.initiativeSlug;
    const stageId = options.context.stage;
    if (!(workspaceSlug && stageId)) {
      return options.sessionId;
    }

    const requestedProviderSessionId = options.context.providerSessionId;
    if (requestedProviderSessionId) {
      const existingRoot = await this.tryResolveExistingContinuityRootSessionId(
        {
          providerId: options.providerId,
          workspaceRoot: options.workspaceRoot,
          workspaceSlug,
          stageId,
          providerSessionId: requestedProviderSessionId,
        }
      );
      if (existingRoot) {
        return await this.maybePromoteLegacyDescriptionAgentRootId({
          rootSessionId: existingRoot,
          workspaceRoot: options.workspaceRoot,
          providerId: options.providerId,
          workspaceSlug,
          stageId,
        });
      }
    }

    return buildHumanReadableDialogId({
      providerId: options.providerId,
      uuid: options.sessionId,
      agentRole: options.context.runSlug ?? options.context.stage ?? null,
    });
  }

  async maybePromoteLegacyDescriptionAgentRootId(
    options: LegacyDescriptionRootPromotionOptions
  ): Promise<string> {
    if (
      options.stageId !== "description" ||
      !options.rootSessionId.endsWith("-agent")
    ) {
      return options.rootSessionId;
    }

    const normalizedRootSessionId = `${options.rootSessionId.slice(0, -"-agent".length)}-description`;
    this.deps.sessionStorage.promoteHistoryFile({
      workspaceSlug: sanitizeWorkspaceSlug(options.workspaceRoot),
      providerId: options.providerId,
      fromHistorySessionId: options.rootSessionId,
      toHistorySessionId: normalizedRootSessionId,
    });
    if (options.workspaceSlug) {
      try {
        await promoteContinuityChainRootIfPresent({
          workspaceRoot: options.workspaceRoot,
          workspaceSlug: options.workspaceSlug,
          stage: options.stageId,
          fromRootSessionId: options.rootSessionId,
          toRootSessionId: normalizedRootSessionId,
        });
      } catch (error: unknown) {
        this.deps.logger.warn(
          "Failed to promote continuity chain root session id",
          {
            workspaceSlug: options.workspaceSlug,
            stageId: options.stageId,
            providerId: options.providerId,
            fromRootSessionId: options.rootSessionId,
            toRootSessionId: normalizedRootSessionId,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }
    }
    return normalizedRootSessionId;
  }

  private async tryResolveExistingContinuityRootSessionId(
    options: ExistingContinuityRootResolutionOptions
  ): Promise<string | null> {
    const providerSessionId = options.providerSessionId.trim();
    if (providerSessionId.length === 0) {
      return null;
    }

    const stage = normalizeContinuityStageId(options.stageId);
    const chains = await SessionContinuityFacade.readWorkspaceChains({
      workspaceRoot: options.workspaceRoot,
      workspaceSlug: options.workspaceSlug,
    });
    const matches = chains.filter(
      (chain) =>
        chain.stage === stage &&
        chain.segments.some(
          (segment) => segment.providerSessionId === providerSessionId
        )
    );
    if (matches.length === 0) {
      return null;
    }

    for (const match of matches) {
      const dialogId = match.dialogId ?? match.rootSessionId ?? null;
      if (
        dialogId &&
        (await this.hasDialogHistoryFile({
          dialogId,
          providerId: options.providerId,
          workspaceRoot: options.workspaceRoot,
        }))
      ) {
        return dialogId;
      }
    }

    const fallback = matches[0];
    return fallback
      ? (fallback.dialogId ?? fallback.rootSessionId ?? null)
      : null;
  }

  private async hasDialogHistoryFile(options: {
    readonly dialogId: string;
    readonly providerId: string;
    readonly workspaceRoot: string;
  }): Promise<boolean> {
    const filePath = buildSessionFilePath({
      rootDirectory: SESSION_ROOT,
      workspaceSlug: sanitizeWorkspaceSlug(options.workspaceRoot),
      provider: options.providerId,
      sessionId: sanitizeWorkspaceSlug(options.dialogId),
    });

    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
