import type { SessionRecord } from "../../../../types/session";
import { loadSessionHistories } from "./session-history";
import type { CoreBridgeConfig } from "./types";

type HistoryNotifier = (message: Record<string, unknown>) => void;

export type HistoryHydrator = {
  readonly hydrate: (
    config: CoreBridgeConfig,
    sessions: readonly SessionRecord[],
    options?: { readonly force?: boolean }
  ) => void;
  readonly markStale: () => void;
  readonly reset: () => void;
};

export const createHistoryHydrator = (
  notify: HistoryNotifier
): HistoryHydrator => {
  let shouldHydrateHistory = true;

  const hydrate = (
    config: CoreBridgeConfig,
    sessions: readonly SessionRecord[],
    options: { readonly force?: boolean } = {}
  ): void => {
    const force = Boolean(options.force);
    if (!(force || shouldHydrateHistory)) {
      return;
    }
    if (sessions.length === 0) {
      if (!force) {
        shouldHydrateHistory = false;
      }
      return;
    }
    loadSessionHistories(config, sessions, (payload) => {
      notify({ type: "session:history", payload });
    })
      .catch(() => {
        /* Ignore history hydration failures; live stream will populate messages. */
      })
      .finally(() => {
        if (!force) {
          shouldHydrateHistory = false;
        }
      });
  };

  return {
    hydrate,
    markStale: () => {
      shouldHydrateHistory = true;
    },
    reset: () => {
      shouldHydrateHistory = false;
    },
  };
};
