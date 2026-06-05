import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import { BUNDLED_TEMPLATE_SOURCES } from "../../templates/bundled-templates";
import {
  buildApplicationSkeletonContract,
  buildDescriptionContract,
  buildDiagramModulesContract,
  buildQualityGatesContract,
  buildVirtualSimulationContract,
} from "./idea-contract-service";

type WorkflowStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "application_skeleton"
  | "quality_gates";

interface WorkflowContractSnapshot {
  readonly paths: {
    readonly prompt: string;
    readonly template?: string;
  };
  readonly prompt: string;
  readonly template: string;
}

interface WorkflowSourceArtifact {
  readonly content: string;
  readonly label: string;
  readonly relativePath: string;
  readonly truncated?: boolean;
}

export interface CoreWorkflowPromptPack {
  readonly absolutePath: string;
  readonly artifactLanguage: string;
  readonly chatLanguage: string;
  readonly content: string;
  readonly inputPath: string;
  readonly promptPath: string;
  readonly relativePath: string;
  readonly templatePath?: string;
}

const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_ERROR = 500;
const HTTP_NOT_FOUND = 404;
const MAX_SOURCE_BYTES = 500_000;
const DEFAULT_ARTIFACT_LANGUAGE = "en";
const DEFAULT_CHAT_LANGUAGE = "en";
const LEGACY_SOURCE_LANGUAGE = "source";
const RUN_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const PRODUCT_PART_ID_RES = [
  /^###\s+Product Part:\s*([a-z0-9]+(?:-[a-z0-9]+)*)\s*$/gim,
  /^-\s*Id:\s*`?([^`\n]+)`?\s*$/gim,
] as const;
const CURRENT_DIR_PREFIX_RE = /^\.\//u;
const WINDOWS_PATH_SEPARATOR_RE = /\\/g;

const STAGE_FILES: Record<WorkflowStageId, string> = {
  description: "Final_Description.md",
  virtual_simulation: "virtual-simulation.md",
  diagram_modules: "product-parts.index.md",
  application_skeleton: "application-skeleton.md",
  quality_gates: "quality-gates-research.md",
};

const CONTRACT_BUILDERS: Record<
  WorkflowStageId,
  () => Promise<WorkflowContractSnapshot | null>
> = {
  description: buildDescriptionContract,
  virtual_simulation: buildVirtualSimulationContract,
  diagram_modules: buildDiagramModulesContract,
  application_skeleton: buildApplicationSkeletonContract,
  quality_gates: buildQualityGatesContract,
};

const PROMPT_TEMPLATE_IDS: Record<WorkflowStageId, string> = {
  description: "description-collector-prompt",
  virtual_simulation: "virtual-simulation-prompt",
  diagram_modules: "diagram-modules-prompt",
  application_skeleton: "application-skeleton-prompt",
  quality_gates: "quality-gates-prompt",
};

const PROMPT_APPENDIX_TEMPLATE_IDS: Partial<
  Record<WorkflowStageId, readonly string[]>
> = {
  diagram_modules: [
    "product-parts-index-template",
    "product-part-template",
    "diagram-modules-field-reference",
    "diagram-modules-merge-rules",
  ],
};

const normalizeLanguage = (
  value: string | undefined,
  fallback: string
): string => {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return fallback;
  }
  return normalized === LEGACY_SOURCE_LANGUAGE ? fallback : normalized;
};

const decodeBundledTemplate = (id: string): string | null => {
  const source = BUNDLED_TEMPLATE_SOURCES.find((entry) => entry.id === id);
  if (!source) {
    return null;
  }
  try {
    return Buffer.from(source.base64, "base64").toString("utf8").trimEnd();
  } catch {
    return null;
  }
};

const formatBundledAppendix = (id: string): string | null => {
  const content = decodeBundledTemplate(id);
  return content ? [`### ${id}`, "", content].join("\n") : null;
};

const buildBundledPrompt = (stage: WorkflowStageId): string | null => {
  const prompt = decodeBundledTemplate(PROMPT_TEMPLATE_IDS[stage]);
  if (!prompt) {
    return null;
  }
  const appendices = (PROMPT_APPENDIX_TEMPLATE_IDS[stage] ?? [])
    .map(formatBundledAppendix)
    .filter((entry): entry is string => Boolean(entry));
  return [prompt, ...appendices].join("\n\n");
};

