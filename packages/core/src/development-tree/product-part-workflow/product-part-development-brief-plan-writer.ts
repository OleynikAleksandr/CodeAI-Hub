import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DevelopmentTreeDetectedNode } from "../node-bootstrap/development-tree-node-detector";

export type ProductPartDevelopmentBriefPlanWriteAction =
  | "created"
  | "unchanged";

export interface ProductPartDevelopmentBriefPlanWriterRequest {
  readonly leadProductPartId?: string | null;
  readonly node: DevelopmentTreeDetectedNode;
  readonly productPartLeadershipOrder?: readonly string[];
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface ProductPartDevelopmentBriefPlanWriteResult {
  readonly absolutePath: string;
  readonly action: ProductPartDevelopmentBriefPlanWriteAction;
  readonly isLeadPart: boolean;
  readonly node: DevelopmentTreeDetectedNode;
  readonly relativePath: string;
}

const PLAN_STATE_START = "<!-- codeai-plan-state:start -->";
const PLAN_STATE_END = "<!-- codeai-plan-state:end -->";
const BRIEF_DRAFT_FILE = "ProductPartDevelopmentBrief.draft.md";
const DEVELOPMENT_ORDER_PLAN_FILE = "DevelopmentOrderPlan.draft.md";
const DEVELOPMENT_ORDER_PLAN_JSON_FILE = "DevelopmentOrderPlan.draft.json";

const readExistingFile = async (absolutePath: string): Promise<string | null> =>
  readFile(absolutePath, "utf8").catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  });

const createPlanPaths = (params: {
  readonly partId: string;
  readonly workspaceRoot: string;
}): { readonly absolutePath: string; readonly relativePath: string } => {
  const relativePath = path.posix.join(
    "doc",
    "TODO",
    "stages",
    "development-tree",
    "product-parts",
    params.partId,
    "todo-plan.md"
  );
  return {
    absolutePath: path.join(params.workspaceRoot, relativePath),
    relativePath,
  };
};

const createTaskPrefix = (partId: string): string =>
  `development-tree.product-part.${partId}`;

const createBriefArtifactPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/${BRIEF_DRAFT_FILE}`;

const createOrderPlanArtifactPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/${DEVELOPMENT_ORDER_PLAN_FILE}`;

const createOrderPlanJsonPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/${DEVELOPMENT_ORDER_PLAN_JSON_FILE}`;

const createPlanState = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string => {
  const taskPrefix = createTaskPrefix(params.partId);
  return JSON.stringify(
    {
      schema: "codeai-plan-v1",
      executionScopeStatus: "ACTIVE",
      planId: `development-tree-product-part-${params.partId}`,
      branch: "main",
      baseHead: "TBD",
      lastRecordedCommit: "TBD",
      planningSource: `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts/${params.partId}.md`,
      currentTaskId: `${taskPrefix}.phase1.brief.task1`,
      expectedCommitMessage: `docs: update ${params.partId} product part development brief`,
      debt: null,
    },
    null,
    2
  );
};

const createLeadershipLines = (params: {
  readonly isLeadPart: boolean;
  readonly leadProductPartId?: string | null;
  readonly productPartLeadershipOrder?: readonly string[];
}): string[] => [
  "- Product Part workflow: Product Part Development Brief first.",
  `- Lead Product Part ID: ${params.leadProductPartId ?? "not provided"}.`,
  `- This Product Part is lead: ${params.isLeadPart ? "yes" : "no"}.`,
  `- Product Part leadership order: ${
    params.productPartLeadershipOrder?.length
      ? params.productPartLeadershipOrder.join(", ")
      : "not provided"
  }.`,
  "- Cluster and Module agents remain locked until a later verified-main downstream phase.",
  "- If critical information is missing, the Product Part agent asks the user in its own session before finalizing the brief.",
];

const createLeadOrderPlanPhases = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string[] => {
  const taskPrefix = createTaskPrefix(params.partId);
  const orderPlanPath = createOrderPlanArtifactPath(params);
  const orderPlanJsonPath = createOrderPlanJsonPath(params);
  return [
    "",
    "## Phase 3 - Lead Development Order Plan Draft",
    "",
    "### Stream: Lead Coordination",
    "",
    `5. [TODO] \`${taskPrefix}.phase3.order-plan.task1\` After every Product Part Development Brief is accepted, the lead Product Part agent drafts the Core-readable Development Order Plan and JSON companion (scope: \`${orderPlanPath}, ${orderPlanJsonPath}\`; expected commit: \`docs: update lead development order plan\`).`,
    "6. [TODO] Git Commit: `docs: update lead development order plan` (hash: TBD)",
    "",
    "## Phase 4 - Lead Development Order Plan User Review",
    "",
    "### Stream: User-Led Review",
    "",
    `7. [TODO] \`${taskPrefix}.phase4.order-plan-review.task1\` User reviews the Development Order Plan before Core checkpoints the accepted Product Part planning state back to main (scope: user workflow; expected commit: \`docs: accept lead development order plan\`).`,
    "8. [TODO] Git Commit: `docs: accept lead development order plan` (hash: TBD)",
  ];
};

