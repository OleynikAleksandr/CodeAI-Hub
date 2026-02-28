import { useEffect, useRef, type MutableRefObject } from "react";
import type { SessionRecord } from "../../../../types/session";
import { api } from "../../api";
import { workspaceSnapshotStore } from "../../services/workspace-snapshot-store";

type SessionResumeIntent = {
  readonly providerId: string;
  readonly providerSessionId: string | null;
  readonly workspacePath: string;
  readonly workspaceSlug?: string;
  readonly initiativeSlug: string | null;
  readonly stage: string | null;
  readonly sessionKind: "collector" | null;
  readonly runSlug: string | null;
};

const IN_FLIGHT_TTL_MS = 30_000;

const buildInFlightKey = (detail: SessionResumeIntent): string =>
  [
    detail.workspacePath,
    detail.providerId,
    detail.providerSessionId ?? "null",
    detail.initiativeSlug ?? "null",
    detail.stage ?? "null",
    detail.runSlug ?? "null",
  ].join("|");

type SessionResumeCreatePayload = {
  readonly providerId: string;
  readonly providerSessionId: string | null;
  readonly workspacePath: string;
  readonly initiativeSlug: string | null;
  readonly stage: string | null;
  readonly sessionKind: "collector" | null;
  readonly runSlug: string | null;
};

const createRequestId = (): string => {
  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `workspace-select-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const requestWorkspaceSelection = (detail: SessionResumeIntent): void => {
  // Best-effort: session resume should not become a “dead click” if ACK is late
  // or lost. Core-side workspace scope is still selected via this message.
  if (workspaceSnapshotStore.getState().activeWorkspaceRoot === detail.workspacePath) {
    return;
  }
  api.selectWorkspace({
    requestId: createRequestId(),
    workspaceRoot: detail.workspacePath,
    reason: "workspace_selected",
  });
};


export const useSessionResumeIntent = (params: {
  readonly sessionsRef: MutableRefObject<readonly SessionRecord[]>;
  readonly focusSession: (sessionId: string) => void;
  readonly createSession: (payload: SessionResumeCreatePayload) => void;
}) => {
  const inFlight = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<SessionResumeIntent>;
      const detail = custom.detail;
      if (
        !detail ||
        typeof detail.providerId !== "string" ||
        typeof detail.workspacePath !== "string" ||
        detail.providerSessionId === null
      ) {
        return;
      }

      const now = Date.now();
      for (const [key, startedAt] of inFlight.current) {
        if (now - startedAt > IN_FLIGHT_TTL_MS) {
          inFlight.current.delete(key);
        }
      }

      const inFlightKey = buildInFlightKey(detail);
      if (inFlight.current.has(inFlightKey)) {
        return;
      }
      inFlight.current.set(inFlightKey, now);

      requestWorkspaceSelection(detail);

      const existing = params.sessionsRef.current.find(
        (session) =>
          session.workspacePath === detail.workspacePath &&
          session.providerIds.some((providerId) => providerId === detail.providerId) &&
          session.binding.providerSessionId === detail.providerSessionId
      );
      if (existing) {
        inFlight.current.delete(inFlightKey);
        params.focusSession(existing.id);
        return;
      }

      params.createSession({
        providerId: detail.providerId,
        providerSessionId: detail.providerSessionId,
        workspacePath: detail.workspacePath,
        initiativeSlug: detail.initiativeSlug,
        stage: detail.stage,
        sessionKind: detail.sessionKind,
        runSlug: detail.runSlug,
      });
    };

    window.addEventListener("pm:session:resume", handler);
    return () => {
      window.removeEventListener("pm:session:resume", handler);
    };
  }, [params]);
};
