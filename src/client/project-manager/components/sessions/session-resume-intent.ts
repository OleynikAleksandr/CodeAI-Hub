import { useEffect, type MutableRefObject } from "react";
import type { SessionRecord } from "../../../../types/session";

type SessionResumeIntent = {
  readonly providerId: string;
  readonly providerSessionId: string | null;
  readonly workspacePath: string;
  readonly initiativeSlug: string | null;
  readonly stage: string | null;
  readonly runSlug: string | null;
};

type SessionResumeCreatePayload = {
  readonly providerId: string;
  readonly providerSessionId: string | null;
  readonly workspacePath: string;
  readonly initiativeSlug: string | null;
  readonly stage: string | null;
  readonly runSlug: string | null;
};

export const useSessionResumeIntent = (params: {
  readonly sessionsRef: MutableRefObject<readonly SessionRecord[]>;
  readonly focusSession: (sessionId: string) => void;
  readonly createSession: (payload: SessionResumeCreatePayload) => void;
}) => {
  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<SessionResumeIntent>;
      const detail = custom.detail;
      if (
        !detail ||
        typeof detail.providerId !== "string" ||
        typeof detail.workspacePath !== "string"
      ) {
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
        params.focusSession(existing.id);
        return;
      }
      params.createSession({
        providerId: detail.providerId,
        providerSessionId: detail.providerSessionId,
        workspacePath: detail.workspacePath,
        initiativeSlug: detail.initiativeSlug,
        stage: detail.stage,
        runSlug: detail.runSlug,
      });
    };
    window.addEventListener("pm:session:resume", handler);
    return () => {
      window.removeEventListener("pm:session:resume", handler);
    };
  }, [params]);
};
