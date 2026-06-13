import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { WorkflowBoundaryGit } from "../../workflow/boundary/workflow-boundary-git";

interface ManagedPlanState {
  readonly currentTaskId: string | null;
  readonly expectedCommitMessage: string | null;
  readonly [key: string]: unknown;
}

export interface LeadBriefReviewDeferral {
  readonly deferred: boolean;
  readonly leadPartId: string | null;
  readonly missingPartIds: readonly string[];
}

export interface PromotedLeadBriefReview {
  readonly content: string;
  readonly leadPartId: string;
  readonly promoted: boolean;
  readonly sessionId: string;
}

const FENCED_JSON_END_RE = /\s*```$/u;
const FENCED_JSON_START_RE = /^```json\s*/u;
const LEAD_PRODUCT_PART_RE =
  /(?:^|\n)\s*(?:[-*]\s*)?(?:leadProductPartId|Lead Product Part(?: ID)?)\s*[:|]\s*`?([a-z0-9]+(?:-[a-z0-9]+)*)`?/iu;
const PLAN_END = "<!-- codeai-plan-state:end -->";
const PLAN_START = "<!-- codeai-plan-state:start -->";
const PRODUCT_PART_ID_IN_TEXT_RE = /`([a-z0-9]+(?:-[a-z0-9]+)*)`/gu;
const PRODUCT_PART_ID_RE =
  /^###\s+Product Part:\s+([a-z0-9]+(?:-[a-z0-9]+)*)\s*$/gm;
const PRODUCT_PART_ORDER_RE =
  /(?:^|\n)\s*(?:[-*]\s*)?(?:productPartLeadershipOrder|Product Part Leadership Order)\s*[:|]\s*(.+)/iu;
const WORKTREES_SUFFIX = ".worktrees";

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createBriefReviewCommitMessage = (partId: string): string =>
  `docs: accept ${partId} product part development brief`;

const createBriefReviewTaskId = (partId: string): string =>
  `development-tree.product-part.${partId}.phase2.brief-review.task1`;

const createDiagramIndexPath = (workspaceSlug: string): string =>
  `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`;

const createManagedDecisionPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/workflow/managed/development-tree-product-parts/${params.partId}.json`;

const createPlanPath = (partId: string): string =>
  `doc/TODO/stages/development-tree/product-parts/${partId}/todo-plan.md`;

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

const resolveMainWorkspaceRoot = (laneWorkspaceRoot: string): string | null => {
  const resolved = path.resolve(laneWorkspaceRoot);
  const segments = resolved.split(path.sep);
  const worktreesIndex = segments.findIndex((segment) =>
    segment.endsWith(WORKTREES_SUFFIX)
  );
  if (worktreesIndex < 0) {
    return null;
  }
  const mainSegment = segments[worktreesIndex]?.slice(
    0,
    -WORKTREES_SUFFIX.length
  );
  return mainSegment
    ? path.join(path.sep, ...segments.slice(1, worktreesIndex), mainSegment)
    : null;
};

const readProductPartIndex = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<{
  readonly leadPartId: string | null;
  readonly partIds: string[];
}> => {
  const indexText =
    (await readOptionalFile(
      params.workspaceRoot,
      createDiagramIndexPath(params.workspaceSlug)
    )) ?? "";
  const leadPartId = indexText.match(LEAD_PRODUCT_PART_RE)?.[1] ?? null;
  const orderedLine = indexText.match(PRODUCT_PART_ORDER_RE)?.[1] ?? "";
  const orderedPartIds = [...orderedLine.matchAll(PRODUCT_PART_ID_IN_TEXT_RE)]
    .map((match) => match[1])
    .filter((partId): partId is string => Boolean(partId));
  const headingPartIds = [...indexText.matchAll(PRODUCT_PART_ID_RE)]
    .map((match) => match[1])
    .filter((partId): partId is string => Boolean(partId));
  return {
    leadPartId,
    partIds: [...orderedPartIds, ...headingPartIds].filter(
      (partId, index, all) => all.indexOf(partId) === index
    ),
  };
};

const isAcceptedBrief = (decision: Record<string, unknown> | null): boolean =>
  decision?.schema === "codeai-product-part-development-brief-managed-v1" &&
  decision.reviewState === "accepted";

const resolveMissingSecondaryPartIds = async (params: {
  readonly leadPartId: string;
  readonly partIds: readonly string[];
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<readonly string[]> => {
  const missing: string[] = [];
  for (const partId of params.partIds) {
    if (partId === params.leadPartId) {
      continue;
    }
    const decision = await readOptionalJsonRecord(
      params.workspaceRoot,
      createManagedDecisionPath({ partId, workspaceSlug: params.workspaceSlug })
    );
    if (!isAcceptedBrief(decision)) {
      missing.push(partId);
    }
  }
  return missing;
};

export const resolveLeadBriefReviewDeferral = async (params: {
  readonly partId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<LeadBriefReviewDeferral> => {
  const coordinationWorkspaceRoot =
    resolveMainWorkspaceRoot(params.workspaceRoot) ?? params.workspaceRoot;
  const productParts = await readProductPartIndex({
    workspaceRoot: coordinationWorkspaceRoot,
    workspaceSlug: params.workspaceSlug,
  });
  const leadPartId = productParts.leadPartId;
  if (!(leadPartId && leadPartId === params.partId)) {
    return { deferred: false, leadPartId, missingPartIds: [] };
  }
  const missingPartIds = await resolveMissingSecondaryPartIds({
    leadPartId,
    partIds:
      productParts.partIds.length > 0 ? productParts.partIds : [leadPartId],
    workspaceRoot: coordinationWorkspaceRoot,
    workspaceSlug: params.workspaceSlug,
  });
  return {
    deferred: missingPartIds.length > 0,
    leadPartId,
    missingPartIds,
  };
};

export const markLeadBriefReviewDeferred = (
  content: string,
  partId: string
): string =>
  content.replace(
    new RegExp(
      `^(\\d+\\. \\[)(?:TODO|IN_PROGRESS|BLOCKED)(\\] \`${escapeRegExp(
        createBriefReviewTaskId(partId)
      )}\` .*)$`,
      "mu"
    ),
    "$1BLOCKED$2"
  );

