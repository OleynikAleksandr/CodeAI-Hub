import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
  buildSessionFilePath,
  buildSessionTranslationFilePath,
  sanitizeWorkspaceSlug,
} from "@codeai-hub/unified-session";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";
import {
  collectContinuityIndexUserSpaceSessionPaths,
  collectStageNamedUserSpaceSessionPaths,
} from "./workflow-step-clear-continuity-support";

const WORKFLOW_STAGES = [
  "description",
  "virtual_simulation",
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
] as const satisfies readonly WorkflowStageId[];
const PROVIDER_NATIVE_ROOT = path.join(".codeai-hub", "providers");
const CODEX_TRANSLATION_CWD_MARKER = "codeai-codex-translation-";
const CODEX_TRANSLATION_INSTRUCTION_PREFIX =
  "You are a precise translation engine for CodeAI Hub.";
const JSONL_LINE_SEPARATOR_RE = /\r?\n/u;

type ClearTarget =
  | { readonly kind: "workflow_stage"; readonly stage: WorkflowStageId }
  | {
      readonly kind: "development_tree_node";
      readonly codeWorkspacePath?: string | null;
      readonly workflowPath: string;
    };

interface ContinuitySessionRef {
  readonly providerId: string;
  readonly providerSessionId: string;
}

interface ContinuityIndexEntryRecord {
  readonly latestSessionId: string | null;
  readonly providerId: string | null;
  readonly providerSessionId: string | null;
  readonly rootSessionId: string;
  readonly stage: string;
}

interface CodexNativeSessionMeta {
  readonly baseInstructionsText: string | null;
  readonly cwd: string | null;
  readonly id: string | null;
}

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const downstreamStages = (
  stage: WorkflowStageId
): readonly WorkflowStageId[] => {
  const index = WORKFLOW_STAGES.indexOf(stage);
  return index < 0 ? [] : WORKFLOW_STAGES.slice(index);
};

const isStageDownstream = (
  candidate: string | null,
  target: WorkflowStageId
): boolean =>
  Boolean(
    candidate && downstreamStages(target).includes(candidate as WorkflowStageId)
  );

const isStageInScope = (stage: string | null, target: ClearTarget): boolean =>
  target.kind === "workflow_stage"
    ? isStageDownstream(stage, target.stage)
    : Boolean(stage?.startsWith(target.workflowPath));

const resolveUserSpaceSessionRoot = (): string =>
  path.join(homedir(), ".codeai-hub", "sessions");

const workspaceSessionSlugs = (params: {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): readonly string[] => [
  ...new Set([
    params.workspaceSlug,
    sanitizeWorkspaceSlug(params.workspacePath),
  ]),
];

const readContinuityIndexEntries = async (params: {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<ContinuityIndexEntryRecord[]> => {
  const indexPath = path.join(
    params.workspacePath,
    ".codeai-hub",
    params.workspaceSlug,
    "continuity",
    "index.json"
  );
  const index = await readJsonFile<{ readonly entries?: unknown }>(indexPath);
  if (!Array.isArray(index?.entries)) {
    return [];
  }
  return index.entries.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }
    const record = entry as Record<string, unknown>;
    const stage = readString(record.stage);
    const rootSessionId = readString(record.rootSessionId);
    if (!(stage && rootSessionId)) {
      return [];
    }
    return [
      {
        stage,
        rootSessionId,
        latestSessionId: readString(record.latestSessionId),
        providerId: readString(record.providerId),
        providerSessionId: readString(record.providerSessionId),
      },
    ];
  });
};

const readJsonFile = async <T>(filePath: string): Promise<T | null> => {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
};

const readFirstJsonLine = async <T>(filePath: string): Promise<T | null> => {
  try {
    const firstLine = (await readFile(filePath, "utf8"))
      .split(JSONL_LINE_SEPARATOR_RE)
      .find((line) => line.trim().length > 0);
    return firstLine ? (JSON.parse(firstLine) as T) : null;
  } catch {
    return null;
  }
};

const readCodexNativeSessionMeta = async (
  filePath: string
): Promise<CodexNativeSessionMeta | null> => {
  const record = await readFirstJsonLine<Record<string, unknown>>(filePath);
  if (!(record?.type === "session_meta" && record.payload)) {
    return null;
  }
  const payload = record.payload as Record<string, unknown>;
  const baseInstructions = payload.base_instructions as
    | Record<string, unknown>
    | undefined;
  return {
    id: readString(payload.id),
    cwd: readString(payload.cwd),
    baseInstructionsText: readString(baseInstructions?.text),
  };
};

