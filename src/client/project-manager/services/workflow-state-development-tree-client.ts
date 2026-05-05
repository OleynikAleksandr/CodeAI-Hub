export type DevelopmentTreeContinuityStageId = `development_tree/${string}`;

export type DevelopmentTreeReadiness = "idle" | "in_progress" | "ready";

export type DevelopmentTreeNodeArtifact = {
  readonly fileName: string;
  readonly path: string;
};

export type DevelopmentTreeNodeSession = {
  readonly dialogId: string;
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly rootSessionId: string;
  readonly sessionId: string;
  readonly updatedAt: string;
};

type DevelopmentTreeNodeMetadata = {
  readonly artifacts?: readonly DevelopmentTreeNodeArtifact[];
  readonly session?: DevelopmentTreeNodeSession;
  readonly workflowPath?: string;
};

export type DevelopmentTreeModuleNode = DevelopmentTreeNodeMetadata & {
  readonly id: string;
  readonly readiness?: DevelopmentTreeReadiness;
  readonly title: string;
};

export type DevelopmentTreeClusterNode = DevelopmentTreeNodeMetadata & {
  readonly id: string;
  readonly modules: readonly DevelopmentTreeModuleNode[];
  readonly readiness?: DevelopmentTreeReadiness;
};

export type DevelopmentTreePartNode = DevelopmentTreeNodeMetadata & {
  readonly id: string;
  readonly readiness?: DevelopmentTreeReadiness;
  readonly status: "skeleton" | "materialized";
  readonly clusters: readonly DevelopmentTreeClusterNode[];
  readonly standaloneModules: readonly DevelopmentTreeModuleNode[];
};

export type DevelopmentTreeSnapshot = {
  readonly parts: readonly DevelopmentTreePartNode[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const isDevelopmentTreeReadiness = (
  value: unknown
): value is DevelopmentTreeReadiness =>
  value === "idle" || value === "in_progress" || value === "ready";

const parseArtifact = (payload: unknown): DevelopmentTreeNodeArtifact | null => {
  if (!isRecord(payload)) return null;
  const fileName = readNonEmptyString(payload.fileName);
  const path = readNonEmptyString(payload.path);
  return fileName && path ? { fileName, path } : null;
};

const parseSession = (payload: unknown): DevelopmentTreeNodeSession | undefined => {
  if (!isRecord(payload)) return undefined;
  const dialogId = readNonEmptyString(payload.dialogId);
  const providerId = readNonEmptyString(payload.providerId);
  const providerSessionId = readNonEmptyString(payload.providerSessionId);
  const rootSessionId = readNonEmptyString(payload.rootSessionId);
  const sessionId = readNonEmptyString(payload.sessionId);
  const updatedAt = readNonEmptyString(payload.updatedAt);
  if (!(dialogId && providerId && providerSessionId && rootSessionId && sessionId && updatedAt)) {
    return undefined;
  }
  return {
    dialogId,
    providerId,
    providerSessionId,
    rootSessionId,
    sessionId,
    updatedAt,
  };
};

const parseNodeMetadata = (
  payload: Record<string, unknown>
): DevelopmentTreeNodeMetadata => {
  const artifacts = Array.isArray(payload.artifacts)
    ? payload.artifacts
        .map(parseArtifact)
        .filter((item): item is DevelopmentTreeNodeArtifact => item !== null)
    : [];
  return {
    artifacts: artifacts.length > 0 ? artifacts : undefined,
    session: parseSession(payload.session),
    workflowPath: readNonEmptyString(payload.workflowPath) ?? undefined,
  };
};

const parseModuleNode = (payload: unknown): DevelopmentTreeModuleNode | null => {
  if (!isRecord(payload)) return null;
  const id = readNonEmptyString(payload.id);
  const title = readNonEmptyString(payload.title);
  if (!(id && title)) return null;
  return {
    id,
    title,
    ...parseNodeMetadata(payload),
    readiness: isDevelopmentTreeReadiness(payload.readiness)
      ? payload.readiness
      : undefined,
  };
};

const parseClusterNode = (payload: unknown): DevelopmentTreeClusterNode | null => {
  if (!isRecord(payload)) return null;
  const id = readNonEmptyString(payload.id);
  if (!id) return null;
  const modules = Array.isArray(payload.modules)
    ? payload.modules
        .map(parseModuleNode)
        .filter((item): item is DevelopmentTreeModuleNode => item !== null)
    : [];
  return {
    id,
    modules,
    ...parseNodeMetadata(payload),
    readiness: isDevelopmentTreeReadiness(payload.readiness)
      ? payload.readiness
      : undefined,
  };
};

const parsePartNode = (payload: unknown): DevelopmentTreePartNode | null => {
  if (!isRecord(payload)) return null;
  const id = readNonEmptyString(payload.id);
  if (!id) return null;
  const clusters = Array.isArray(payload.clusters)
    ? payload.clusters
        .map(parseClusterNode)
        .filter((item): item is DevelopmentTreeClusterNode => item !== null)
    : [];
  const standaloneModules = Array.isArray(payload.standaloneModules)
    ? payload.standaloneModules
        .map(parseModuleNode)
        .filter((item): item is DevelopmentTreeModuleNode => item !== null)
    : [];
  return {
    id,
    status: payload.status === "materialized" ? "materialized" : "skeleton",
    clusters,
    standaloneModules,
    ...parseNodeMetadata(payload),
    readiness: isDevelopmentTreeReadiness(payload.readiness)
      ? payload.readiness
      : undefined,
  };
};

export const parseDevelopmentTreeSnapshot = (
  payload: unknown
): DevelopmentTreeSnapshot | null => {
  if (!isRecord(payload)) return null;
  const parts = Array.isArray(payload.parts)
    ? payload.parts
        .map(parsePartNode)
        .filter((item): item is DevelopmentTreePartNode => item !== null)
    : [];
  return parts.length > 0 ? { parts } : null;
};
