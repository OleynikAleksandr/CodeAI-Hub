import { useEffect, useState } from "react";
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

export const useProjectManagerCoreStatusHydrator = (params: {
  readonly onHydrate: (payload: HydratedState) => void;
  readonly onSessionHistory: (payload: {
    readonly sessionId: string;
    readonly messages: readonly unknown[];
  }) => void;
}) => {
  const [connection, setConnection] = useState<CoreConnectionState>({
    status: "connecting",
  });

  useEffect(() => {
    const httpUrl = api.getHttpUrl();
    if (!httpUrl) {
      setConnection({ status: "error", detail: "Core config is missing." });
      return;
    }

    const config: CoreBridgeConfig = {
      httpUrl,
      wsUrl: api.getWsStreamUrl(),
    };

    setConnection({ status: "connecting" });

    fetch(`${config.httpUrl}/api/v1/status`, { method: "GET" })
      .then(async (response) => {
        if (!response.ok) {
          setConnection({
            status: "error",
            detail: "Core status request failed.",
          });
          return null;
        }
        const data = (await response.json()) as ServerStatusResponse;
        return data;
      })
      .then((data) => {
        if (!data) {
          return;
        }
        const normalized = convertStatusResponse(data, FALLBACK_PROVIDERS);
        params.onHydrate(normalized);
        setConnection({ status: "ready" });
        loadSessionHistories(config, normalized.sessions, (payload) => {
          params.onSessionHistory(payload);
        }).catch(() => {
          // ignore
        });
      })
      .catch(() => {
        setConnection({
          status: "error",
          detail: "Unable to reach CodeAI Hub core.",
        });
      });
  }, [params.onHydrate, params.onSessionHistory]);

  return connection;
};
