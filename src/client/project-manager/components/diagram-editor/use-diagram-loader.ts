import { useEffect, useState } from "react";
import type {
  DiagramMapModel,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import { api } from "../../api";
import type { DiagramFlowProjection } from "./adapters/domain-model-to-react-flow.types";
import {
  readWorkflowArtifact,
  resolveDiagramPaths,
  type DiagramEditorStage,
  loadDiagramModulesProgressiveResult,
} from "./diagram-modules-progressive-model";
import type { FlowSidecarDocument } from "./flow-sidecar-types";

export type DiagramLoaderStatus = "loading" | "missing" | "ready" | "error";
export type { DiagramEditorStage } from "./diagram-modules-progressive-model";
export type DiagramLoaderResult = {
  readonly status: DiagramLoaderStatus;
  readonly content: string | null;
  readonly error: string | null;
  readonly model: DiagramMapModel | null;
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
  const [projection, setProjection] = useState<DiagramFlowProjection | null>(null);
  const [model, setModel] = useState<DiagramMapModel | null>(null);
  const [flowDocument, setFlowDocument] = useState<FlowSidecarDocument | null>(null);
  const [pollTick, setPollTick] = useState(0);
  const paths = resolveDiagramPaths(params.workspaceSlug, params.stage);
  const contextKey = `${params.workspacePath}::${params.workspaceSlug}::${params.stage}`;
  useEffect(() => {
    if (status !== "missing") return;
    const timer = window.setTimeout(() => {
      setPollTick((current) => current + 1);
    }, 5_000);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    setStatus("loading");
    setContent(null);
    setError(null);
    setProjection(null);
    setModel(null);
    setFlowDocument(null);
  }, [contextKey]);

  useEffect(() => {
    let cancelled = false;
    setStatus((current) => (current === "ready" ? current : "loading"));
    setError(null);
    const clearDiagram = () => {
      setModel(null);
      setProjection(null);
      setFlowDocument(null);
    };

    const httpUrl = api.getHttpUrl();
    if (!httpUrl) {
      setStatus("error");
      setError(`Не удалось загрузить ${paths.label}: Core HTTP недоступен.`);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const progressiveResult = await loadDiagramModulesProgressiveResult({
        workspaceSlug: params.workspaceSlug,
        flowSidecarPath: paths.flowSidecarPath,
        readArtifact: (path) =>
          readWorkflowArtifact({
            httpUrl,
            workspacePath: params.workspacePath,
            workspaceSlug: params.workspaceSlug,
            path,
          }),
      });

      if (cancelled) {
        return;
      }

      if (progressiveResult.status === "ready") {
        setContent(progressiveResult.content);
        setModel(progressiveResult.model);
        setFlowDocument(progressiveResult.flowDocument);
        setProjection(progressiveResult.projection);
        setStatus("ready");
        return;
      }

      if (progressiveResult.status === "error") {
        clearDiagram();
        setStatus("error");
        setError(
          `Не удалось загрузить ${paths.label}: ${progressiveResult.error}`
        );
        setContent(progressiveResult.content ?? null);
        return;
      }

      setContent(null);
      clearDiagram();
      setStatus("missing");
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
    paths.label,
    paths.artifactPath,
    paths.flowSidecarPath,
  ]);

  return {
    status,
    content,
    error,
    model,
    projection,
    flowDocument,
    artifactPath: paths.artifactPath,
    flowSidecarPath: paths.flowSidecarPath,
  };
};