const isCodexTranslationNativeSession = (
  meta: CodexNativeSessionMeta
): boolean =>
  Boolean(
    meta.cwd?.includes(CODEX_TRANSLATION_CWD_MARKER) ||
      meta.baseInstructionsText?.startsWith(
        CODEX_TRANSLATION_INSTRUCTION_PREFIX
      )
  );

const collectChainSessionRefs = (
  chain: ContinuityChainSummary
): readonly ContinuitySessionRef[] =>
  chain.segments
    .filter((segment) => segment.providerSessionId.trim().length > 0)
    .map((segment) => ({
      providerId: segment.providerId,
      providerSessionId: segment.providerSessionId,
    }));

const collectContinuitySessionRefs = async (params: {
  readonly target: ClearTarget;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<ContinuitySessionRef[]> => {
  const refs = new Map<string, ContinuitySessionRef>();
  const chains = await SessionContinuityFacade.readWorkspaceChains({
    workspaceRoot: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
  });
  for (const chain of chains) {
    if (!isStageInScope(chain.stage, params.target)) {
      continue;
    }
    for (const ref of collectChainSessionRefs(chain)) {
      refs.set(`${ref.providerId}:${ref.providerSessionId}`, ref);
    }
  }
  for (const entry of await readContinuityIndexEntries(params)) {
    const hasSessionRef =
      isStageInScope(entry.stage, params.target) &&
      entry.providerId &&
      entry.providerSessionId;
    if (!hasSessionRef) {
      continue;
    }
    refs.set(`${entry.providerId}:${entry.providerSessionId}`, {
      providerId: entry.providerId,
      providerSessionId: entry.providerSessionId,
    });
  }
  return [...refs.values()];
};

const addUnifiedSessionPaths = (params: {
  readonly paths: Set<string>;
  readonly providerId: string;
  readonly rootDirectory: string;
  readonly sessionId: string;
  readonly workspaceSlugs: readonly string[];
}): void => {
  for (const slug of params.workspaceSlugs) {
    params.paths.add(
      buildSessionFilePath({
        provider: params.providerId,
        rootDirectory: params.rootDirectory,
        sessionId: params.sessionId,
        workspaceSlug: slug,
      })
    );
    params.paths.add(
      buildSessionTranslationFilePath({
        provider: params.providerId,
        rootDirectory: params.rootDirectory,
        sessionId: params.sessionId,
        workspaceSlug: slug,
      })
    );
  }
};

const collectUnifiedSessionChainPaths = async (params: {
  readonly target: ClearTarget;
  readonly workspacePath: string;
  readonly workspaceSlugs: readonly string[];
  readonly rootDirectory: string;
  readonly workspaceSlug: string;
}): Promise<Set<string>> => {
  const paths = new Set<string>();
  const chains = await SessionContinuityFacade.readWorkspaceChains({
    workspaceRoot: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
  });
  for (const chain of chains) {
    if (!isStageInScope(chain.stage, params.target)) {
      continue;
    }
    for (const segment of chain.segments) {
      const historySessionId = sanitizeWorkspaceSlug(
        segment.providerSessionId || segment.sessionId
      );
      addUnifiedSessionPaths({
        paths,
        providerId: segment.providerId,
        rootDirectory: params.rootDirectory,
        sessionId: historySessionId,
        workspaceSlugs: params.workspaceSlugs,
      });
    }
  }
  return paths;
};

const collectUnifiedSessionIndexPaths = async (params: {
  readonly target: ClearTarget;
  readonly workspacePath: string;
  readonly workspaceSlugs: readonly string[];
  readonly rootDirectory: string;
  readonly workspaceSlug: string;
}): Promise<Set<string>> => {
  const paths = new Set<string>();
  for (const entry of await readContinuityIndexEntries(params)) {
    const indexedSessionId = entry.providerSessionId ?? entry.latestSessionId;
    const hasIndexedSession =
      isStageInScope(entry.stage, params.target) &&
      entry.providerId &&
      indexedSessionId;
    if (!hasIndexedSession) {
      continue;
    }
    addUnifiedSessionPaths({
      paths,
      providerId: entry.providerId,
      rootDirectory: params.rootDirectory,
      sessionId: sanitizeWorkspaceSlug(indexedSessionId),
      workspaceSlugs: params.workspaceSlugs,
    });
  }
  return paths;
};

const collectUnifiedStageNamedPaths = async (params: {
  readonly rootDirectory: string;
  readonly target: ClearTarget;
  readonly workspaceSlugs: readonly string[];
}): Promise<Set<string>> => {
  const paths = new Set<string>();
  for (const slug of params.workspaceSlugs) {
    if (params.target.kind === "workflow_stage") {
      for (const stageNamedPath of await collectStageNamedUserSpaceSessionPaths(
        {
          rootDirectory: params.rootDirectory,
          stage: params.target.stage,
          workspaceSlug: slug,
        }
      )) {
        paths.add(stageNamedPath);
      }
    }
  }
  return paths;
};

const collectUnifiedSessionPaths = async (params: {
  readonly target: ClearTarget;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<string[]> => {
  const rootDirectory = resolveUserSpaceSessionRoot();
  const workspaceSlugs = workspaceSessionSlugs(params);
  return [
    ...(await collectUnifiedSessionChainPaths({
      ...params,
      rootDirectory,
      workspaceSlugs,
    })),
    ...(await collectContinuityIndexUserSpaceSessionPaths({
      rootDirectory,
      workspacePath: params.workspacePath,
      workspaceSlug: params.workspaceSlug,
      isStageInScope: (stage) => isStageInScope(stage, params.target),
    })),
    ...(await collectUnifiedSessionIndexPaths({
      ...params,
      rootDirectory,
      workspaceSlugs,
    })),
    ...(await collectUnifiedStageNamedPaths({
      rootDirectory,
      target: params.target,
      workspaceSlugs,
    })),
  ];
};

const collectCodexNativeSessionPaths = async (
  providerSessionIds: readonly string[]
): Promise<string[]> => {
  const root = path.join(
    homedir(),
    PROVIDER_NATIVE_ROOT,
    "codex",
    "home",
    "sessions"
  );
  const paths: string[] = [];
  const providerSessionIdSet = new Set(providerSessionIds);
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    const entries = await readdir(current, { withFileTypes: true }).catch(
      () => []
    );
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        continue;
      }
      if (!(entry.isFile() && entry.name.endsWith(".jsonl"))) {
        continue;
      }
      const meta = await readCodexNativeSessionMeta(absolutePath);
      const isTrackedWorkflowSession = Boolean(
        meta?.id && providerSessionIdSet.has(meta.id)
      );
      if (
        isTrackedWorkflowSession ||
        (meta && isCodexTranslationNativeSession(meta))
      ) {
        paths.push(absolutePath);
      }
    }
  }
  return paths;
};

const collectClaudeNativeSessionPaths = (params: {
  readonly providerSessionId: string;
  readonly workspacePath: string;
}): readonly string[] => [
  path.join(
    homedir(),
    PROVIDER_NATIVE_ROOT,
    "claude",
    "home",
    ".claude",
    "projects",
    sanitizeWorkspaceSlug(params.workspacePath),
    `${params.providerSessionId}.jsonl`
  ),
];

const collectProviderNativeSessionPaths = async (params: {
  readonly refs: readonly ContinuitySessionRef[];
  readonly workspacePath: string;
}): Promise<string[]> => {
  const paths = new Set<string>();
  const codexProviderSessionIds = params.refs
    .filter((ref) => ref.providerId === "codexCli")
    .map((ref) => ref.providerSessionId);
  for (const targetPath of await collectCodexNativeSessionPaths(
    codexProviderSessionIds
  )) {
    paths.add(targetPath);
  }
  for (const ref of params.refs) {
    if (
      ref.providerId === "claudeCodeCli" ||
      ref.providerId === "glmClaudeCode"
    ) {
      for (const targetPath of collectClaudeNativeSessionPaths({
        providerSessionId: ref.providerSessionId,
        workspacePath: params.workspacePath,
      })) {
        paths.add(targetPath);
      }
    }
  }
  return [...paths];
};

export const collectWorkflowStepSessionCleanupPaths = async (params: {
  readonly target: ClearTarget;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<string[]> => {
  const refs = await collectContinuitySessionRefs(params);
  return [
    ...(await collectUnifiedSessionPaths(params)),
    ...(await collectProviderNativeSessionPaths({
      refs,
      workspacePath: params.workspacePath,
    })),
  ];
};
