import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import type { WorkspaceProject } from "../../types";
import { DescriptionQuestionnairePanel } from "../description/description-questionnaire-panel";
import { PanelContainer } from "./panel-container";
import { StatusBar } from "./status-bar";
import { Toolbar } from "./toolbar";

interface MainAreaProps {
  sizes: [number, number];
  onSizeChange: (index: 0, delta: number, containerWidth: number) => void;
  activeWorkspace?: WorkspaceProject;
}

type SessionMessage = {
  readonly id: string;
  readonly role: "system" | "assistant" | "user" | "thinking";
  readonly content: string;
  readonly timestamp?: string;
};

type IncomingMessage = {
  readonly type: string;
  readonly payload?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeSessionMessage = (payload: unknown): SessionMessage | null => {
  if (!isRecord(payload)) {
    return null;
  }
  const id = typeof payload.id === "string" ? payload.id : null;
  const content = typeof payload.content === "string" ? payload.content : null;
  const role = payload.role;
  if (
    !id ||
    !content ||
    !(
      role === "system" ||
      role === "assistant" ||
      role === "user" ||
      role === "thinking"
    )
  ) {
    return null;
  }
  const timestamp =
    typeof payload.timestamp === "string" ? payload.timestamp : undefined;
  return { id, role, content, timestamp };
};

const normalizeSessionId = (payload: unknown): string | null => {
  if (!isRecord(payload)) {
    return null;
  }
  return typeof payload.sessionId === "string" ? payload.sessionId : null;
};

const normalizeSessionErrorMessage = (payload: unknown): string | null => {
  if (!isRecord(payload)) {
    return null;
  }
  return typeof payload.message === "string" ? payload.message : null;
};

const ProjectManagerSessionPanel = ({
  activeSessionId,
}: {
  readonly activeSessionId: string | null;
}) => {
  const [messagesBySession, setMessagesBySession] = useState<
    Record<string, readonly SessionMessage[]>
  >({});
  const [errorsBySession, setErrorsBySession] = useState<
    Record<string, string | undefined>
  >({});
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const unsubscribe = api.onCoreEvent((message: IncomingMessage) => {
      if (message.type === "session:message") {
        const sessionId = normalizeSessionId(message.payload);
        const normalized = normalizeSessionMessage(message.payload);
        if (!(sessionId && normalized)) {
          return;
        }
        setMessagesBySession((current) => {
          const existing = current[sessionId] ?? [];
          return {
            ...current,
            [sessionId]: [...existing, normalized],
          };
        });
        return;
      }

      if (message.type === "session:error") {
        const sessionId = normalizeSessionId(message.payload);
        const errorMessage = normalizeSessionErrorMessage(message.payload);
        if (!(sessionId && errorMessage)) {
          return;
        }
        setErrorsBySession((current) => ({
          ...current,
          [sessionId]: errorMessage,
        }));
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const activeMessages = useMemo(() => {
    if (!activeSessionId) {
      return [];
    }
    return messagesBySession[activeSessionId] ?? [];
  }, [activeSessionId, messagesBySession]);

  const activeError = useMemo(() => {
    if (!activeSessionId) {
      return undefined;
    }
    return errorsBySession[activeSessionId];
  }, [activeSessionId, errorsBySession]);

  const handleSend = useCallback(() => {
    if (!activeSessionId) {
      return;
    }
    const content = draft.trim();
    if (!content) {
      return;
    }
    api.sendSessionMessage(activeSessionId, content);
    setDraft("");
  }, [activeSessionId, draft]);

  if (!activeSessionId) {
    return (
      <div className="pm-placeholder">
        Запустите Idea Collector через отправку анкеты, чтобы открыть сессию.
      </div>
    );
  }

  return (
    <div className="pm-session-panel">
      <div className="pm-session-panel__meta">
        <div className="pm-session-panel__title">Idea Collector session</div>
        <div className="pm-session-panel__subtitle">{activeSessionId}</div>
      </div>
      {activeError ? (
        <div className="pm-questionnaire-alert">{activeError}</div>
      ) : null}
      <div className="pm-session-panel__messages">
        {activeMessages.length === 0 ? (
          <div className="pm-placeholder">Ожидаем сообщения...</div>
        ) : (
          activeMessages.map((message) => (
            <div
              className={`pm-session-panel__message pm-session-panel__message--${message.role}`}
              key={message.id}
            >
              <div className="pm-session-panel__message-role">{message.role}</div>
              <div className="pm-session-panel__message-content">
                {message.content}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="pm-session-panel__composer">
        <textarea
          className="pm-session-panel__input"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Сообщение…"
          rows={3}
          value={draft}
        />
        <button
          className="pm-session-panel__send"
          onClick={handleSend}
          type="button"
        >
          Отправить
        </button>
      </div>
    </div>
  );
};

/**
 * Main area component (Section 2)
 * Contains Toolbar (Section 3), PanelContainer (Sections 4, 5, 6), and StatusBar (Section 7)
 */
export const MainArea: React.FC<MainAreaProps> = ({
  sizes,
  onSizeChange,
  activeWorkspace,
}) => {
  const tools: readonly string[] = activeWorkspace ? ["Description"] : [];
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspace) {
      setActiveTool(null);
      setActiveSessionId(null);
      return;
    }
    setActiveTool((current) => current ?? "Description");
  }, [activeWorkspace?.id]);

  const showDescriptionQuestionnaire = activeTool === "Description";

  return (
    <main className="pm-main-area">
      <Toolbar
        activeTool={activeTool ?? undefined}
        onToolSelect={setActiveTool}
        tools={tools}
      />
      <PanelContainer
        artifactContent={
          showDescriptionQuestionnaire ? (
            <DescriptionQuestionnairePanel
              onClose={() => setActiveTool(null)}
              onIdeaSessionCreated={setActiveSessionId}
              workspaceName={activeWorkspace?.name}
              workspacePath={activeWorkspace?.path}
            />
          ) : (
            <div className="pm-placeholder">Artifacts will appear here.</div>
          )
        }
        onSizeChange={onSizeChange}
        sessionContent={<ProjectManagerSessionPanel activeSessionId={activeSessionId} />}
        sizes={sizes}
      />
      <StatusBar
        workspaceName={activeWorkspace?.name}
      />
    </main>
  );
};
