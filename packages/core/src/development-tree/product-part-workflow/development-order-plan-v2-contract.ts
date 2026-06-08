import path from "node:path";
import { DevelopmentTreeNodeDetector } from "../node-bootstrap/development-tree-node-detector";

const DEVELOPMENT_ORDER_PLAN_V2_SCHEMA = "codeai-development-order-plan-v2";

type JsonRecord = Record<string, unknown>;

export interface DevelopmentOrderPlanV2ValidationRequest {
  readonly leadProductPartId: string;
  readonly plan: JsonRecord;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface DevelopmentOrderPlanV2ValidationResult {
  readonly diagnostics: readonly string[];
}

interface OrderPlanNode {
  readonly clusterId?: string;
  readonly dependsOn: readonly string[];
  readonly id: string;
  readonly kind: string;
  readonly moduleId?: string;
  readonly partId: string;
}

const FIRST_WAVE_NODE_KINDS = new Set(["cluster", "standalone_module"]);
const NODE_ID_RE = /^(cluster|module|standalone-module):([^/]+)\/(.+)$/u;

const asRecord = (value: unknown): JsonRecord | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const asStringArray = (value: unknown): readonly string[] | null =>
  Array.isArray(value) &&
  value.every((item) => typeof item === "string" && item.trim())
    ? value
    : null;

const detectMaterializedNodeIds = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<ReadonlySet<string>> => {
  const rootRelative = `.codeai-hub/${params.workspaceSlug}/development_tree/materialized`;
  const nodes = await new DevelopmentTreeNodeDetector().detect({
    materializedRootAbsolutePath: path.join(params.workspaceRoot, rootRelative),
    materializedRootRelativePath: rootRelative,
  });
  return new Set(
    nodes.flatMap((node) => {
      if (node.kind === "cluster" && node.clusterId) {
        return [`cluster:${node.partId}/${node.clusterId}`];
      }
      if (node.kind === "module" && node.clusterId) {
        return [`module:${node.partId}/${node.clusterId}/${node.id}`];
      }
      if (node.kind === "module") {
        return [`standalone-module:${node.partId}/${node.id}`];
      }
      return [];
    })
  );
};

const parseNode = (
  value: unknown,
  diagnostics: string[],
  index: number
): OrderPlanNode | null => {
  const node = asRecord(value);
  if (!node) {
    diagnostics.push(`nodes[${index}] must be an object.`);
    return null;
  }
  const id = asString(node.id);
  const kind = asString(node.kind);
  const partId = asString(node.partId);
  const clusterId = asString(node.clusterId);
  const moduleId = asString(node.moduleId);
  const dependsOn = asStringArray(node.dependsOn) ?? [];
  if (!(id && kind && partId)) {
    diagnostics.push(`nodes[${index}] must include id, kind, and partId.`);
    return null;
  }
  const parsedId = id.match(NODE_ID_RE);
  if (!parsedId) {
    diagnostics.push(`nodes[${index}].id has unsupported format: ${id}.`);
    return null;
  }
  if (kind === "cluster" && !clusterId) {
    diagnostics.push(`nodes[${index}] cluster node must include clusterId.`);
    return null;
  }
  if (kind === "module" && !(clusterId && moduleId)) {
    diagnostics.push(
      `nodes[${index}] module node must include clusterId and moduleId.`
    );
    return null;
  }
  if (kind === "standalone_module" && !moduleId) {
    diagnostics.push(
      `nodes[${index}] standalone_module node must include moduleId.`
    );
    return null;
  }
  return {
    id,
    kind,
    partId,
    dependsOn,
    ...(clusterId ? { clusterId } : {}),
    ...(moduleId ? { moduleId } : {}),
  };
};

const hasCycle = (nodes: readonly OrderPlanNode[]): boolean => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visited.has(id)) {
      return false;
    }
    if (visiting.has(id)) {
      return true;
    }
    visiting.add(id);
    for (const dependency of byId.get(id)?.dependsOn ?? []) {
      if (byId.has(dependency) && visit(dependency)) {
        return true;
      }
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return nodes.some((node) => visit(node.id));
};

const validateRequiredBriefs = (
  plan: JsonRecord,
  leadProductPartId: string,
  diagnostics: string[]
): void => {
  const briefs = Array.isArray(plan.requiredBriefs) ? plan.requiredBriefs : [];
  if (briefs.length === 0) {
    diagnostics.push(
      "requiredBriefs must contain at least the lead Product Part."
    );
    return;
  }
  let hasLeadBrief = false;
  for (const [index, value] of briefs.entries()) {
    const brief = asRecord(value);
    if (!brief) {
      diagnostics.push(`requiredBriefs[${index}] must be an object.`);
      continue;
    }
    const partId = asString(brief.partId);
    const status = asString(brief.status);
    if (!partId || status !== "accepted") {
      diagnostics.push(
        `requiredBriefs[${index}] must include partId and status "accepted".`
      );
      continue;
    }
    hasLeadBrief ||= partId === leadProductPartId;
  }
  if (!hasLeadBrief) {
    diagnostics.push(
      `requiredBriefs must include accepted lead part ${leadProductPartId}.`
    );
  }
};

