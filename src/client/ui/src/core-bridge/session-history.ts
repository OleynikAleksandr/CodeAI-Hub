import type { SessionRecord } from "../../../../types/session";
import { logCoreBridgeDiagnostic } from "./core-bridge-logger";
import type { CoreBridgeConfig } from "./types";

type HistoryNotifier = (payload: {
  readonly sessionId: string;
  readonly messages: readonly unknown[];
}) => void;

const fetchSessionHistory = async (
  config: CoreBridgeConfig,
  sessionId: string,
  notify: HistoryNotifier
): Promise<void> => {
  try {
    const response = await fetch(
      `${config.httpUrl}/api/v1/sessions/${sessionId}/history`,
      { method: "GET" }
    );
    if (!response.ok) {
      logCoreBridgeDiagnostic("session-history:http-error", {
        sessionId,
        status: response.status,
      });
      return;
    }
    const data = (await response.json()) as {
      readonly sessionId?: unknown;
      readonly messages?: unknown;
    };
    const historySessionId =
      typeof data.sessionId === "string" ? data.sessionId : sessionId;
    const messages = Array.isArray(data.messages) ? data.messages : [];
    notify({
      sessionId: historySessionId,
      messages,
    });
  } catch (error) {
    logCoreBridgeDiagnostic("session-history:fetch-failed", {
      error,
      sessionId,
    });
  }
};

export const loadSessionHistories = async (
  config: CoreBridgeConfig,
  sessions: readonly SessionRecord[],
  notify: HistoryNotifier
): Promise<void> => {
  await Promise.all(
    sessions.map((session) => fetchSessionHistory(config, session.id, notify))
  );
};