const createReturnPhase = (params: {
  readonly itemNumber: number;
  readonly partId: string;
}): string[] => [
  "",
  "## Phase Return - User Return And Revisions",
  "",
  "### Stream: User Return And Revisions",
  "",
  `${params.itemNumber}. [TODO] \`${createTaskPrefix(params.partId)}.phase-return.user-return.task1\` Product Part workflow is paused in an accepted state; user may return later with corrections or clarifications (scope: user workflow; expected commit: none).`,
];

const renderPlan = (params: {
  readonly isLeadPart: boolean;
  readonly leadProductPartId?: string | null;
  readonly node: DevelopmentTreeDetectedNode;
  readonly productPartLeadershipOrder?: readonly string[];
  readonly workspaceSlug: string;
}): string => {
  const taskPrefix = createTaskPrefix(params.node.partId);
  const briefPath = createBriefArtifactPath({
    partId: params.node.partId,
    workspaceSlug: params.workspaceSlug,
  });
  return [
    "# Product Part Development Brief Managed TODO Plan",
    "",
    PLAN_STATE_START,
    "```json",
    createPlanState({
      partId: params.node.partId,
      workspaceSlug: params.workspaceSlug,
    }),
    "```",
    PLAN_STATE_END,
    "",
    "## Managed Context",
    "",
    ...createLeadershipLines(params),
    "",
    "## Phase 1 - Product Part Development Brief Draft",
    "",
    "### Stream: Product Part Agent Work",
    "",
    `1. [IN_PROGRESS] \`${taskPrefix}.phase1.brief.task1\` Product Part agent creates the Product Part Development Brief in the materialized Product Part node (scope: \`${briefPath}\`; expected commit: \`docs: update ${params.node.partId} product part development brief\`).`,
    `2. [TODO] Git Commit: \`docs: update ${params.node.partId} product part development brief\` (hash: TBD)`,
    "",
    "## Phase 2 - Product Part Development Brief User Review",
    "",
    "### Stream: User-Led Review",
    "",
    `3. [TODO] \`${taskPrefix}.phase2.brief-review.task1\` User reviews, discusses, and accepts or rejects the Product Part Development Brief before downstream Cluster/Module work can use it (scope: user workflow; expected commit: \`docs: accept ${params.node.partId} product part development brief\`).`,
    `4. [TODO] Git Commit: \`docs: accept ${params.node.partId} product part development brief\` (hash: TBD)`,
    ...(params.isLeadPart
      ? createLeadOrderPlanPhases({
          partId: params.node.partId,
          workspaceSlug: params.workspaceSlug,
        })
      : []),
    ...createReturnPhase({
      itemNumber: params.isLeadPart ? 9 : 5,
      partId: params.node.partId,
    }),
    "",
  ].join("\n");
};

export class ProductPartDevelopmentBriefPlanWriter {
  async writePlan(
    request: ProductPartDevelopmentBriefPlanWriterRequest
  ): Promise<ProductPartDevelopmentBriefPlanWriteResult | null> {
    if (request.node.kind !== "product_part") {
      return null;
    }

    const paths = createPlanPaths({
      partId: request.node.partId,
      workspaceRoot: request.workspaceRoot,
    });
    const isLeadPart = request.leadProductPartId === request.node.partId;
    const existing = await readExistingFile(paths.absolutePath);
    if (existing !== null) {
      return {
        ...paths,
        action: "unchanged",
        isLeadPart,
        node: request.node,
      };
    }

    await mkdir(path.dirname(paths.absolutePath), { recursive: true });
    await writeFile(
      paths.absolutePath,
      renderPlan({
        isLeadPart,
        leadProductPartId: request.leadProductPartId,
        node: request.node,
        productPartLeadershipOrder: request.productPartLeadershipOrder,
        workspaceSlug: request.workspaceSlug,
      }),
      "utf8"
    );
    return {
      ...paths,
      action: "created",
      isLeadPart,
      node: request.node,
    };
  }
}
