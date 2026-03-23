import type {
  ClusterEntity,
  DiagramMapModel,
  ModuleEntity,
  ModuleMapModel,
  ModuleRelation,
  ProductPartEntity,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import { materializeModuleMapFromInventoryDsl } from "../../../../../packages/core/src/workflow/diagram-dsl/module-inventory-parser";
import { domainModelToReactFlow } from "./adapters/domain-model-to-react-flow";
import type { DiagramFlowProjection } from "./adapters/domain-model-to-react-flow.types";
import {
  applyFlowSidecarPositions,
  parseFlowSidecar,
  type FlowSidecarDocument,
} from "./flow-sidecar-types";

export type DiagramEditorStage = "diagram_modules" | "diagram_facades";
export type DiagramPaths = {
  readonly artifactPath: string;
  readonly flowSidecarPath: string;
  readonly label: string;
};

export const resolveDiagramPaths = (
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

export type ArtifactReadResult =
  | { readonly status: "ok"; readonly content: string }
  | { readonly status: "missing" }
  | { readonly status: "error"; readonly error: string };

export const readWorkflowArtifact = async (params: {
  readonly httpUrl: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly path: string;
}): Promise<ArtifactReadResult> => {
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
    const payload = (await response.json()) as Record<string, unknown> | null;
    const content = typeof payload?.content === "string" ? payload.content : null;
    return content === null
      ? { status: "error", error: "Контент отсутствует." }
      : { status: "ok", content };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const PRODUCT_PART_HEADER_RE =
  /^###\s+Product Part:\s+([a-z0-9]+(?:-[a-z0-9]+)*)\s*$/gm;
const PRODUCT_PART_ORDERED_ITEM_RE =
  /^\d+\.\s+`([a-z0-9]+(?:-[a-z0-9]+)*)`\s+[—-]\s+`([^`]+)`\s*$/gm;
const PRODUCT_PART_TABLE_ROW_RE =
  /^\|\s*\d+\s*\|\s*`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|$/gm;

const readField = (block: string, label: string): string | null => {
  const match = block.match(new RegExp(`^\\s*- ${label}:\\s+(.+)$`, "im"));
  const value = match?.[1]?.trim();
  return value && value.length > 0 ? value : null;
};

const humanizeIdentifier = (value: string): string =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

export const buildDiagramModulesSkeletonFromIndex = (
  markdown: string
): ModuleMapModel => {
  const productParts: ProductPartEntity[] = [];
  const matches = [
    ...[...markdown.matchAll(PRODUCT_PART_HEADER_RE)].map((match) => ({
      index: match.index ?? 0,
      id: match[1]?.trim() ?? "",
      title: null as string | null,
      purpose: null as string | null,
    })),
    ...[...markdown.matchAll(PRODUCT_PART_ORDERED_ITEM_RE)].map((match) => ({
      index: match.index ?? 0,
      id: match[1]?.trim() ?? "",
      title: match[2]?.trim() ?? null,
      purpose: null as string | null,
    })),
    ...[...markdown.matchAll(PRODUCT_PART_TABLE_ROW_RE)].map((match) => ({
      index: match.index ?? 0,
      id: match[1]?.trim() ?? "",
      title: match[2]?.trim() ?? null,
      purpose: match[3]?.trim() ?? null,
    })),
  ].sort((left, right) => left.index - right.index);
  for (const [index, match] of matches.entries()) {
    const productPartId = match.id;
    if (!productPartId) {
      continue;
    }
    const blockStart = match.index;
    const blockEnd =
      index + 1 < matches.length
        ? (matches[index + 1]?.index ?? markdown.length)
        : markdown.length;
    const block = markdown.slice(blockStart, blockEnd);
    productParts.push({
      id: productPartId,
      title:
        match.title ??
        readField(block, "Title") ??
        humanizeIdentifier(productPartId),
      purpose:
        match.purpose ??
        readField(block, "Purpose") ??
        "Planned Product Part awaiting staged materialization.",
      clusterIds: [],
      standaloneModuleIds: [],
    });
  }
  return {
    version: 1,
    stage: "diagram_modules",
    revision: "product-parts-index",
    updated: new Date().toISOString(),
    productParts,
    clusters: [],
    modules: [],
    relations: [],
  };
};

const upsertById = <T extends { readonly id: string }>(
  existing: readonly T[],
  incoming: readonly T[]
): T[] => {
  const byId = new Map(existing.map((entry) => [entry.id, entry]));
  for (const entry of incoming) {
    byId.set(entry.id, entry);
  }
  return [...byId.values()];
};

export const mergeDiagramModulesModels = (params: {
  readonly skeleton: ModuleMapModel;
  readonly parts: readonly ModuleMapModel[];
}): ModuleMapModel => {
  let productParts: readonly ProductPartEntity[] =
    params.skeleton.productParts ?? [];
  let clusters: readonly ClusterEntity[] = params.skeleton.clusters ?? [];
  let modules: readonly ModuleEntity[] = params.skeleton.modules;
  let relations: readonly ModuleRelation[] = params.skeleton.relations;

  for (const part of params.parts) {
    productParts = upsertById(productParts, part.productParts ?? []);
    clusters = upsertById(clusters, part.clusters ?? []);
    modules = upsertById(modules, part.modules);
    relations = upsertById(relations, part.relations);
  }

  return {
    ...params.skeleton,
    productParts,
    clusters,
    modules,
    relations,
  };
};

export type DiagramModulesProgressiveLoadResult =
  | {
      readonly status: "ready";
      readonly content: string;
      readonly model: DiagramMapModel;
      readonly projection: DiagramFlowProjection;
      readonly flowDocument: FlowSidecarDocument | null;
    }
  | { readonly status: "missing" }
  | { readonly status: "error"; readonly error: string; readonly content?: string };

const loadDiagramModulesPartModels = async (params: {
  readonly indexContent: string;
  readonly readArtifact: (path: string) => Promise<ArtifactReadResult>;
  readonly workspaceSlug: string;
  readonly productParts: readonly ProductPartEntity[];
}): Promise<
  | { readonly status: "ok"; readonly partModels: readonly ModuleMapModel[] }
  | { readonly status: "error"; readonly error: string; readonly content: string }
> => {
  const partModels: ModuleMapModel[] = [];
  for (const productPart of params.productParts) {
    const partPath = `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts/${productPart.id}.md`;
    const partResult = await params.readArtifact(partPath);
    if (partResult.status === "missing") {
      continue;
    }
    if (partResult.status === "error") {
      return {
        status: "error",
        error: `не удалось загрузить Product Part ${productPart.id}: ${partResult.error}`,
        content: params.indexContent,
      };
    }

    const materializedPart = materializeModuleMapFromInventoryDsl(
      partResult.content
    );
    if (!materializedPart.ok) {
      return {
        status: "error",
        error: `не удалось разобрать Product Part ${productPart.id}: строка ${materializedPart.error.line}, ${materializedPart.error.message}`,
        content: params.indexContent,
      };
    }
    partModels.push(materializedPart.value);
  }
  return { status: "ok", partModels };
};

export const loadDiagramModulesProgressiveResult = async (params: {
  readonly readArtifact: (path: string) => Promise<ArtifactReadResult>;
  readonly workspaceSlug: string;
  readonly flowSidecarPath: string;
}): Promise<DiagramModulesProgressiveLoadResult> => {
  const indexPath = `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts.index.md`;
  const indexResult = await params.readArtifact(indexPath);
  if (indexResult.status === "ok") {
    const skeleton = buildDiagramModulesSkeletonFromIndex(indexResult.content);
    const partModelsResult = await loadDiagramModulesPartModels({
      indexContent: indexResult.content,
      readArtifact: params.readArtifact,
      workspaceSlug: params.workspaceSlug,
      productParts: skeleton.productParts ?? [],
    });
    if (partModelsResult.status === "error") {
      return partModelsResult;
    }
    const progressiveModel = mergeDiagramModulesModels({
      skeleton,
      parts: partModelsResult.partModels,
    });
    const baseProjection = domainModelToReactFlow(progressiveModel);
    const sidecarResult = await params.readArtifact(params.flowSidecarPath);
    const flowDocument =
      sidecarResult.status === "ok"
        ? parseFlowSidecar(sidecarResult.content)
        : null;
    return {
      status: "ready",
      content: indexResult.content,
      model: progressiveModel,
      flowDocument,
      projection: {
        ...baseProjection,
        nodes: applyFlowSidecarPositions({
          nodes: baseProjection.nodes,
          document: flowDocument,
          revision: baseProjection.revision,
        }),
      },
    };
  }
  if (indexResult.status === "error") {
    return { status: "error", error: indexResult.error };
  }
  return { status: "missing" };
};
