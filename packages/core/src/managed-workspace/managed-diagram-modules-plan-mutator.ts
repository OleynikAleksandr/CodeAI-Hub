const STATE_BLOCK_RE =
  /<!-- codeai-plan-state:start -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- codeai-plan-state:end -->/u;
const REPAIR_TASK_RE = /`diagram-modules\.[^`]+\.repair(\d+)\.task1`/gu;
const STATUS_TOKEN_RE = /\[(TODO|IN_PROGRESS|DONE|BLOCKED|PENDING)\]/u;
const TASK_NUMBER_PREFIX_RE = /^\d+\. /u;
const DONE_PRODUCT_PART_TASK_RE =
  /^(\d+)\. \[DONE\] `diagram-modules\.product-part\.([a-z0-9]+(?:-[a-z0-9]+)*)`/u;
const PRODUCT_PART_FILE_RE = /diagram_modules\/product-parts\/([^/]+)\.md$/u;

export interface DiagramModulesProductPartInsertion {
  readonly inserted: boolean;
  readonly lines: readonly string[];
  readonly nextPartId: string | null;
}

export interface DiagramModulesRepairInjection {
  readonly nextCommitMessage: string;
  readonly nextCurrentTaskId: string;
  readonly nextPlanText: string;
  readonly repairNumber: number;
}

export interface DiagramModulesRepairInjectionParams {
  readonly diagnostics: readonly string[];
  readonly partId?: string | null;
  readonly planText: string;
  readonly targetArtifactPath: string;
  readonly targetKind: "index" | "product_part";
  readonly validator: string;
}

const replaceStatus = (line: string, status: string): string =>
  line.replace(STATUS_TOKEN_RE, `[${status}]`);

const taskNumberBefore = (
  lines: readonly string[],
  lineIndex: number
): number =>
  lines
    .slice(0, lineIndex + 1)
    .filter((line) => TASK_NUMBER_PREFIX_RE.test(line)).length + 1;

const formatTaskLine = (
  number: number,
  taskId: string,
  status: string,
  summary: string,
  scope: string,
  message: string
): string =>
  `${number}. [${status}] \`${taskId}\` ${summary} (scope: \`${scope}\`; expected commit: \`${message}\`).`;

const formatCommitLine = (number: number, message: string): string =>
  `${number}. [TODO] Git Commit: \`${message}\` (hash: TBD)`;

const readCompletedPartIds = (
  lines: readonly string[],
  changedFiles: readonly string[]
): readonly string[] => {
  const fromPlan = lines
    .map((line) => DONE_PRODUCT_PART_TASK_RE.exec(line)?.[2])
    .filter((entry): entry is string => Boolean(entry));
  const fromCommit = changedFiles
    .map((file) => PRODUCT_PART_FILE_RE.exec(file)?.[1])
    .filter((entry): entry is string => Boolean(entry));
  return [...new Set([...fromPlan, ...fromCommit])];
};

export const insertNextDiagramModulesProductPartTaskPair = (params: {
  readonly changedFiles: readonly string[];
  readonly commitLineIndex: number;
  readonly lines: readonly string[];
  readonly productPartIds: readonly string[];
}): DiagramModulesProductPartInsertion => {
  const completed = readCompletedPartIds(params.lines, params.changedFiles);
  const nextPartId =
    params.productPartIds.find((partId) => !completed.includes(partId)) ?? null;
  if (!nextPartId) {
    return { inserted: false, lines: params.lines, nextPartId };
  }
  if (
    params.lines.some((line) =>
      line.includes(`diagram-modules.product-part.${nextPartId}`)
    )
  ) {
    return { inserted: false, lines: params.lines, nextPartId };
  }
  const taskNumber = taskNumberBefore(params.lines, params.commitLineIndex);
  const message = `docs: update diagram modules product part ${nextPartId}`;
  const inserted = [
    formatTaskLine(
      taskNumber,
      `diagram-modules.product-part.${nextPartId}`,
      "TODO",
      `Materialize only Diagram Modules Product Part "${nextPartId}" and stop for Core acceptance`,
      `.codeai-hub/**/diagram_modules/product-parts/${nextPartId}.md`,
      message
    ),
    formatCommitLine(taskNumber + 1, message),
  ];
  const lines = [...params.lines];
  lines.splice(params.commitLineIndex + 1, 0, ...inserted);
  return { inserted: true, lines, nextPartId };
};

