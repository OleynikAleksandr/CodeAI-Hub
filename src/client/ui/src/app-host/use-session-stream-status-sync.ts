import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";
import type { SessionSnapshots } from "../session/helpers";
import { applySessionStreamUpdateToSnapshots } from "./session-stream-snapshot-sync";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const useSessionStreamStatusSync = (
  setSnapshots: Dispatch<SetStateAction<SessionSnapshots>>
): void => {
  useEffect(() => {
    type SessionStreamCandidate = {
      readonly type?: unknown;
      readonly payload?: unknown;
    };

    const handleIncoming = (event: MessageEvent<unknown>) => {
      const candidate = event.data as SessionStreamCandidate;
      if (candidate.type !== "session:stream" || !isRecord(candidate.payload)) {
        return;
      }
      const sessionId = candidate.payload.sessionId;
      if (typeof sessionId !== "string") {
        return;
      }
      const streamEvent =
        "event" in candidate.payload ? candidate.payload.event : undefined;
      setSnapshots((previous) =>
        applySessionStreamUpdateToSnapshots(previous, {
          sessionId,
          event: streamEvent,
        })
      );
    };

    window.addEventListener("message", handleIncoming);
    return () => {
      window.removeEventListener("message", handleIncoming);
    };
  }, [setSnapshots]);
};
