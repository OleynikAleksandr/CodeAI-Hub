import type { ProviderStackId } from "../../types/provider";
import type { SessionRecord } from "../../types/session";

export type SessionLaunchRequest = {
  readonly providerIds: readonly ProviderStackId[];
};

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
  launch(request: SessionLaunchRequest): SessionLaunchResult {
    const uniqueProviders = [...new Set(request.providerIds)];

    if (uniqueProviders.length === 0) {
      return {
        status: "error",
        summary: "Select at least one provider to start a session.",
      };
    }

    const session = this.createSessionRecord(uniqueProviders);

    return {
      status: "ok",
      summary: `Session requested for providers: ${uniqueProviders.join(", ")}`,
      session,
    };
  }

  private createSessionRecord(
    providerIds: readonly ProviderStackId[]
  ): SessionRecord {
    const id = `session-${Date.now()}-${this.sequence}`;
    const title = `Session ${this.sequence}`;
    this.sequence += 1;

    return {
      id,
      providerIds,
      createdAt: Date.now(),
      title,
    };
  }

  private sequence = 1;
}
