import { homedir } from "node:os";
import path from "node:path";
import {
  buildSessionFilePath,
  sanitizeWorkspaceSlug,
} from "@codeai-hub/unified-session";
import { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { Session } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import { DescriptionStepStore } from "../../workflow/description";

const DESCRIPTION_DIALOG_SESSION_SUFFIX_REGEX = /__collector$/;
const SESSION_ROOT = path.join(homedir(), ".codeai-hub", "sessions");

export type DescriptionDialogResolution = {
  readonly dialogSessionId: string;
  readonly shouldBackfill: boolean;
} | null;

type SessionDescriptionDialogSyncDependencies = {
  readonly sessionStorage: UnifiedSessionStorage;
  readonly continuityRootBySessionId: Map<string, string>;
  readonly logger: Logger;
};

export class SessionDescriptionDialogSync {
  private readonly deps: SessionDescriptionDialogSyncDependencies;
  private readonly descriptionStepStore = new DescriptionStepStore();

  constructor(deps: SessionDescriptionDialogSyncDependencies) {
    this.deps = deps;
  }

  resolveDescriptionDialog(options: {
    readonly session: Session;
    readonly providerSessionId: string;
  }): Promise<DescriptionDialogResolution> {
    if (
      !(
        options.session.stage === "description" &&
        options.session.initiativeSlug
      )
    ) {
      return Promise.resolve(null);
    }
    return this.resolveDescriptionDialogSessionId(options);
  }

  maybePromoteLegacyDescriptionDialogHistory(options: {
    readonly session: Session;
    readonly dialogSessionId?: string | null;
  }): void {
    const session = options.session;
    const dialogSessionId = options.dialogSessionId;
    if (session.stage !== "description" || !dialogSessionId) {
      return;
    }
    if (!DESCRIPTION_DIALOG_SESSION_SUFFIX_REGEX.test(dialogSessionId)) {
      return;
    }
    const legacyDialogSessionId = dialogSessionId.replace(
      DESCRIPTION_DIALOG_SESSION_SUFFIX_REGEX,
      ""
    );
    if (
      legacyDialogSessionId.length === 0 ||
      legacyDialogSessionId === dialogSessionId
    ) {
      return;
    }

    this.deps.sessionStorage.promoteHistoryFile({
      workspaceSlug: sanitizeWorkspaceSlug(session.workspacePath),
      providerId: session.providerId,
      fromHistorySessionId: legacyDialogSessionId,
      toHistorySessionId: dialogSessionId,
    });
  }

  async maybeBackfillDescriptionDialogHistory(options: {
    readonly session: Session;
    readonly providerSessionId: string;
    readonly dialog: DescriptionDialogResolution;
  }): Promise<void> {
    if (!options.dialog?.shouldBackfill) {
      return;
    }
    await this.backfillDescriptionDialogHistory({
      session: options.session,
      dialogSessionId: options.dialog.dialogSessionId,
      providerSessionId: options.providerSessionId,
    });
  }

  async updateDescriptionSessionRef(
    session: Session,
    providerSessionId?: string
  ): Promise<void> {
    if (session.stage !== "description" || !session.initiativeSlug) {
      return;
    }
    const resolvedProviderSessionId =
      providerSessionId ?? session.providerSessionId;
    if (!resolvedProviderSessionId) {
      return;
    }

    const continuityRootSessionId =
      this.deps.continuityRootBySessionId.get(session.id) ?? session.id;
    const jsonlPath = buildSessionFilePath({
      rootDirectory: SESSION_ROOT,
      workspaceSlug: sanitizeWorkspaceSlug(session.workspacePath),
      provider: session.providerId,
      sessionId: sanitizeWorkspaceSlug(continuityRootSessionId),
    });

    try {
      await this.descriptionStepStore.upsert(
        session.workspacePath,
        session.initiativeSlug,
        {
          primarySession: {
            providerId: session.providerId,
            providerSessionId: resolvedProviderSessionId,
            jsonlPath,
            dialogSessionId: continuityRootSessionId,
          },
        }
      );
    } catch (error: unknown) {
      this.deps.logger.warn("Failed to persist description session ref", {
        sessionId: session.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async resolveDescriptionDialogSessionId(options: {
    readonly session: Session;
    readonly providerSessionId: string;
  }): Promise<Exclude<DescriptionDialogResolution, null>> {
    const { session } = options;
    if (session.stage !== "description" || !session.initiativeSlug) {
      return {
        dialogSessionId: options.providerSessionId,
        shouldBackfill: false,
      };
    }

    const snapshot = await this.descriptionStepStore.read(
      session.workspacePath,
      session.initiativeSlug
    );
    const slot = snapshot?.primarySession;
    const existingDialogSessionId = slot?.dialogSessionId ?? null;
    if (existingDialogSessionId) {
      return {
        dialogSessionId: existingDialogSessionId,
        shouldBackfill: false,
      };
    }

    return {
      dialogSessionId: `${slot?.providerSessionId ?? options.providerSessionId}__collector`,
      shouldBackfill: false,
    };
  }

  private async backfillDescriptionDialogHistory(options: {
    readonly session: Session;
    readonly dialogSessionId: string;
    readonly providerSessionId: string;
  }): Promise<void> {
    const session = options.session;
    if (session.stage !== "description" || !session.initiativeSlug) {
      return;
    }

    const chains = await SessionContinuityFacade.readWorkspaceChains({
      workspaceRoot: session.workspacePath,
      workspaceSlug: session.initiativeSlug,
    });
    const sourceIds = new Set<string>([
      options.dialogSessionId,
      options.providerSessionId,
    ]);
    for (const chain of chains) {
      if (chain.stage !== "description") {
        continue;
      }
      for (const segment of chain.segments) {
        if (segment.providerId === session.providerId) {
          sourceIds.add(segment.providerSessionId);
        }
      }
    }

    if (sourceIds.size <= 1) {
      return;
    }

    await this.deps.sessionStorage
      .backfillHistory({
        workspaceSlug: sanitizeWorkspaceSlug(session.workspacePath),
        providerId: session.providerId,
        historySessionId: options.dialogSessionId,
        sourceSessionIds: Array.from(sourceIds),
      })
      .catch((error: unknown) => {
        this.deps.logger.warn(
          "Failed to backfill description unified-session file",
          {
            sessionId: session.id,
            providerId: session.providerId,
            dialogSessionId: options.dialogSessionId,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      });
  }
}
