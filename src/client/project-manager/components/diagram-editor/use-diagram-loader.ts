import { useEffect, useState } from "react";
import type {
  DiagramMapModel,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import { materializeModuleMapFromInventoryDsl } from "../../../../../packages/core/src/workflow/diagram-dsl/module-inventory-parser";
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
        artifactPath: `.codeai-hub/${workspaceSlug}/diagram_modules/module-inventory.md`,
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
    if (response.status === 404) return { status: "missing" };
    if (!response.ok) return { status: "error", error: "Endpoint недоступен." };
    const payload = (await response.json()) as Record<string, unknown> | null;
    const content = typeof payload?.content === "string" ? payload.content : null;
    return content === null
      ? { status: "error", error: "Контент отсутствует." }
      : { status: "ok", content };
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : String(error) };
  }
};
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
      if (params.stage === "diagram_modules") {
        const inventoryResult = await readWorkflowArtifact({
          httpUrl,
          workspacePath: params.workspacePath,
          workspaceSlug: params.workspaceSlug,
          path: paths.artifactPath,
        });

        if (cancelled) {
          return;
        }

        if (inventoryResult.status === "ok") {
          const inventoryMaterialization = materializeModuleMapFromInventoryDsl(
            inventoryResult.content
          );
          if (!inventoryMaterialization.ok) {
            clearDiagram();
            setStatus("error");
            setError(
              `Не удалось разобрать ${paths.label}: строка ${inventoryMaterialization.error.line}, ${inventoryMaterialization.error.message}`
            );
            setContent(inventoryResult.content);
            return;
          }

          const baseProjection = domainModelToReactFlow(
            inventoryMaterialization.value
          );
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

          setContent(inventoryMaterialization.content);
          setModel(inventoryMaterialization.value);
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
          return;
        }

        if (inventoryResult.status === "missing") {
          setContent(null);
          clearDiagram();
          setStatus("missing");
          return;
        }
        if (inventoryResult.status === "error") {
          clearDiagram();
          setStatus("error");
          setError(`Не удалось загрузить ${paths.label}: ${inventoryResult.error}`);
          return;
        }
      }

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
        setContent(null);
        clearDiagram();
        setStatus("missing");
        return;
      }
      if (artifactResult.status === "error") {
        clearDiagram();
        setStatus("error");
        setError(`Не удалось загрузить ${paths.label}: ${artifactResult.error}`);
        return;
      }

      const parseResult =
        params.stage === "diagram_modules"
          ? parseModuleMapDsl(artifactResult.content)
          : parseFacadeMapDsl(artifactResult.content);

      if (!parseResult.ok) {
        clearDiagram();
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
      setModel(parseResult.value);
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