export const createDeferredReviewMessage = (params: {
  readonly commitHash: string;
  readonly missingPartIds: readonly string[];
  readonly partId: string;
}): { readonly content: string; readonly tag: string } => ({
  content: [
    `Core: lead Product Part \`${params.partId}\` Development Brief принят и зафиксирован.`,
    `Commit: \`${params.commitHash}\`.`,
    "Пользовательская проверка lead Product Part пока не открыта.",
    "Причина: Core ждёт принятие Development Brief для secondary Product Part.",
    "",
    `Missing secondary briefs: ${params.missingPartIds.map((partId) => `\`${partId}\``).join(", ")}.`,
    "",
    "Core откроет кнопку подтверждения lead Product Part после принятия этих briefs.",
  ].join("\n"),
  tag: "managed-workflow-validation",
});

const parseStateBlock = (content: string): ManagedPlanState | null => {
  const rawBlock = content.split(PLAN_START)[1]?.split(PLAN_END)[0];
  const json = rawBlock
    ?.trim()
    .replace(FENCED_JSON_START_RE, "")
    .replace(FENCED_JSON_END_RE, "")
    .trim();
  return json ? (JSON.parse(json) as ManagedPlanState) : null;
};

const replaceStateBlock = (
  content: string,
  state: ManagedPlanState
): string => {
  const blockPattern = new RegExp(
    `${escapeRegExp(PLAN_START)}[\\s\\S]*?${escapeRegExp(PLAN_END)}`,
    "u"
  );
  return content.replace(
    blockPattern,
    `${PLAN_START}\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n${PLAN_END}`
  );
};

const markLeadBriefReviewInProgress = (
  content: string,
  partId: string
): string =>
  content.replace(
    new RegExp(
      `^(\\d+\\. \\[)(?:TODO|BLOCKED)(\\] \`${escapeRegExp(
        createBriefReviewTaskId(partId)
      )}\` .*)$`,
      "mu"
    ),
    "$1IN_PROGRESS$2"
  );

export const promoteDeferredLeadBriefReview = async (params: {
  readonly leadPartId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<PromotedLeadBriefReview | null> => {
  const deferral = await resolveLeadBriefReviewDeferral({
    partId: params.leadPartId,
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
  });
  if (deferral.deferred) {
    return null;
  }
  const decisionPath = createManagedDecisionPath({
    partId: params.leadPartId,
    workspaceSlug: params.workspaceSlug,
  });
  const mainDecision = await readOptionalJsonRecord(
    params.workspaceRoot,
    decisionPath
  );
  const sessionId =
    typeof mainDecision?.sessionId === "string" ? mainDecision.sessionId : null;
  const planWorkspaceRoot =
    typeof mainDecision?.worktreePath === "string" && mainDecision.worktreePath
      ? mainDecision.worktreePath
      : params.workspaceRoot;
  const planPath = createPlanPath(params.leadPartId);
  const planText = await readOptionalFile(planWorkspaceRoot, planPath);
  const planState = planText ? parseStateBlock(planText) : null;
  if (
    !(
      sessionId &&
      planText &&
      planState?.currentTaskId === createBriefReviewTaskId(params.leadPartId) &&
      !planState.expectedCommitMessage
    )
  ) {
    return null;
  }
  const nextPlanText = replaceStateBlock(
    markLeadBriefReviewInProgress(planText, params.leadPartId),
    {
      ...planState,
      expectedCommitMessage: createBriefReviewCommitMessage(params.leadPartId),
    }
  );
  const laneDecision =
    (await readOptionalJsonRecord(planWorkspaceRoot, decisionPath)) ??
    mainDecision ??
    {};
  await writeText(planWorkspaceRoot, planPath, nextPlanText);
  await writeText(
    planWorkspaceRoot,
    decisionPath,
    `${JSON.stringify(
      {
        ...laneDecision,
        partId: params.leadPartId,
        reviewState: "ready_for_review",
        schema: "codeai-product-part-development-brief-managed-v1",
        sessionId,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    )}\n`
  );
  await new WorkflowBoundaryGit().commit({
    commitMessage: "chore: advance managed workflow ledger",
    paths: [planPath, decisionPath],
    workspaceRoot: planWorkspaceRoot,
  });
  return {
    content: [
      `Core: lead Product Part \`${params.leadPartId}\` Development Brief теперь открыт для пользовательской проверки.`,
      "Причина: все secondary Product Part Development Brief приняты.",
      "Проверьте lead brief и нажмите `Подтверждаю`, если он готов к следующему managed assignment.",
    ].join("\n"),
    leadPartId: params.leadPartId,
    promoted: true,
    sessionId,
  };
};
