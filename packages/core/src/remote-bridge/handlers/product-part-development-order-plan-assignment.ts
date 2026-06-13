import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { WorkflowBoundaryGit } from "../../workflow/boundary/workflow-boundary-git";

interface AcceptedBriefInput {
  readonly content: string;
  readonly partId: string;
  readonly relativePath: string;
  readonly status: "accepted";
}

export type LeadOrderPlanAssignment =
  | {
      readonly blockedMessage: string;
      readonly missingPartIds: readonly string[];
      readonly ready: false;
    }
  | {
      readonly briefInputs: readonly AcceptedBriefInput[];
      readonly prompt: string;
      readonly ready: true;
    };

const PRODUCT_PART_ID_RE =
  /^###\s+Product Part:\s+([a-z0-9]+(?:-[a-z0-9]+)*)\s*$/gm;
const PRODUCT_PART_ORDERED_ITEM_RE =
  /^(?:\d+\.\s+|###\s+\d+\.)`([a-z0-9]+(?:-[a-z0-9]+)*)`(?:\s+[—-]\s+`[^`]+`)?\s*$/gm;
const PRODUCT_PART_TABLE_ROW_RE =
  /^\|\s*\d+\s*\|\s*`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*\|\s*`[^`]+`\s*\|\s*.+\|$/gm;
const LEADERSHIP_ORDER_RE =
  /(?:^|\n)\s*(?:[-*]\s*)?(?:productPartLeadershipOrder|Product Part Leadership Order)\s*[:|]\s*(.+)/iu;
const LEAD_PRODUCT_PART_RE =
  /(?:^|\n)\s*(?:[-*]\s*)?(?:leadProductPartId|Lead Product Part(?: ID)?)\s*[:|]\s*`?([a-z0-9]+(?:-[a-z0-9]+)*)`?/iu;
const PRODUCT_PART_ID_IN_TEXT_RE = /`([a-z0-9]+(?:-[a-z0-9]+)*)`/gu;

const readOptionalFile = async (
  workspaceRoot: string,
  relativePath: string
): Promise<string | null> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  if (!((await stat(absolutePath).catch(() => null))?.isFile() ?? false)) {
    return null;
  }
  return await readFile(absolutePath, "utf8");
};

const readOptionalJsonRecord = async (
  workspaceRoot: string,
  relativePath: string
): Promise<Record<string, unknown> | null> => {
  const content = await readOptionalFile(workspaceRoot, relativePath);
  if (!content) {
    return null;
  }
  const parsed = JSON.parse(content) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null;
};

const writeText = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const collectProductPartIds = (markdown: string): readonly string[] => {
  const partIds: string[] = [];
  for (const pattern of [
    PRODUCT_PART_ID_RE,
    PRODUCT_PART_ORDERED_ITEM_RE,
    PRODUCT_PART_TABLE_ROW_RE,
  ]) {
    for (const match of markdown.matchAll(pattern)) {
      const partId = match[1]?.trim();
      if (partId && !partIds.includes(partId)) {
        partIds.push(partId);
      }
    }
  }
  return partIds;
};

const readLeadershipOrder = (
  markdown: string,
  plannedPartIds: readonly string[],
  leadPartId: string
): readonly string[] => {
  const orderLine = markdown.match(LEADERSHIP_ORDER_RE)?.[1] ?? "";
  const explicitOrder = [...orderLine.matchAll(PRODUCT_PART_ID_IN_TEXT_RE)]
    .map((match) => match[1])
    .filter((partId): partId is string => Boolean(partId));
  const ordered = explicitOrder.length > 0 ? explicitOrder : plannedPartIds;
  return [
    leadPartId,
    ...ordered.filter((partId) => partId !== leadPartId),
  ].filter((partId, index, all) => all.indexOf(partId) === index);
};

const createDiagramIndexPath = (workspaceSlug: string): string =>
  `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`;

const createTaskPrefix = (partId: string): string =>
  `development-tree.product-part.${partId}`;

const createOrderPlanTaskId = (partId: string): string =>
  `${createTaskPrefix(partId)}.phase3.order-plan.task1`;

const createPlanPath = (partId: string): string =>
  `doc/TODO/stages/development-tree/product-parts/${partId}/todo-plan.md`;

const createBriefPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/ProductPartDevelopmentBrief.draft.md`;

const createManagedDecisionPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/workflow/managed/development-tree-product-parts/${params.partId}.json`;

const createOrderPlanPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/DevelopmentOrderPlan.draft.md`;

const createOrderPlanJsonPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/DevelopmentOrderPlan.draft.json`;

const isAcceptedBrief = (decision: Record<string, unknown> | null): boolean =>
  decision?.schema === "codeai-product-part-development-brief-managed-v1" &&
  decision.reviewState === "accepted";

const markOrderPlanTaskInProgress = (content: string, partId: string): string =>
  content.replace(
    new RegExp(
      `^(\\d+\\. \\[)(?:TODO|BLOCKED)(\\] \`${escapeRegExp(
        createOrderPlanTaskId(partId)
      )}\` .*)$`,
      "mu"
    ),
    "$1IN_PROGRESS$2"
  );

const readBriefInput = async (params: {
  readonly partId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<AcceptedBriefInput | null> => {
  const decision = await readOptionalJsonRecord(
    params.workspaceRoot,
    createManagedDecisionPath(params)
  );
  if (!isAcceptedBrief(decision)) {
    return null;
  }
  const relativePath = createBriefPath(params);
  const content = await readOptionalFile(params.workspaceRoot, relativePath);
  return content
    ? { content, partId: params.partId, relativePath, status: "accepted" }
    : null;
};

const resolveBriefInputs = async (params: {
  readonly partIds: readonly string[];
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<{
  readonly accepted: readonly AcceptedBriefInput[];
  readonly missingPartIds: readonly string[];
}> => {
  const accepted: AcceptedBriefInput[] = [];
  const missingPartIds: string[] = [];
  for (const partId of params.partIds) {
    const brief = await readBriefInput({
      partId,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    if (brief) {
      accepted.push(brief);
    } else {
      missingPartIds.push(partId);
    }
  }
  return { accepted, missingPartIds };
};

const createAcceptedBriefsPromptSection = (
  briefs: readonly AcceptedBriefInput[]
): readonly string[] => [
  "Accepted Product Part briefs supplied by Core (full text):",
  "",
  ...briefs.flatMap((brief) => [
    `### Product Part \`${brief.partId}\` Development Brief`,
    `- Status: \`${brief.status}\``,
    `- Source artifact: \`${brief.relativePath}\``,
    "",
    "```markdown",
    brief.content.trimEnd(),
    "```",
    "",
  ]),
];

const createBlockedMessage = (params: {
  readonly accepted: readonly AcceptedBriefInput[];
  readonly leadPartId: string;
  readonly missingPartIds: readonly string[];
}): string =>
  [
    `Core: lead Product Part \`${params.leadPartId}\` Development Order Plan не запущен.`,
    "Причина: Core ждёт пользовательское принятие Development Brief для всех Product Part.",
    "",
    `Accepted briefs: ${params.accepted.map((brief) => `\`${brief.partId}\``).join(", ") || "none"}.`,
    `Missing accepted briefs: ${params.missingPartIds.map((partId) => `\`${partId}\``).join(", ")}.`,
    "",
    "Core не будет отправлять lead Development Order Plan prompt, пока эти брифы не будут приняты.",
  ].join("\n");

const createPrompt = (params: {
  readonly briefInputs: readonly AcceptedBriefInput[];
  readonly leadPartId: string;
  readonly productPartLeadershipOrder: readonly string[];
  readonly workspaceSlug: string;
}): string => {
  const orderPlanPath = createOrderPlanPath({
    partId: params.leadPartId,
    workspaceSlug: params.workspaceSlug,
  });
  const orderPlanJsonPath = createOrderPlanJsonPath({
    partId: params.leadPartId,
    workspaceSlug: params.workspaceSlug,
  });
  const requiredBriefs = params.briefInputs.map((brief) => ({
    partId: brief.partId,
    status: brief.status,
  }));
  return [
    `Core managed assignment: Product Part \`${params.leadPartId}\` is the lead Product Part and all Product Part Development Briefs were accepted by the user.`,
    "",
    ...createAcceptedBriefsPromptSection(params.briefInputs),
    "Continue in this same session. Create or update both lead Development Order Plan artifacts:",
    `- \`${orderPlanPath}\``,
    `- \`${orderPlanJsonPath}\``,
    "",
    "The markdown artifact must explain the Core-executable downstream order for Product Parts, clusters, and standalone modules using the accepted Product Part briefs embedded above and visible dependencies already available in the workspace.",
    "",
    "The JSON artifact must be valid JSON with this Core-readable unlock contract. Use only node ids that already exist in the materialized Development Tree; do not invent clusters or modules.",
    'Use exact node id shapes: cluster nodes are `cluster:<partId>/<clusterId>` with `kind: "cluster"`; modules inside a cluster are `module:<partId>/<clusterId>/<moduleId>` with `kind: "module"`; standalone modules are `standalone-module:<partId>/<moduleId>` with `kind: "standalone_module"` and no `clusterId`.',
    "Do not encode standalone modules as `module:<partId>/<moduleId>`. If a node appears in `lockedNodes`, the same id must also appear in `nodes`. The first wave may unlock only dependency-free cluster or standalone_module nodes, never a module inside a cluster before the cluster contract exists.",
    "For every cluster and standalone_module node, include `contractSeeds`. These are parent-owned boundaries for lower agents: consumer, required inputs, required outputs, statuses/errors, blocking questions, and for clusters the required owned modules. Lower agents may refine these seeds but must not invent a different boundary.",
    "```json",
    JSON.stringify(
      {
        schema: "codeai-development-order-plan-v2",
        leadProductPartId: params.leadPartId,
        productPartLeadershipOrder: params.productPartLeadershipOrder,
        requiredBriefs,
        nodes: [
          {
            id: `cluster:${params.leadPartId}/existing-cluster-id`,
            kind: "cluster",
            partId: params.leadPartId,
            clusterId: "existing-cluster-id",
            dependsOn: [],
            expectedArtifacts: [
              "ClusterSpecification.draft.md",
              "ClusterFacadeContract.draft.md",
              "ClusterSpecification.draft.json",
              "ClusterFacadeContract.draft.json",
            ],
          },
          {
            id: `module:${params.leadPartId}/existing-cluster-id/existing-module-id`,
            kind: "module",
            partId: params.leadPartId,
            clusterId: "existing-cluster-id",
            moduleId: "existing-module-id",
            dependsOn: [`cluster:${params.leadPartId}/existing-cluster-id`],
            expectedArtifacts: ["ModuleSpecification.draft.md"],
          },
          {
            id: `standalone-module:${params.leadPartId}/existing-standalone-module-id`,
            kind: "standalone_module",
            partId: params.leadPartId,
            moduleId: "existing-standalone-module-id",
            dependsOn: [],
            expectedArtifacts: ["ModuleSpecification.draft.md"],
          },
        ],
        contractSeeds: [
          {
            nodeId: `cluster:${params.leadPartId}/existing-cluster-id`,
            consumer: "dependent-product-part-or-shell",
            requiredInputs: ["parent-defined input context"],
            requiredOutputs: ["parent-defined normalized result"],
            requiredStatuses: ["success", "empty", "error"],
            requiredOwnedModules: ["existing-module-id"],
            blockingQuestions: [],
          },
          {
            nodeId: `standalone-module:${params.leadPartId}/existing-standalone-module-id`,
            consumer: "dependent-product-part-or-shell",
            requiredInputs: ["parent-defined input context"],
            requiredOutputs: ["parent-defined standalone module result"],
            requiredStatuses: ["success", "error"],
            blockingQuestions: [],
          },
        ],
        waves: [
          {
            id: "wave-1-cluster-contracts",
            unlockNodeIds: [`cluster:${params.leadPartId}/existing-cluster-id`],
            parallelGroup: "A",
            gate: "lead_product_part_coordination_review",
          },
        ],
        lockedNodes: [
          {
            nodeId: `module:${params.leadPartId}/existing-cluster-id/existing-module-id`,
            reason: "waiting_for_cluster_specification_and_facade_contract",
          },
        ],
      },
      null,
      2
    ),
    "```",
    "",
    "Do not leave placeholder text, sentinel values, or invalid JSON. If a critical dependency is unknowable from available artifacts, write the best conservative order and record the assumption explicitly.",
    "",
    "Expected commit message after the artifacts are ready: `docs: update lead development order plan`.",
  ].join("\n");
};

export const resolveLeadOrderPlanAssignment = async (params: {
  readonly leadPartId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<LeadOrderPlanAssignment> => {
  const indexMarkdown =
    (await readOptionalFile(
      params.workspaceRoot,
      createDiagramIndexPath(params.workspaceSlug)
    )) ?? "";
  const plannedPartIds = collectProductPartIds(indexMarkdown);
  const order = readLeadershipOrder(
    indexMarkdown,
    plannedPartIds.length > 0 ? plannedPartIds : [params.leadPartId],
    params.leadPartId
  );
  const briefs = await resolveBriefInputs({
    partIds: order,
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
  });
  if (briefs.missingPartIds.length > 0) {
    return {
      blockedMessage: createBlockedMessage({
        accepted: briefs.accepted,
        leadPartId: params.leadPartId,
        missingPartIds: briefs.missingPartIds,
      }),
      missingPartIds: briefs.missingPartIds,
      ready: false,
    };
  }
  return {
    briefInputs: briefs.accepted,
    prompt: createPrompt({
      briefInputs: briefs.accepted,
      leadPartId: params.leadPartId,
      productPartLeadershipOrder: order,
      workspaceSlug: params.workspaceSlug,
    }),
    ready: true,
  };
};

export const readLeadProductPartId = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<string | null> => {
  const indexText = await readOptionalFile(
    params.workspaceRoot,
    createDiagramIndexPath(params.workspaceSlug)
  );
  return indexText?.match(LEAD_PRODUCT_PART_RE)?.[1] ?? null;
};

export const prepareLeadOrderPlanDispatch = async (params: {
  readonly content: string;
  readonly leadPartId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<{
  readonly content: string;
  readonly planPath: string;
  readonly sessionId: string;
  readonly workspaceRoot: string;
} | null> => {
  const decision = await readOptionalJsonRecord(
    params.workspaceRoot,
    createManagedDecisionPath({
      partId: params.leadPartId,
      workspaceSlug: params.workspaceSlug,
    })
  );
  const sessionId = decision?.sessionId;
  if (!(typeof sessionId === "string" && sessionId.trim())) {
    return null;
  }
  const planWorkspaceRoot =
    typeof decision?.worktreePath === "string" && decision.worktreePath.trim()
      ? decision.worktreePath.trim()
      : params.workspaceRoot;
  const planPath = createPlanPath(params.leadPartId);
  const planText = await readOptionalFile(planWorkspaceRoot, planPath);
  if (!planText) {
    return null;
  }
  await writeText(
    planWorkspaceRoot,
    planPath,
    markOrderPlanTaskInProgress(planText, params.leadPartId)
  );
  await new WorkflowBoundaryGit().commit({
    commitMessage: "chore: advance managed workflow ledger",
    paths: [planPath],
    workspaceRoot: planWorkspaceRoot,
  });
  return {
    content: params.content,
    planPath,
    sessionId: sessionId.trim(),
    workspaceRoot: planWorkspaceRoot,
  };
};