const normalizeRelativePath = (value: string): string =>
  value
    .replace(WINDOWS_PATH_SEPARATOR_RE, "/")
    .replace(CURRENT_DIR_PREFIX_RE, "")
    .trim();

const joinWorkspacePath = (
  workspaceRoot: string,
  relativePath: string
): string => path.resolve(workspaceRoot, normalizeRelativePath(relativePath));

const resolveRunSegment = (
  stage: WorkflowStageId,
  runSlug?: string
): string => {
  if (stage === "description") {
    return "";
  }
  return runSlug && RUN_SLUG_RE.test(runSlug) ? `runs/${runSlug}/` : "";
};

const buildTargetPath = (params: {
  readonly runSlug?: string;
  readonly stage: WorkflowStageId;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): { readonly absolutePath: string; readonly relativePath: string } => {
  const relativePath = `.codeai-hub/${params.workspaceSlug}/${params.stage}/${resolveRunSegment(
    params.stage,
    params.runSlug
  )}${STAGE_FILES[params.stage]}`;
  return {
    absolutePath: joinWorkspacePath(params.workspaceRoot, relativePath),
    relativePath,
  };
};

const readSourceFile = async (
  workspaceRoot: string,
  relativePath: string
): Promise<{
  readonly content: string;
  readonly truncated: boolean;
} | null> => {
  const absolutePath = joinWorkspacePath(workspaceRoot, relativePath);
  const workspace = path.resolve(workspaceRoot);
  if (!absolutePath.startsWith(`${workspace}${path.sep}`)) {
    return null;
  }
  const fileStat = await stat(absolutePath).catch(() => null);
  if (!fileStat?.isFile()) {
    return null;
  }
  const content = await readFile(absolutePath, "utf8");
  return {
    content: content.slice(0, MAX_SOURCE_BYTES),
    truncated: Buffer.byteLength(content, "utf8") > MAX_SOURCE_BYTES,
  };
};

const readArtifact = async (params: {
  readonly label: string;
  readonly relativePath: string;
  readonly workspaceRoot: string;
}): Promise<WorkflowSourceArtifact | null> => {
  const file = await readSourceFile(params.workspaceRoot, params.relativePath);
  return file
    ? {
        content: file.content,
        label: params.label,
        relativePath: params.relativePath,
        truncated: file.truncated,
      }
    : null;
};

const buildPrimarySourceDescriptors = (params: {
  readonly stage: WorkflowStageId;
  readonly workspaceSlug: string;
}): readonly { readonly label: string; readonly relativePath: string }[] => {
  const root = `.codeai-hub/${params.workspaceSlug}`;
  switch (params.stage) {
    case "description":
      return [
        {
          label: "Questionnaire",
          relativePath: `${root}/description/questionnaire.md`,
        },
      ];
    case "virtual_simulation":
      return [
        {
          label: "Final_Description.md",
          relativePath: `${root}/description/Final_Description.md`,
        },
      ];
    case "diagram_modules":
      return [
        {
          label: "Final_Description.md",
          relativePath: `${root}/description/Final_Description.md`,
        },
        {
          label: "virtual-simulation.md",
          relativePath: `${root}/virtual_simulation/virtual-simulation.md`,
        },
      ];
    case "application_skeleton":
      return [
        {
          label: "Final_Description.md",
          relativePath: `${root}/description/Final_Description.md`,
        },
        {
          label: "virtual-simulation.md",
          relativePath: `${root}/virtual_simulation/virtual-simulation.md`,
        },
        {
          label: "product-parts.index.md",
          relativePath: `${root}/diagram_modules/product-parts.index.md`,
        },
      ];
    case "quality_gates":
      return [
        {
          label: "application-skeleton.md",
          relativePath: `${root}/application_skeleton/application-skeleton.md`,
        },
        {
          label: "application-skeleton-map.json",
          relativePath: `${root}/application_skeleton/application-skeleton-map.json`,
        },
      ];
    default:
      return [];
  }
};

const buildProductPartDescriptors = (params: {
  readonly productPartsIndexContent: string;
  readonly workspaceSlug: string;
}): readonly { readonly label: string; readonly relativePath: string }[] => {
  const seen = new Set<string>();
  const descriptors: { label: string; relativePath: string }[] = [];
  for (const pattern of PRODUCT_PART_ID_RES) {
    for (const match of params.productPartsIndexContent.matchAll(pattern)) {
      const partId = match[1]?.trim();
      if (!(partId && SLUG_RE.test(partId) && !seen.has(partId))) {
        continue;
      }
      seen.add(partId);
      descriptors.push({
        label: `Product Part: ${partId}`,
        relativePath: `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts/${partId}.md`,
      });
    }
  }
  return descriptors;
};

const readSourceArtifacts = async (params: {
  readonly stage: WorkflowStageId;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<readonly WorkflowSourceArtifact[]> => {
  const primary = await Promise.all(
    buildPrimarySourceDescriptors(params).map((descriptor) =>
      readArtifact({ ...descriptor, workspaceRoot: params.workspaceRoot })
    )
  );
  const sourceArtifacts = primary.filter(
    (artifact): artifact is WorkflowSourceArtifact => Boolean(artifact)
  );
  if (params.stage !== "application_skeleton") {
    return sourceArtifacts;
  }
  const productPartsIndex = sourceArtifacts.find(
    (artifact) => artifact.label === "product-parts.index.md"
  );
  if (!productPartsIndex) {
    return sourceArtifacts;
  }
  const parts = await Promise.all(
    buildProductPartDescriptors({
      productPartsIndexContent: productPartsIndex.content,
      workspaceSlug: params.workspaceSlug,
    }).map((descriptor) =>
      readArtifact({ ...descriptor, workspaceRoot: params.workspaceRoot })
    )
  );
  return [
    ...sourceArtifacts,
    ...parts.filter((artifact): artifact is WorkflowSourceArtifact =>
      Boolean(artifact)
    ),
  ];
};

const buildLanguageBlock = (params: {
  readonly artifactLanguage: string;
  readonly chatLanguage: string;
  readonly stage: WorkflowStageId;
}): string =>
  [
    "Workflow runtime language contract:",
    `- Chat language code: \`${params.chatLanguage}\` (from Settings > General > Reasoning).`,
    `- Use \`${params.chatLanguage}\` for brief user-facing chat updates and status replies.`,
    `- Artifact prose language code: \`${params.artifactLanguage}\` (from Settings > General > Artifacts for the User).`,
    `- Write user-facing prose inside created or edited artifacts in \`${params.artifactLanguage}\`.`,
    "- English internal instructions, examples, and templates are format-only; do not infer English output language from them.",
    "- Do not rewrite internal instructions, code identifiers, canonical headings, field names, ids, statuses, DSL markers, file names, or structural tokens to match either language.",
    params.stage === "diagram_modules"
      ? "- Keep Product Part / Cluster / Module names and titles, contract-bound DSL markers, headers, field names, ids, and staged status tokens in canonical English form."
      : null,
  ]
    .filter((entry): entry is string => Boolean(entry))
    .join("\n");

const buildSourceBlock = (
  sourceArtifacts: readonly WorkflowSourceArtifact[]
): string =>
  sourceArtifacts.length === 0
    ? [
        "Authoritative upstream source documents (inline):",
        "- Inline upstream source content was not available for this turn.",
        "- Stop and ask Core for a refreshed prompt instead of searching the workspace.",
      ].join("\n")
    : [
        "Authoritative upstream source documents (inline):",
        "- Treat the fenced content below as authoritative for this turn.",
        "- Do not reread input documents by path unless an artifact below is explicitly marked truncated.",
        ...sourceArtifacts.flatMap((artifact) => [
          "",
          `### ${artifact.label}`,
          artifact.truncated
            ? `- Warning: inline content was truncated. Fallback relative path: \`${artifact.relativePath}\``
            : "- Inline content: complete runtime read; no input file reread is needed.",
          "````markdown",
          artifact.content.endsWith("\n")
            ? artifact.content
            : `${artifact.content}\n`,
          "````",
        ]),
      ].join("\n");

const buildArtifactModeBlock = (relativePath: string): string => {
  const researchLine = relativePath.endsWith("/quality-gates-research.md")
    ? "- Quality Gates research pass is research-only: create `quality-gates-research.md` and `quality-gates-research.json`; do not create `quality-gates.md` or `quality-gates.json`."
    : null;
  return [
    "Workflow artifact mode:",
    "- Mode: `create_initial_draft`.",
    `- Target artifact: \`${relativePath}\`.`,
    "- Write the target artifact directly from the current prompt and runtime-provided inputs.",
    "- Do not search for, read, or check whether the target artifact already exists.",
    "- If existing artifact content is relevant, it must be included in this prompt as runtime-provided artifact context.",
    researchLine,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
};

export const buildCoreWorkflowPromptPack = async (params: {
  readonly artifactLanguage?: string;
  readonly chatLanguage?: string;
  readonly runSlug?: string;
  readonly stage: WorkflowStageId;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<CoreWorkflowPromptPack | null> => {
  if (!SLUG_RE.test(params.workspaceSlug)) {
    throw new Error("Invalid workspaceSlug");
  }
  const contract = await CONTRACT_BUILDERS[params.stage]();
  if (!contract) {
    return null;
  }
  const artifactLanguage = normalizeLanguage(
    params.artifactLanguage,
    DEFAULT_ARTIFACT_LANGUAGE
  );
  const chatLanguage = normalizeLanguage(
    params.chatLanguage,
    DEFAULT_CHAT_LANGUAGE
  );
  const target = buildTargetPath(params);
  const sourceArtifacts = await readSourceArtifacts(params);
  const prompt = buildBundledPrompt(params.stage) ?? contract.prompt;
  const content = [
    buildLanguageBlock({ artifactLanguage, chatLanguage, stage: params.stage }),
    prompt,
    buildArtifactModeBlock(target.relativePath),
    buildSourceBlock(sourceArtifacts),
    `Stage: ${params.stage === "quality_gates" ? "Quality Gates Baseline" : params.stage}.`,
    `Output file name: \`${STAGE_FILES[params.stage]}\``,
    `Output target artifact (write exactly this relative path; do not read it first): \`${target.relativePath}\``,
    `Final language reminder: user-facing chat stays in \`${chatLanguage}\`; artifact prose stays in \`${artifactLanguage}\`; English examples/templates are format-only.`,
  ].join("\n\n");
  return {
    absolutePath: target.absolutePath,
    artifactLanguage,
    chatLanguage,
    content,
    inputPath: sourceArtifacts[0]?.relativePath ?? "",
    promptPath: contract.paths.prompt,
    relativePath: target.relativePath,
    templatePath: contract.paths.template,
  };
};

const readQueryString = (query: unknown, key: string): string | undefined =>
  typeof (query as Record<string, unknown>)[key] === "string"
    ? ((query as Record<string, string>)[key] as string)
    : undefined;

const isWorkflowStage = (value: string | undefined): value is WorkflowStageId =>
  value === "description" ||
  value === "virtual_simulation" ||
  value === "diagram_modules" ||
  value === "application_skeleton" ||
  value === "quality_gates";

export const handleWorkflowPromptPackRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  const stage = readQueryString(req.query, "stage");
  const workspaceRoot = readQueryString(req.query, "workspacePath");
  const workspaceSlug = readQueryString(req.query, "workspaceSlug");
  if (!(isWorkflowStage(stage) && workspaceRoot && workspaceSlug)) {
    res
      .status(HTTP_BAD_REQUEST)
      .json({ error: "Invalid workflow prompt pack query" });
    return;
  }
  try {
    const promptPack = await buildCoreWorkflowPromptPack({
      artifactLanguage: readQueryString(req.query, "artifactLanguage"),
      chatLanguage: readQueryString(req.query, "chatLanguage"),
      runSlug: readQueryString(req.query, "runSlug"),
      stage,
      workspaceRoot,
      workspaceSlug,
    });
    if (!promptPack) {
      res
        .status(HTTP_NOT_FOUND)
        .json({ error: "Workflow prompt templates are unavailable" });
      return;
    }
    res.json(promptPack);
  } catch (error) {
    res.status(HTTP_INTERNAL_ERROR).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to build workflow prompt pack",
    });
  }
};
