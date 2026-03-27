import type { ProviderStackId } from "../../types/provider";
import { getDefaultProviderTitle } from "../../types/provider";
import type { SessionRecord } from "../../types/session";

export interface SessionLaunchRequest {
  readonly providerIds: readonly ProviderStackId[];
}

export type SessionLaunchResult =
  | {
      readonly status: "error";
      readonly summary: string;
    }
  | {
      readonly status: "ok";
      readonly summary: string;
      readonly session: SessionRecord;
    };

/**
 * Stubbed facade for launching multi-provider sessions. In future phases this
 * will allocate tabs, orchestrate provider combos, and persist selections.
 */
export class SessionLauncher {
  private readonly workspacePathResolver: () => string;

  constructor(options?: { readonly workspacePathResolver?: () => string }) {
    this.workspacePathResolver = options?.workspacePathResolver ?? (() => "");
  }

  launch(request: SessionLaunchRequest): SessionLaunchResult {
    const uniqueProviders = [...new Set(request.providerIds)];

    if (uniqueProviders.length === 0) {
      return {
        status: "error",
        summary: "Select at least one provider to start a session.",
      };
    }

    const session = this.createSessionRecord(uniqueProviders);

    const providerSummary = uniqueProviders
      .map((providerId) => getDefaultProviderTitle(providerId))
      .join(", ");

    return {
      status: "ok",
      summary: `Session requested for providers: ${providerSummary}`,
      session,
    };
  }

  private createSessionRecord(
    providerIds: readonly ProviderStackId[]
  ): SessionRecord {
    const now = Date.now();
    const id = `session-${now}-${this.sequence}`;
    const title = `Session ${this.sequence}`;
    const workspacePath = this.workspacePathResolver();
    this.sequence += 1;

    return {
      id,
      providerIds,
      workspacePath,
      createdAt: now,
      title,
      binding: {
        providerSessionId: null,
        status: "pending",
      },
    };
  }

  private sequence = 1;
}