const findCurrentTaskLineIndex = (
  lines: readonly string[],
  taskId: string
): number => lines.findIndex((line) => line.includes(`\`${taskId}\``));

const findPairedCommitLineIndex = (
  lines: readonly string[],
  taskLineIndex: number
): number =>
  lines.findIndex(
    (line, index) => index > taskLineIndex && line.includes("Git Commit:")
  );

const readState = (planText: string): Record<string, unknown> | null => {
  const match = STATE_BLOCK_RE.exec(planText);
  if (!match) {
    return null;
  }
  try {
    return JSON.parse(match[1] ?? "{}") as Record<string, unknown>;
  } catch {
    return null;
  }
};

const replaceState = (
  planText: string,
  state: Record<string, unknown>
): string =>
  planText.replace(
    STATE_BLOCK_RE,
    `<!-- codeai-plan-state:start -->\n\`\`\`json\n${JSON.stringify(
      state,
      null,
      2
    )}\n\`\`\`\n<!-- codeai-plan-state:end -->`
  );

const readCurrentTaskId = (state: Record<string, unknown>): string | null =>
  typeof state.currentTaskId === "string" && state.currentTaskId.trim()
    ? state.currentTaskId.trim()
    : null;

const countExistingRepairs = (planText: string): number => {
  let maxRepair = 0;
  for (const match of planText.matchAll(REPAIR_TASK_RE)) {
    const value = Number.parseInt(match[1] ?? "", 10);
    if (Number.isFinite(value) && value > maxRepair) {
      maxRepair = value;
    }
  }
  return maxRepair;
};

const resolveRepairTarget = (
  params: DiagramModulesRepairInjectionParams
): {
  readonly commitMessage: string;
  readonly scope: string;
  readonly taskId: string;
} => {
  const repairNumber = countExistingRepairs(params.planText) + 1;
  if (params.targetKind === "index") {
    return {
      commitMessage: `docs: repair diagram modules product part index attempt ${repairNumber}`,
      scope:
        ".codeai-hub/**/diagram_modules/product-parts.index.md, .codeai-hub/**/workflow/revisions/diagram-modules/attempts/**",
      taskId: `diagram-modules.index.repair${repairNumber}.task1`,
    };
  }
  const partId = params.partId?.trim();
  if (!partId) {
    throw new Error("Diagram Modules product-part repair requires partId.");
  }
  return {
    commitMessage: `docs: repair diagram modules product part ${partId} attempt ${repairNumber}`,
    scope: `.codeai-hub/**/diagram_modules/product-parts/${partId}.md, .codeai-hub/**/workflow/revisions/diagram-modules/attempts/**`,
    taskId: `diagram-modules.product-part.${partId}.repair${repairNumber}.task1`,
  };
};

const appendRepairMetadata = (
  summary: string,
  params: DiagramModulesRepairInjectionParams
): string => {
  const diagnostics = params.diagnostics.length
    ? params.diagnostics.join("; ")
    : "no diagnostics captured";
  return `${summary}; target: \`${params.targetArtifactPath}\`; validator: \`${params.validator}\`; diagnostics: ${diagnostics}`;
};

