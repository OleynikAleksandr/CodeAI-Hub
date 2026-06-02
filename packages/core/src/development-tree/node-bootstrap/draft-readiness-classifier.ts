import type {
  DevelopmentTreeDraftReadiness,
  DevelopmentTreeDraftReadinessFile,
  DevelopmentTreeDraftReadinessKind,
} from "../development-tree-types";

export interface DraftReadinessClassification {
  readonly files: readonly DevelopmentTreeDraftReadinessFile[];
  readonly readiness: DevelopmentTreeDraftReadiness;
}

export interface DraftReadinessClassifierRequest {
  readonly files: readonly {
    readonly content: string;
    readonly fileName: string;
  }[];
  readonly kind: DevelopmentTreeDraftReadinessKind;
}

const AGENT_FILL_BLOCK_PATTERN =
  /<!-- agent-fill -->([\s\S]*?)<!-- \/agent-fill -->/g;
const AGENT_FILL_CLOSE_PATTERN = /<!-- \/agent-fill -->/g;
const AGENT_FILL_OPEN_PATTERN = /<!-- agent-fill -->/g;
const AGENT_FILL_SENTINEL =
  "_CODEAI_AGENT_FILL_SENTINEL: replace this line with draft content._";
const TODO_PATTERN = /\bTODO\b/i;
const OUTDATED_TRUE_PATTERN = /^outdated:\s*true\s*$/im;
const ORPHANED_TRUE_PATTERN = /^orphaned:\s*true\s*$/im;

const REQUIRED_FILES = {
  cluster: ["ClusterDescription.draft.md", "ClusterFacadeContract.draft.md"],
  module: ["ModuleSpec.draft.md", "ModuleFacadeContract.draft.md"],
  product_part: ["ProductPartDevelopmentBrief.draft.md"],
} as const satisfies Record<
  DevelopmentTreeDraftReadinessKind,
  readonly string[]
>;

const resolveFileReadiness = (params: {
  readonly filledBlockCount: number;
  readonly hasBlockingFlag: boolean;
  readonly hasMarkerMismatch: boolean;
  readonly hasTodo: boolean;
  readonly requiredBlockCount: number;
}): DevelopmentTreeDraftReadiness => {
  const hasMissingAgentFillContent =
    params.requiredBlockCount > 0 &&
    params.filledBlockCount < params.requiredBlockCount;
  if (
    !(
      params.hasBlockingFlag ||
      params.hasMarkerMismatch ||
      params.hasTodo ||
      hasMissingAgentFillContent
    )
  ) {
    return "ready";
  }
  if (
    params.filledBlockCount === 0 &&
    !params.hasBlockingFlag &&
    !params.hasMarkerMismatch &&
    !params.hasTodo
  ) {
    return "idle";
  }
  return "in_progress";
};

const classifyFile = (file: {
  readonly content: string;
  readonly fileName: string;
}): DevelopmentTreeDraftReadinessFile => {
  const blocks = Array.from(file.content.matchAll(AGENT_FILL_BLOCK_PATTERN));
  const filledBlockCount = blocks.filter((block) => {
    const normalizedContent = (block[1] ?? "").trim();
    return (
      normalizedContent.length > 0 && normalizedContent !== AGENT_FILL_SENTINEL
    );
  }).length;
  const hasBlockingFlag =
    OUTDATED_TRUE_PATTERN.test(file.content) ||
    ORPHANED_TRUE_PATTERN.test(file.content);
  const openMarkerCount = (file.content.match(AGENT_FILL_OPEN_PATTERN) ?? [])
    .length;
  const closeMarkerCount = (file.content.match(AGENT_FILL_CLOSE_PATTERN) ?? [])
    .length;
  const hasTodo = TODO_PATTERN.test(file.content);
  const requiredBlockCount = blocks.length;
  const readiness = resolveFileReadiness({
    filledBlockCount,
    hasBlockingFlag,
    hasMarkerMismatch:
      openMarkerCount !== closeMarkerCount || blocks.length !== openMarkerCount,
    hasTodo,
    requiredBlockCount,
  });
  return {
    fileName: file.fileName,
    filledAgentFillSections: filledBlockCount,
    readiness,
    requiredAgentFillSections: requiredBlockCount,
  };
};

const aggregateReadiness = (
  files: readonly DevelopmentTreeDraftReadinessFile[],
  requiredFileNames: readonly string[]
): DevelopmentTreeDraftReadiness => {
  if (
    files.length === 0 ||
    requiredFileNames.some(
      (fileName) => !files.some((file) => file.fileName === fileName)
    )
  ) {
    return "idle";
  }
  if (files.every((file) => file.readiness === "ready")) {
    return "ready";
  }
  if (files.some((file) => file.readiness === "in_progress")) {
    return "in_progress";
  }
  return "idle";
};

export class DraftReadinessClassifier {
  classify(
    request: DraftReadinessClassifierRequest
  ): DraftReadinessClassification {
    const files = request.files.map(classifyFile);
    return {
      files,
      readiness: aggregateReadiness(files, REQUIRED_FILES[request.kind]),
    };
  }
}
