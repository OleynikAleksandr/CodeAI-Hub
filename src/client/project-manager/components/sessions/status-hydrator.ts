import { useCallback, useEffect, useRef, useState } from "react";
import type { ProviderStackDescriptor } from "../../../../types/provider";
import type { SessionRecord } from "../../../../types/session";
import { api } from "../../api";
import { FALLBACK_PROVIDERS } from "../../../ui/src/core-bridge/constants";
import { convertStatusResponse } from "../../../ui/src/core-bridge/normalizers";
import { loadSessionHistories } from "../../../ui/src/core-bridge/session-history";
import type { CoreBridgeConfig, ServerStatusResponse } from "../../../ui/src/core-bridge/types";

type CoreConnectionStatus = "connecting" | "ready" | "error";

type CoreConnectionState = {
  readonly status: CoreConnectionStatus;
  readonly detail?: string;
};

type HydratedState = {
  readonly providers: readonly ProviderStackDescriptor[];
  readonly sessions: readonly SessionRecord[];
};

type HydrateOptions = {
  readonly force?: boolean;
};

const HYDRATE_THROTTLE_MS = 750;
const WORKFLOW_CLEAR_EVENT = "pm:workflow-step:cleared";

export const resolveProjectManagerCoreConfig = (): CoreBridgeConfig | null => {
  const httpUrl = api.getHttpUrl();
  if (!httpUrl) {
    return null;
  }
  return {
    httpUrl,
    wsUrl: api.getWsStreamUrl(),
  };
};

export const useProjectManagerCoreStatusHydrator = (params: {
  readonly onHydrate: (payload: HydratedState) => void;
  readonly onSessionHistory: (payload: {
    readonly sessionId: string;
    readonly messages: readonly unknown[];
  }) => void;
  readonly rehydrateOnCoreState?: boolean;
}) => {
  const [connection, setConnection] = useState<CoreConnectionState>({
    status: "connecting",
  });
  const hasSuccessfulHydrationRef = useRef(false);
  const lastHydrateAtRef = useRef(0);
  const hydrateInFlightRef = useRef<Promise<void> | null>(null);
  const queuedHydrateConfigRef = useRef<CoreBridgeConfig | null>(null);

  const hydrateFromStatus = useCallback(
    (config: CoreBridgeConfig, options: HydrateOptions = {}) => {
      const now = Date.now();
      if (
        !options.force &&
        now - lastHydrateAtRef.current < HYDRATE_THROTTLE_MS
      ) {
        return;
      }
      if (hydrateInFlightRef.current) {
        if (options.force) {
          queuedHydrateConfigRef.current = config;
        }
        return;
      }
      lastHydrateAtRef.current = now;

      hydrateInFlightRef.current = (async () => {
        try {
          const response = await fetch(`${config.httpUrl}/api/v1/status`, {
            method: "GET",
          });
          if (!response.ok) {
            if (hasSuccessfulHydrationRef.current) {
              setConnection({
                status: "error",
                detail: "Core status request failed.",
              });
            } else {
              setConnection({
                status: "connecting",
                detail: "Waiting for CodeAI Hub core to respond…",
              });
            }
            return;
          }

          const data = (await response.json()) as ServerStatusResponse;
          const normalized = convertStatusResponse(data, FALLBACK_PROVIDERS);
          hasSuccessfulHydrationRef.current = true;

          params.onHydrate(normalized);
          setConnection({ status: "ready" });

          await loadSessionHistories(config, normalized.sessions, (payload) => {
            params.onSessionHistory(payload);
          });
        } catch {
          if (hasSuccessfulHydrationRef.current) {
            setConnection({
              status: "error",
              detail: "Unable to reach CodeAI Hub core.",
            });
          } else {
            setConnection({
              status: "connecting",
              detail: "Waiting for CodeAI Hub core to respond…",
            });
          }
        }
      })().finally(() => {
        hydrateInFlightRef.current = null;
        const queuedConfig = queuedHydrateConfigRef.current;
        queuedHydrateConfigRef.current = null;
        if (queuedConfig) {
          lastHydrateAtRef.current = 0;
          hydrateFromStatus(queuedConfig, { force: true });
        }
      });
    },
    [params.onHydrate, params.onSessionHistory]
  );

  useEffect(() => {
    const config = resolveProjectManagerCoreConfig();
    if (!config) {
      setConnection({ status: "error", detail: "Core config is missing." });
      return;
    }

    // Initial best-effort hydration.
    hydrateFromStatus(config);

    // Critical: when Core restarts while PM stays open, WS reconnects and Core
    // re-sends `core:state`. Use it as a signal to re-hydrate sessions and
    // reload histories, otherwise the PM session list becomes stale and clicks
    // can open “dead” sessions with empty history.
    const unsubscribe = api.onCoreEvent((message) => {
      if (
        message.type !== "core:state" ||
        params.rehydrateOnCoreState === false
      ) {
        return;
      }
      hydrateFromStatus(config);
    });
    const handleWorkflowStepCleared = () => {
      hydrateFromStatus(config, { force: true });
    };
    window.addEventListener(WORKFLOW_CLEAR_EVENT, handleWorkflowStepCleared);

    return () => {
      window.removeEventListener(
        WORKFLOW_CLEAR_EVENT,
        handleWorkflowStepCleared
      );
      unsubscribe();
    };
  }, [hydrateFromStatus, params.rehydrateOnCoreState]);

  return connection;
};
