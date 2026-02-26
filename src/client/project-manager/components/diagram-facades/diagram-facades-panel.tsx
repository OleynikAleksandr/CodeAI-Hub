import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import MarkdownContent from "../../../ui/src/session/markdown-content";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { resolvePreferredWorkflowProviderId } from "../../services/workflow-provider-resolver";

type LoadStatus = "loading" | "missing" | "ready" | "error";

const FACADES_GRAPH_TITLE_RE = /^%%\s+Facades Graph/m;
const FACADES_GRAPH_NODE_RE = /\w+\s*-->?\s*\w+/g;

const validateFacadesGraphMermaid = (content: string): string | null => {
  if (content.trim().length === 0) {
    return "Файл пустой.";
  }
  if (!FACADES_GRAPH_TITLE_RE.test(content)) {
    return "Нет заголовка `%% Facades Graph`.";
  }
  const edgeMatches = content.match(FACADES_GRAPH_NODE_RE);
  const edgeCount = edgeMatches?.length ?? 0;
  if (edgeCount < 1) {
    return "Нужна минимум 1 связь между узлами.";
  }
  return null;
};

export const DiagramFacadesPanel: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}> = (props) => {
  const artifactPath = useMemo(
    () => `.codeai-hub/${props.workspaceSlug}/diagram_facades/facades-graph.mmd`,
    [props.workspaceSlug]
  );
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollTick, setPollTick] = useState(0);
  const [fixInFlight, setFixInFlight] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);
  const startServiceRef = useRef(new WorkflowStepStartService());

  const validationError = useMemo(
    () => (content ? validateFacadesGraphMermaid(content) : null),
    [content]
  );

  useEffect(() => {
    if (status !== "missing") {
      return;
    }
    const timer = window.setTimeout(() => {
      setPollTick((current) => current + 1);
    }, 5_000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setContent(null);
    setError(null);
    const httpUrl = api.getHttpUrl();
    if (!httpUrl) {
      setStatus("error");
      setError("Не удалось загрузить Diagram Facades: Core HTTP недоступен.");
      return () => {
        cancelled = true;
      };
    }

    const query = new URLSearchParams({
      workspacePath: props.workspacePath,
      workspaceSlug: props.workspaceSlug,
      path: artifactPath,
      maxBytes: "300000",
    });

    fetch(`${httpUrl}/api/v1/orchestrator/workflow-artifact?${query.toString()}`, {
      method: "GET",
    })
      .then(async (response) => {
        if (cancelled) {
          return;
        }
        if (response.status === 404) {
          setStatus("missing");
          return;
        }
        if (!response.ok) {
          setStatus("error");
          setError("Не удалось загрузить Diagram Facades (endpoint недоступен).");
          return;
        }
        const payload = (await response.json()) as unknown;
        if (!payload || typeof payload !== "object") {
          setStatus("error");
          setError("Не удалось загрузить Diagram Facades: неверный ответ сервера.");
          return;
        }
        const record = payload as Record<string, unknown>;
        const nextContent =
          typeof record.content === "string" ? record.content : null;
        if (nextContent === null) {
          setStatus("error");
          setError("Не удалось загрузить Diagram Facades: контент отсутствует.");
          return;
        }
        setContent(nextContent);
        setStatus("ready");
      })
      .catch((readError: unknown) => {
        if (cancelled) {
          return;
        }
        setStatus("error");
        setError(readError instanceof Error ? readError.message : String(readError));
      });

    return () => {
      cancelled = true;
    };
  }, [artifactPath, pollTick, props.workspacePath, props.workspaceSlug]);

  if (status === "ready" && content !== null && validationError) {
    const providers = api.getIdeaCollectorProviders();
    const hasProviders = providers.length > 0;
    return (
      <div className="pm-details">
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <strong title={artifactPath}>facades-graph.mmd</strong>
        </div>
        <div className="pm-placeholder" style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 10 }}>
            <strong>ERROR:</strong> {validationError}
          </div>
          <button
            className="pm-provider-picker__button pm-provider-picker__button--primary"
            disabled={fixInFlight || !hasProviders}
            onClick={() => {
              if (!hasProviders || fixInFlight) {
                return;
              }
              setFixInFlight(true);
              setFixError(null);
              void (async () => {
                const workflowState = await api.getWorkflowState(
                  props.workspaceSlug,
                  props.workspacePath
                );
                const providerId =
                  resolvePreferredWorkflowProviderId({
                    workflowState,
                    providers,
                  }) ?? providers.at(0)?.id;

                if (!providerId) {
                  throw new Error("Нет доступного провайдера для агента.");
                }

                await startServiceRef.current.startDiagramFacades({
                  workspacePath: props.workspacePath,
                  workspaceSlug: props.workspaceSlug,
                  providerId,
                });
              })()
                .catch((startError: unknown) => {
                  setFixError(
                    startError instanceof Error ? startError.message : String(startError)
                  );
                })
                .finally(() => {
                  setFixInFlight(false);
                });
            }}
            type="button"
          >
            {fixInFlight ? "Открываю сессию…" : "Исправить с агентом"}
          </button>
          {fixError ? <div style={{ marginTop: 10 }}>{fixError}</div> : null}
          {!hasProviders ? (
            <div style={{ marginTop: 10 }}>Нет доступного провайдера для агента.</div>
          ) : null}
        </div>
        <MarkdownContent className="pm-artifact-markdown" content={content} />
      </div>
    );
  }

  if (status === "ready" && content !== null) {
    return (
      <div className="pm-details">
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <strong title={artifactPath}>facades-graph.mmd</strong>
        </div>
        <MarkdownContent className="pm-artifact-markdown" content={content} />
      </div>
    );
  }

  if (status === "error") {
    return <div className="pm-placeholder">{error ?? "Не удалось загрузить Diagram Facades."}</div>;
  }

  return (
    <div className="pm-details">
      <div style={{ marginBottom: 12 }}>
        <strong>Diagram Facades</strong>
      </div>
      <div className="pm-placeholder" style={{ marginBottom: 12 }}>
        Ожидаем артефакт: <code>{artifactPath}</code>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          Здесь отображается Mermaid-граф фасадов: точки входа каждого модуля, их публичные интерфейсы и связи между фасадами.
        </div>
        <div>
          Вы можете править <code>facades-graph.mmd</code> вручную в редакторе или через агента (он проанализирует диаграмму модулей и построит граф фасадов).
        </div>
        <div>Любые изменения пометят следующие шаги как требующие синхронизации.</div>
      </div>
    </div>
  );
};