export const injectDiagramModulesRepairTaskPair = (
  params: DiagramModulesRepairInjectionParams
): DiagramModulesRepairInjection | null => {
  const state = readState(params.planText);
  if (!state) {
    return null;
  }
  const currentTaskId = readCurrentTaskId(state);
  if (!currentTaskId) {
    return null;
  }
  const lines = params.planText.split("\n");
  const currentTaskLineIndex = findCurrentTaskLineIndex(lines, currentTaskId);
  if (currentTaskLineIndex < 0) {
    return null;
  }
  const pairedCommitLineIndex = findPairedCommitLineIndex(
    lines,
    currentTaskLineIndex
  );
  if (pairedCommitLineIndex < 0) {
    return null;
  }
  const repair = resolveRepairTarget(params);
  const repairNumber = countExistingRepairs(params.planText) + 1;
  const taskNumber = taskNumberBefore(lines, pairedCommitLineIndex);
  const summary = appendRepairMetadata(
    "Core rejected the previous Diagram Modules attempt; repair only the named artifact and stop for Core acceptance",
    params
  );
  const nextLines = [...lines];
  nextLines[currentTaskLineIndex] = replaceStatus(
    nextLines[currentTaskLineIndex] ?? "",
    "BLOCKED"
  );
  nextLines[pairedCommitLineIndex] = `${replaceStatus(
    nextLines[pairedCommitLineIndex] ?? "",
    "BLOCKED"
  ).replace("hash: TBD", "hash: not-created-core-rejected-before-commit")}`;
  nextLines.splice(
    pairedCommitLineIndex + 1,
    0,
    formatTaskLine(
      taskNumber,
      repair.taskId,
      "IN_PROGRESS",
      summary,
      repair.scope,
      repair.commitMessage
    ),
    formatCommitLine(taskNumber + 1, repair.commitMessage)
  );
  const nextPlanWithLines = nextLines.join("\n");
  const nextPlanText = replaceState(nextPlanWithLines, {
    ...state,
    currentTaskId: repair.taskId,
    expectedCommitMessage: repair.commitMessage,
  });
  return {
    nextCommitMessage: repair.commitMessage,
    nextCurrentTaskId: repair.taskId,
    nextPlanText,
    repairNumber,
  };
};

export const createDiagramModulesPlanMutatorShimSource = (): string => `
const collectProductPartIdsFromIndex = (files) => {
  const indexFile = files.find((file) => file.includes("/diagram_modules/product-parts.index.md")) ?? files.map((file) => file.replace(/\\/diagram_modules\\/product-parts\\/[^/]+\\.md$/u, "/diagram_modules/product-parts.index.md")).find((file) => file.includes("/diagram_modules/product-parts.index.md"));
  if (!indexFile || !existsSync(indexFile)) { return []; }
  return [...readFileSync(indexFile, "utf8").matchAll(PRODUCT_PART_DECLARATION_RE)].map((match) => match[1]?.trim()).filter((id, index, ids) => id && id !== "part-id" && ids.indexOf(id) === index);
};
const readCurrentTaskLineBeforeCommit = (lines, commitLineIndex) =>
  [...lines.slice(0, commitLineIndex)].reverse().find((line) => line.includes("diagram-modules.")) ?? "";
const isDiagramModulesRepairTaskLine = (line) => line.includes("diagram-modules.") && line.includes(".repair");
const committedProductPartIds = (lines, files, commitLineIndex) => {
  const fromPlan = lines.map((line) => /^\\d+\\. \\[DONE\\] \`diagram-modules\\.product-part\\.([a-z0-9]+(?:-[a-z0-9]+)*)\`/u.exec(line)?.[1]).filter(Boolean);
  const currentTaskLine = readCurrentTaskLineBeforeCommit(lines, commitLineIndex);
  const fromCommit = isDiagramModulesRepairTaskLine(currentTaskLine) ? [] : files.map((file) => /diagram_modules\\/product-parts\\/([^/]+)\\.md$/u.exec(file)?.[1]).filter(Boolean);
  return [...new Set([...fromPlan, ...fromCommit])];
};
const insertDiagramModulesProductPartTasks = (lines, commitLineIndex, files) => {
  const ids = collectProductPartIdsFromIndex(files);
  if (ids.length === 0) { return; }
  const completed = committedProductPartIds(lines, files, commitLineIndex);
  const id = ids.find((candidate) => !completed.includes(candidate));
  if (!id) { insertDiagramModulesUserReviewTask(lines, commitLineIndex); return; }
  if (lines.some((line) => line.includes(\`diagram-modules.product-part.\${id}\`))) { return; }
  const taskNumber = lines.slice(0, commitLineIndex + 1).filter((line) => /^\\d+\\. /u.test(line)).length + 1, message = \`docs: update diagram modules product part \${id}\`;
  const inserted = [formatNewTaskLine(taskNumber, \`diagram-modules.product-part.\${id}\`, "TODO", \`Materialize only Diagram Modules Product Part "\${id}" and stop for Core acceptance\`, \`.codeai-hub/**/diagram_modules/product-parts/\${id}.md\`, message), \`\${taskNumber + 1}. [TODO] Git Commit: \\\`\${message}\\\` (hash: TBD)\`];
  lines.splice(commitLineIndex + 1, 0, ...inserted);
};
`;
