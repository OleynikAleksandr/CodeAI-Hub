import { materializeModuleMapFromInventoryDsl } from "../../../../../packages/core/src/workflow/diagram-dsl/module-inventory-parser";
import { serializeModuleMapDsl } from "../../../../../packages/core/src/workflow/diagram-dsl/markdown-dsl-serializer";
import {
  buildDiagramModulesSkeletonFromIndex,
  mergeDiagramModulesModels,
  readWorkflowArtifact,
  resolveDiagramPaths,
} from "../diagram-editor/diagram-modules-progressive-model";

const WORKSPACE_SESSION_ENDPOINT = "/api/v1/orchestrator/workspace-session";
const WORKSPACE_FILE_WRITE_ENDPOINT =
  "/api/v1/orchestrator/workspace-file-write";

const readSessionId = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const ensureDiagramModulesSession = async (params: {
  readonly httpUrl: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<string | null> => {
  try {
    const response = await fetch(
      `${params.httpUrl}${WORKSPACE_SESSION_ENDPOINT}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspacePath: params.workspacePath,
          initiativeSlug: params.workspaceSlug,
          stage: "diagram_modules",
        }),
      }
    );
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as Record<string, unknown> | null;
    return readSessionId(payload?.sessionId);
  } catch {
    return null;
  }
};

const writeAggregateArtifact = async (params: {
  readonly httpUrl: string;
  readonly sessionId: string;
  readonly path: string;
  readonly content: string;
}): Promise<boolean> => {
  try {
    const response = await fetch(
      `${params.httpUrl}${WORKSPACE_FILE_WRITE_ENDPOINT}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: params.sessionId,
          path: params.path,
          content: params.content,
        }),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
};

export const composeDiagramModulesAggregate = async (params: {
  readonly httpUrl: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<{ readonly ok: true } | { readonly ok: false; readonly error: string }> => {
  const indexPath = `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts.index.md`;
  const indexResult = await readWorkflowArtifact({
    httpUrl: params.httpUrl,
    workspacePath: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
    path: indexPath,
  });
  if (indexResult.status !== "ok") {
    return {
      ok: false,
      error:
        indexResult.status === "missing"
          ? "product-parts.index.md отсутствует."
          : indexResult.error,
    };
  }

  const skeleton = buildDiagramModulesSkeletonFromIndex(indexResult.content);
  const partModels = [];
  for (const productPart of skeleton.productParts ?? []) {
    const partPath = `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts/${productPart.id}.md`;
    const partResult = await readWorkflowArtifact({
      httpUrl: params.httpUrl,
      workspacePath: params.workspacePath,
      workspaceSlug: params.workspaceSlug,
      path: partPath,
    });
    if (partResult.status !== "ok") {
      return {
        ok: false,
        error:
          partResult.status === "missing"
            ? `Product Part ${productPart.id} ещё не materialized.`
            : `Не удалось загрузить Product Part ${productPart.id}: ${partResult.error}`,
      };
    }
    const materializedPart = materializeModuleMapFromInventoryDsl(
      partResult.content
    );
    if (!materializedPart.ok) {
      return {
        ok: false,
        error: `Не удалось разобрать Product Part ${productPart.id}: строка ${materializedPart.error.line}, ${materializedPart.error.message}`,
      };
    }
    partModels.push(materializedPart.value);
  }

  const sessionId = await ensureDiagramModulesSession(params);
  if (!sessionId) {
    return {
      ok: false,
      error: "Не удалось открыть workspace session для compatibility aggregate.",
    };
  }

  const aggregateModel = {
    ...mergeDiagramModulesModels({
      skeleton,
      parts: partModels,
    }),
    updated: new Date().toISOString(),
  };
  const aggregatePath = resolveDiagramPaths(
    params.workspaceSlug,
    "diagram_modules"
  ).artifactPath;
  const written = await writeAggregateArtifact({
    httpUrl: params.httpUrl,
    sessionId,
    path: aggregatePath,
    content: serializeModuleMapDsl(aggregateModel),
  });

  return written
    ? { ok: true }
    : { ok: false, error: "Не удалось записать compatibility aggregate." };
};
