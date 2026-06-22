import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  LocalizationProvider,
  useResolvedLocalization,
} from "../ui/src/app-host/use-localization";
import type { ProviderStackId } from "../../types/provider";
import { sanitizeSession } from "../ui/src/core-bridge/normalizers";
import { api } from "./api";
import { MainLayout } from "./components/layout/main-layout";
import { useProjectManagerSettings } from "./components/settings/use-project-manager-settings";
import { DetachedCaptureWorkbench } from "./components/capture-workbench/detached-capture-workbench";
import { DetachedDiagramView } from "./components/diagram-editor/detached-diagram-view";
import ProjectManagerRuntimeSessionView from "./components/sessions/project-manager-runtime-session-view";
import { usePreventFileDropNavigation } from "./hooks/use-prevent-file-drop-navigation";
import { createWorkbenchStateClient } from "./services/workbench-state-client";
import {
  fetchPendingStandaloneSessionId,
  isPendingSessionMatch,
  type PendingStandaloneSession,
} from "./standalone-session-resolver";

const STANDALONE_SESSION_READY_MESSAGE = "codeai:standalone-session-ready";

type DetachedMode =
  | {
      readonly mode: "detached-capture";
      readonly workspacePath: string;
      readonly workspaceSlug: string;
    }
  | {
      readonly mode: "detached-diagram";
      readonly workspacePath: string;
      readonly workspaceSlug: string;
    }
  | {
      readonly pending: PendingStandaloneSession;
      readonly mode: "standalone-session";
      readonly sessionId: string;
      readonly workspacePath: string;
      readonly workspaceSlug: string;
    };

const parseNumberParam = (value: string | null): number | null => {
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveDetachedMode = (): DetachedMode | null => {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  if (
    mode !== "detached-diagram" &&
    mode !== "detached-capture" &&
    mode !== "standalone-session"
  ) return null;
  const workspaceSlug = params.get("workspaceSlug");
  const workspacePath = params.get("workspacePath");
  const sessionId = params.get("sessionId");
  if (mode === "standalone-session") {
    const pending: PendingStandaloneSession = {
      createdAfter: parseNumberParam(params.get("createdAfter")),
      pending: params.get("pending") === "1",
      providerId: (params.get("providerId") as ProviderStackId | null) ?? null,
      providerSessionId: params.get("providerSessionId"),
    };
    return workspaceSlug && workspacePath && sessionId
      ? { mode, pending, sessionId, workspaceSlug, workspacePath }
      : null;
  }
  return workspaceSlug && workspacePath
    ? { mode, workspaceSlug, workspacePath }
    : null;
};

const replaceStandaloneSessionUrl = (sessionId: string, url?: string): void => {
  if (url) {
    window.history.replaceState(null, "", url);
    return;
  }
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("sessionId", sessionId);
  for (const key of ["pending", "providerId", "providerSessionId", "createdAfter"]) {
    nextUrl.searchParams.delete(key);
  }
  window.history.replaceState(null, "", nextUrl);
};

const ProjectManagerWorkbenchApp: React.FC = () => {
  const { settings, localizationRuntime } = useProjectManagerSettings();
  const localization = useResolvedLocalization(settings, localizationRuntime);

  return (
    <LocalizationProvider value={localization}>
      <div className="pm-workbench">
        <MainLayout />
      </div>
    </LocalizationProvider>
  );
};

const DetachedCaptureWorkbenchApp: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}> = ({ workspacePath, workspaceSlug }) => {
  const { settings, localizationRuntime } = useProjectManagerSettings();
  const localization = useResolvedLocalization(settings, localizationRuntime);
  const stateClient = useMemo(() => createWorkbenchStateClient(api), []);

  useEffect(() => {
    api.connect();
    return () => {
      api.disconnect({ dispose: true });
    };
  }, []);

  return (
    <LocalizationProvider value={localization}>
      <DetachedCaptureWorkbench
        captureTransport={api}
        stateClient={stateClient}
        workspacePath={workspacePath}
        workspaceSlug={workspaceSlug}
      />
    </LocalizationProvider>
  );
};