const parseNodes = (
  plan: JsonRecord,
  diagnostics: string[]
): readonly OrderPlanNode[] => {
  const nodes = (Array.isArray(plan.nodes) ? plan.nodes : []).flatMap(
    (node, index) => {
      const parsed = parseNode(node, diagnostics, index);
      return parsed ? [parsed] : [];
    }
  );
  if (nodes.length === 0) {
    diagnostics.push(
      "nodes must contain at least one cluster or standalone module node."
    );
  }
  return nodes;
};

const validateNodeReferences = (params: {
  readonly diagnostics: string[];
  readonly materializedNodeIds: ReadonlySet<string>;
  readonly nodes: readonly OrderPlanNode[];
  readonly nodesById: ReadonlyMap<string, OrderPlanNode>;
}): void => {
  if (params.nodesById.size !== params.nodes.length) {
    params.diagnostics.push("nodes must not contain duplicate ids.");
  }
  for (const node of params.nodes) {
    for (const dependency of node.dependsOn) {
      if (!params.nodesById.has(dependency)) {
        params.diagnostics.push(
          `${node.id} depends on unknown node ${dependency}.`
        );
      }
    }
    if (!params.materializedNodeIds.has(node.id)) {
      params.diagnostics.push(
        `node ${node.id} does not exist in materialized Development Tree.`
      );
    }
  }
  if (hasCycle(params.nodes)) {
    params.diagnostics.push("nodes dependency graph must not contain cycles.");
  }
};

const collectLockedNodeIds = (
  plan: JsonRecord,
  nodesById: ReadonlyMap<string, OrderPlanNode>,
  diagnostics: string[]
): ReadonlySet<string> => {
  const lockedNodeIds = new Set<string>();
  const lockedNodes = Array.isArray(plan.lockedNodes) ? plan.lockedNodes : [];
  for (const [index, value] of lockedNodes.entries()) {
    const locked = asRecord(value);
    const nodeId = asString(locked?.nodeId);
    const reason = asString(locked?.reason);
    if (!(nodeId && reason)) {
      diagnostics.push(`lockedNodes[${index}] must include nodeId and reason.`);
      continue;
    }
    lockedNodeIds.add(nodeId);
    if (!nodesById.has(nodeId)) {
      diagnostics.push(
        `lockedNodes[${index}] references unknown node ${nodeId}.`
      );
    }
  }
  return lockedNodeIds;
};

const validatePlanIdentity = (
  plan: JsonRecord,
  leadProductPartId: string,
  diagnostics: string[]
): boolean => {
  if (plan.schema !== DEVELOPMENT_ORDER_PLAN_V2_SCHEMA) {
    diagnostics.push(`schema must be ${DEVELOPMENT_ORDER_PLAN_V2_SCHEMA}.`);
    return false;
  }
  if (plan.leadProductPartId !== leadProductPartId) {
    diagnostics.push(`leadProductPartId must be ${leadProductPartId}.`);
  }
  const leadership = asStringArray(plan.productPartLeadershipOrder);
  if (!leadership || leadership[0] !== leadProductPartId) {
    diagnostics.push(
      "productPartLeadershipOrder must start with the lead Product Part id."
    );
  }
  return true;
};

const validateWaves = (
  plan: JsonRecord,
  nodesById: ReadonlyMap<string, OrderPlanNode>,
  lockedNodeIds: ReadonlySet<string>,
  diagnostics: string[]
): void => {
  const waves = Array.isArray(plan.waves) ? plan.waves : [];
  if (waves.length === 0) {
    diagnostics.push("waves must contain at least one first-wave entry.");
    return;
  }
  const firstWave = asRecord(waves[0]);
  const unlockNodeIds = asStringArray(firstWave?.unlockNodeIds);
  if (!(firstWave && unlockNodeIds) || unlockNodeIds.length === 0) {
    diagnostics.push(
      "waves[0].unlockNodeIds must contain at least one node id."
    );
    return;
  }
  for (const nodeId of unlockNodeIds) {
    const node = nodesById.get(nodeId);
    if (!node) {
      diagnostics.push(`waves[0] unlocks unknown node ${nodeId}.`);
      continue;
    }
    if (lockedNodeIds.has(nodeId)) {
      diagnostics.push(`waves[0] unlocks locked node ${nodeId}.`);
    }
    if (!FIRST_WAVE_NODE_KINDS.has(node.kind)) {
      diagnostics.push(
        `waves[0] may unlock only cluster or standalone_module nodes: ${nodeId}.`
      );
    }
    if (node.dependsOn.length > 0) {
      diagnostics.push(
        `waves[0] node ${nodeId} must not have unmet dependencies.`
      );
    }
  }
};

export const validateDevelopmentOrderPlanV2 = async (
  request: DevelopmentOrderPlanV2ValidationRequest
): Promise<DevelopmentOrderPlanV2ValidationResult> => {
  const diagnostics: string[] = [];
  const { plan } = request;
  if (!validatePlanIdentity(plan, request.leadProductPartId, diagnostics)) {
    return { diagnostics };
  }
  validateRequiredBriefs(plan, request.leadProductPartId, diagnostics);
  const nodes = parseNodes(plan, diagnostics);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const materializedNodeIds = await detectMaterializedNodeIds(request);
  validateNodeReferences({
    diagnostics,
    materializedNodeIds,
    nodes,
    nodesById,
  });
  const lockedNodeIds = collectLockedNodeIds(plan, nodesById, diagnostics);
  validateWaves(plan, nodesById, lockedNodeIds, diagnostics);
  return { diagnostics };
};
