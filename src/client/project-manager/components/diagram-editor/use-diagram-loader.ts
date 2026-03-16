import { useEffect, useState } from "react";
import { parseFacadeMapDsl, parseModuleMapDsl } from "../../../../../packages/core/src/workflow/diagram-dsl/markdown-dsl-parser";
import { api } from "../../api";
import { domainModelToReactFlow } from "./adapters/domain-model-to-react-flow";
import type { DiagramFlowProjection } from "./adapters/domain-model-to-react-flow.types";
import {
  applyFlowSidecarPositions,
  parseFlowSidecar,
  type FlowSidecarDocument,
} from "./flow-sidecar-types";

export type DiagramLoaderStatus = "loading" | "missing" | "ready" | "error";
export type DiagramEditorStage = "diagram_modules" | "diagram_facades";

type DiagramPaths = {
  readonly artifactPath: string;
  readonly flowSidecarPath: string;
  readonly label: string;
};

const resolveDiagramPaths = (
  workspaceSlug: string,
  stage: DiagramEditorStage
): DiagramPaths =>
  stage === "diagram_modules"
    ? {
        artifactPath: `.codeai-hub/${workspaceSlug}/diagram_modules/module-map.md`,
        flowSidecarPath: `.codeai-hub/${workspaceSlug}/diagram_modules/module-map.flow.json`,
        label: "Diagram Modules",
      }
    : {
        artifactPath: `.codeai-hub/${workspaceSlug}/diagram_facades/facade-map.md`,
        flowSidecarPath: `.codeai-hub/${workspaceSlug}/diagram_facades/facade-map.flow.json`,
        label: "Diagram Facades",
      };

const readWorkflowArtifact = async (params: {
  readonly httpUrl: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly path: string;
}): Promise<
  | { readonly status: "ok"; readonly content: string }
  | { readonly status: "missing" }
  | { readonly status: "error"; readonly error: string }
> => {
  const query = new URLSearchParams({
    workspacePath: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
    path: params.path,
    maxBytes: "300000",
  });

  try {
    const response = await fetch(
      `${params.httpUrl}/api/v1/orchestrator/workflow-artifact?${query.toString()}`,
      { method: "GET" }
    );
    if (response.status === 404) {
      return { status: "missing" };
    }
    if (!response.ok) {
      return { status: "error", error: "Endpoint недоступен." };
    }
    const payload = (await response.json()) as unknown;
    if (!payload || typeof payload !== "object") {
      return { status: "error", error: "Неверный ответ Core." };
    }
    const content =
      typeof (payload as Record<string, unknown>).content === "string"
        ? ((payload as Record<string, unknown>).content as string)
        : null;
    if (content === null) {
      return { status: "error", error: "Контент отсутствует." };
    }
    return { status: "ok", content };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export type DiagramLoaderResult = {
  readonly status: DiagramLoaderStatus;
  readonly content: string | null;
  readonly error: string | null;
  readonly projection: DiagramFlowProjection | null;
  readonly flowDocument: FlowSidecarDocument | null;
  readonly artifactPath: string;
  readonly flowSidecarPath: string;
};

export const useDiagramLoader = (params: {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly stage: DiagramEditorStage;
  readonly refreshKey?: number;
}): DiagramLoaderResult => {
  const [status, setStatus] = useState<DiagramLoaderStatus>("loading");
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projection, setProjection] = useState<DiagramFlowProjection | null>(
    null
  );
  const [flowDocument, setFlowDocument] = useState<FlowSidecarDocument | null>(
    null
  );
  const [pollTick, setPollTick] = useState(0);
  const paths = resolveDiagramPaths(params.workspaceSlug, params.stage);

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
    setProjection(null);
    setFlowDocument(null);

    const httpUrl = api.getHttpUrl();
    if (!httpUrl) {
      setStatus("error");
      setError(`Не удалось загрузить ${paths.label}: Core HTTP недоступен.`);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const artifactResult = await readWorkflowArtifact({
        httpUrl,
        workspacePath: params.workspacePath,
        workspaceSlug: params.workspaceSlug,
        path: paths.artifactPath,
      });

      if (cancelled) {
        return;
      }

      if (artifactResult.status === "missing") {
        setStatus("missing");
        return;
      }
      if (artifactResult.status === "error") {
        setStatus("error");
        setError(`Не удалось загрузить ${paths.label}: ${artifactResult.error}`);
        return;
      }

      const parseResult =
        params.stage === "diagram_modules"
          ? parseModuleMapDsl(artifactResult.content)
          : parseFacadeMapDsl(artifactResult.content);

      if (!parseResult.ok) {
        setStatus("error");
        setError(
          `Не удалось разобрать ${paths.label}: строка ${parseResult.error.line}, ${parseResult.error.message}`
        );
        setContent(artifactResult.content);
        return;
      }

      const baseProjection = domainModelToReactFlow(parseResult.value);
      const sidecarResult = await readWorkflowArtifact({
        httpUrl,
        workspacePath: params.workspacePath,
        workspaceSlug: params.workspaceSlug,
        path: paths.flowSidecarPath,
      });

      if (cancelled) {
        return;
      }

      const nextFlowDocument =
        sidecarResult.status === "ok"
          ? parseFlowSidecar(sidecarResult.content)
          : null;

      setContent(artifactResult.content);
      setFlowDocument(nextFlowDocument);
      setProjection({
        ...baseProjection,
        nodes: applyFlowSidecarPositions({
          nodes: baseProjection.nodes,
          document: nextFlowDocument,
          revision: baseProjection.revision,
        }),
      });
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [
    pollTick,
    params.refreshKey,
    params.stage,
    params.workspacePath,
    params.workspaceSlug,
    paths.artifactPath,
    paths.flowSidecarPath,
    paths.label,
  ]);

  return {
    status,
    content,
    error,
    projection,
    flowDocument,
    artifactPath: paths.artifactPath,
    flowSidecarPath: paths.flowSidecarPath,
  };
};
