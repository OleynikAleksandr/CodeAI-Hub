import { useEffect, useState } from "react";
import { api } from "../../api";

export type StageArtifactLoadStatus = "loading" | "missing" | "ready" | "error";

export type StageArtifactLoaderResult = {
  readonly status: StageArtifactLoadStatus;
  readonly content: string | null;
  readonly error: string | null;
};

/**
 * Shared hook that fetches a workflow-stage artifact and polls when missing.
 * Used by Virtual Simulation and Diagram Modules panels.
 */
export const useStageArtifactLoader = (params: {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly artifactPath: string;
  readonly stageLabel: string;
}): StageArtifactLoaderResult => {
  const [status, setStatus] = useState<StageArtifactLoadStatus>("loading");
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollTick, setPollTick] = useState(0);

  // Poll while artifact is missing.
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

  // Fetch artifact content.
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setContent(null);
    setError(null);
    const httpUrl = api.getHttpUrl();
    if (!httpUrl) {
      setStatus("error");
      setError(`Не удалось загрузить ${params.stageLabel}: Core HTTP недоступен.`);
      return () => {
        cancelled = true;
      };
    }

    const query = new URLSearchParams({
      workspacePath: params.workspacePath,
      workspaceSlug: params.workspaceSlug,
      path: params.artifactPath,
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
          setError(`Не удалось загрузить ${params.stageLabel} (endpoint недоступен).`);
          return;
        }
        const payload = (await response.json()) as unknown;
        if (!payload || typeof payload !== "object") {
          setStatus("error");
          setError(`Не удалось загрузить ${params.stageLabel}: неверный ответ сервера.`);
          return;
        }
        const record = payload as Record<string, unknown>;
        const nextContent =
          typeof record.content === "string" ? record.content : null;
        if (nextContent === null) {
          setStatus("error");
          setError(`Не удалось загрузить ${params.stageLabel}: контент отсутствует.`);
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
  }, [params.artifactPath, params.stageLabel, params.workspacePath, params.workspaceSlug, pollTick]);

  return { status, content, error };
};
