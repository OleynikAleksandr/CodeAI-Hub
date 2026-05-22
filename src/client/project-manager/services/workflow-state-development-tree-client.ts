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

export type DevelopmentTreeNodeStartState = "not_started" | "started";

export type DevelopmentTreeNodeLifecycle = {
  readonly lockedReason?: string;
  readonly startState: DevelopmentTreeNodeStartState;
  readonly startable: boolean;
};

export type DevelopmentTreeOperationNodeKind =
  | "contract_graph"
  | "cross_part_contracts"
  | "execution_waves"
  | "implementation"
  | "integration"
  | "lead_orchestration"
  | "module_facade_specification"
  | "shared_interfaces"
  | "workers";

export type DevelopmentTreeOperationNode = {
  readonly artifactWorkspacePath: string;
  readonly children?: readonly DevelopmentTreeOperationNode[];
  readonly id: string;
  readonly kind: DevelopmentTreeOperationNodeKind;
  readonly title: string;
  readonly workflowPath: string;
};

type DevelopmentTreeNodeMetadata = {
  readonly artifactWorkspacePath?: string;
  readonly artifacts?: readonly DevelopmentTreeNodeArtifact[];
  readonly codeWorkspacePath?: string;
  readonly lifecycle?: DevelopmentTreeNodeLifecycle;
  readonly session?: DevelopmentTreeNodeSession;
  readonly workflowPath?: string;
};

export type DevelopmentTreeModuleNode = DevelopmentTreeNodeMetadata & {
  readonly id: string;
  readonly operations?: readonly DevelopmentTreeOperationNode[];
  readonly readiness?: DevelopmentTreeReadiness;
  readonly title: string;
};

export type DevelopmentTreeClusterNode = DevelopmentTreeNodeMetadata & {
  readonly id: string;
  readonly modules: readonly DevelopmentTreeModuleNode[];
  readonly readiness?: DevelopmentTreeReadiness;
};

export type DevelopmentTreePartNode = DevelopmentTreeNodeMetadata & {
  readonly clusters: readonly DevelopmentTreeClusterNode[];
  readonly id: string;
  readonly operations?: readonly DevelopmentTreeOperationNode[];
  readonly readiness?: DevelopmentTreeReadiness;
  readonly standaloneModules: readonly DevelopmentTreeModuleNode[];
  readonly status: "skeleton" | "materialized";
};

export type DevelopmentTreeSnapshot = {
  readonly leadProductPartId?: string | null;
  readonly parts: readonly DevelopmentTreePartNode[];
  readonly productPartLeadershipOrder?: readonly string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const isDevelopmentTreeReadiness = (
  value: unknown
): value is DevelopmentTreeReadiness =>
  value === "idle" || value === "in_progress" || value === "ready";

const isDevelopmentTreeNodeStartState = (
  value: unknown
): value is DevelopmentTreeNodeStartState =>
  value === "not_started" || value === "started";

const isDevelopmentTreeOperationNodeKind = (
  value: unknown
): value is DevelopmentTreeOperationNodeKind =>
  value === "contract_graph" ||
  value === "cross_part_contracts" ||
  value === "execution_waves" ||
  value === "implementation" ||
  value === "integration" ||
  value === "lead_orchestration" ||
  value === "module_facade_specification" ||
  value === "shared_interfaces" ||
  value === "workers";

const parseStringList = (payload: unknown): readonly string[] | undefined => {
  if (!Array.isArray(payload)) return undefined;
  const values = payload
    .map(readNonEmptyString)
    .filter((item): item is string => item !== null);
  return values.length > 0 ? values : undefined;
};

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

const parseLifecycle = (
  payload: unknown
): DevelopmentTreeNodeLifecycle | undefined => {
  if (!isRecord(payload)) return undefined;
  const startState = isDevelopmentTreeNodeStartState(payload.startState)
    ? payload.startState
    : undefined;
  const startable =
    typeof payload.startable === "boolean" ? payload.startable : undefined;
  if (!(startState && typeof startable === "boolean")) return undefined;
  const lockedReason = readNonEmptyString(payload.lockedReason) ?? undefined;
  return { startState, startable, lockedReason };
};

const parseOperationNode = (
  payload: unknown
): DevelopmentTreeOperationNode | null => {
  if (!isRecord(payload)) return null;
  const artifactWorkspacePath = readNonEmptyString(
    payload.artifactWorkspacePath
  );
  const id = readNonEmptyString(payload.id);
  const kind = isDevelopmentTreeOperationNodeKind(payload.kind)
    ? payload.kind
    : null;
  const title = readNonEmptyString(payload.title);
  const workflowPath = readNonEmptyString(payload.workflowPath);
  if (!(artifactWorkspacePath && id && kind && title && workflowPath)) {
    return null;
  }
  const children = Array.isArray(payload.children)
    ? payload.children
        .map(parseOperationNode)
        .filter((item): item is DevelopmentTreeOperationNode => item !== null)
    : [];
  return {
    artifactWorkspacePath,
    id,
    kind,
    title,
    workflowPath,
    children: children.length > 0 ? children : undefined,
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
    artifactWorkspacePath:
      readNonEmptyString(payload.artifactWorkspacePath) ?? undefined,
    artifacts: artifacts.length > 0 ? artifacts : undefined,
    codeWorkspacePath: readNonEmptyString(payload.codeWorkspacePath) ?? undefined,
    lifecycle: parseLifecycle(payload.lifecycle),
    session: parseSession(payload.session),
    workflowPath: readNonEmptyString(payload.workflowPath) ?? undefined,
  };
};

const parseModuleNode = (payload: unknown): DevelopmentTreeModuleNode | null => {
  if (!isRecord(payload)) return null;
  const id = readNonEmptyString(payload.id);
  const title = readNonEmptyString(payload.title);
  if (!(id && title)) return null;
  const operations = Array.isArray(payload.operations)
    ? payload.operations
        .map(parseOperationNode)
        .filter((item): item is DevelopmentTreeOperationNode => item !== null)
    : [];
  return {
    id,
    title,
    ...parseNodeMetadata(payload),
    operations: operations.length > 0 ? operations : undefined,
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
  const operations = Array.isArray(payload.operations)
    ? payload.operations
        .map(parseOperationNode)
        .filter((item): item is DevelopmentTreeOperationNode => item !== null)
    : [];
  return {
    id,
    status: payload.status === "materialized" ? "materialized" : "skeleton",
    clusters,
    operations: operations.length > 0 ? operations : undefined,
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
  return parts.length > 0
    ? {
        leadProductPartId: readNonEmptyString(payload.leadProductPartId),
        parts,
        productPartLeadershipOrder: parseStringList(
          payload.productPartLeadershipOrder
        ),
      }
    : null;
};
