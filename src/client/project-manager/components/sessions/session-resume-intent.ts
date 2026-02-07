import { useEffect, useRef, type MutableRefObject } from "react";
import type { SessionRecord } from "../../../../types/session";
import { syncWorkspaceScopeWithAck } from "../../services/workspace-scope-handshake";

type SessionResumeIntent = {
  readonly providerId: string;
  readonly providerSessionId: string | null;
  readonly workspacePath: string;
  readonly workspaceSlug?: string;
  readonly initiativeSlug: string | null;
  readonly stage: string | null;
  readonly sessionKind: "collector" | "reviewer" | null;
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
  readonly sessionKind: "collector" | "reviewer" | null;
  readonly runSlug: string | null;
};

const ensureWorkspaceScopeBeforeResume = async (
  detail: SessionResumeIntent
): Promise<boolean> => {
  const ack = await syncWorkspaceScopeWithAck({
    workspacePath: detail.workspacePath,
    workspaceSlug: detail.workspaceSlug ?? detail.initiativeSlug,
    reason: "workspace_selected",
  });
  return (
    Boolean(ack) &&
    ack?.status === "applied" &&
    ack.workspacePath === detail.workspacePath
  );
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

      void ensureWorkspaceScopeBeforeResume(detail).then((scopeReady) => {
        if (!scopeReady) {
          inFlight.current.delete(inFlightKey);
          return;
        }

        const existing = params.sessionsRef.current.find(
          (session) =>
            session.workspacePath === detail.workspacePath &&
            session.providerIds.some(
              (providerId) => providerId === detail.providerId
            ) &&
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
      });
    };

    window.addEventListener("pm:session:resume", handler);
    return () => {
      window.removeEventListener("pm:session:resume", handler);
    };
  }, [params]);
};