const DetachedStandaloneSessionApp: React.FC<{
  readonly pending: PendingStandaloneSession;
  readonly sessionId: string;
  readonly workspacePath: string;
}> = ({ pending, sessionId, workspacePath }) => {
  const { settings, localizationRuntime } = useProjectManagerSettings();
  const localization = useResolvedLocalization(settings, localizationRuntime);
  const [resolvedSessionId, setResolvedSessionId] = useState<string | null>(
    pending.pending ? null : sessionId
  );

  useEffect(() => {
    document.title = "CodeAI Hub Chat";
    api.connect();
    return () => {
      api.disconnect({ dispose: true });
    };
  }, []);

  useEffect(() => {
    if (!pending.pending) {
      setResolvedSessionId(sessionId);
      return;
    }
    let adopted = false;
    let pollTimer: number | null = null;
    const adoptSession = (nextSessionId: string, url?: string) => {
      if (adopted) {
        return;
      }
      adopted = true;
      setResolvedSessionId(nextSessionId);
      replaceStandaloneSessionUrl(nextSessionId, url);
    };
    const unsubscribe = api.onCoreEvent((message) => {
      if (message.type !== "session:created") {
        return;
      }
      const session = sanitizeSession(message.payload as never);
      if (session && isPendingSessionMatch({ pending, session, workspacePath })) {
        adoptSession(session.id);
      }
    });
    const handleReadyMessage = (event: MessageEvent) => {
      const data = event.data as {
        readonly sessionId?: unknown;
        readonly type?: unknown;
        readonly url?: unknown;
        readonly workspacePath?: unknown;
      };
      if (
        data?.type !== STANDALONE_SESSION_READY_MESSAGE ||
        data.workspacePath !== workspacePath ||
        typeof data.sessionId !== "string"
      ) {
        return;
      }
      adoptSession(
        data.sessionId,
        typeof data.url === "string" ? data.url : undefined
      );
    };
    const pollForSession = async () => {
      if (adopted) {
        return;
      }
      const httpUrl = api.getHttpUrl();
      if (httpUrl) {
        const nextSessionId = await fetchPendingStandaloneSessionId({
          httpUrl,
          pending,
          workspacePath,
        }).catch(() => null);
        if (nextSessionId) {
          adoptSession(nextSessionId);
          return;
        }
      }
      if (!adopted) {
        pollTimer = window.setTimeout(pollForSession, 500);
      }
    };
    window.addEventListener("message", handleReadyMessage);
    void pollForSession();
    return () => {
      adopted = true;
      if (pollTimer !== null) {
        window.clearTimeout(pollTimer);
      }
      unsubscribe();
      window.removeEventListener("message", handleReadyMessage);
    };
  }, [pending, sessionId, workspacePath]);

  return (
    <LocalizationProvider value={localization}>
      <div className="pm-workbench">
        {resolvedSessionId ? (
          <ProjectManagerRuntimeSessionView
            preferredSessionId={resolvedSessionId}
            startupStage={null}
            visibleSessionId={resolvedSessionId}
            workspacePath={workspacePath}
          />
        ) : (
          <div className="session-empty">
            <h2 className="session-empty__title">Creating chat session...</h2>
            <p className="session-empty__description">
              Waiting for Core to attach this chat window.
            </p>
          </div>
        )}
      </div>
    </LocalizationProvider>
  );
};

/**
 * Project Manager root application component
 */
export const App: React.FC = () => {
  usePreventFileDropNavigation();
  const detached = resolveDetachedMode();
  if (detached?.mode === "detached-diagram") {
    return (
      <DetachedDiagramView
        workspacePath={detached.workspacePath}
        workspaceSlug={detached.workspaceSlug}
      />
    );
  }
  if (detached?.mode === "detached-capture") {
    return (
      <DetachedCaptureWorkbenchApp
        workspacePath={detached.workspacePath}
        workspaceSlug={detached.workspaceSlug}
      />
    );
  }
  if (detached?.mode === "standalone-session") {
    return (
      <DetachedStandaloneSessionApp
        pending={detached.pending}
        sessionId={detached.sessionId}
        workspacePath={detached.workspacePath}
      />
    );
  }
  return <ProjectManagerWorkbenchApp />;
};
