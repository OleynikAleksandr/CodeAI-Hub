import type { ProviderStackId } from "../../types/provider";

export type SessionLaunchRequest = {
  readonly providerIds: readonly ProviderStackId[];
};

export type SessionLaunchResult = {
  readonly status: "ok" | "error";
  readonly summary: string;
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

    return {
      status: "ok",
      summary: `Session requested for providers: ${uniqueProviders.join(", ")}`,
    };
  }
}
