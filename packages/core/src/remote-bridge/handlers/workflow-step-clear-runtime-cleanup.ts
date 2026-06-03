import { readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { buildHumanReadableDialogId } from "../../session-continuity/dialog-id";
import type { Session } from "../../session-manager";
import {
  resolveWorkspaceRuntimeCapsule,
  type WorkspaceRuntimeProviderId,
} from "../../workflow/runtime/workspace-runtime-capsule";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";

const DEVELOPMENT_TREE_STAGE_PREFIX = "development_tree/";
const JSONL_EXTENSION = ".jsonl";
const TRANSLATION_SESSION_SUFFIX = ".translations.jsonl";
const PROVIDER_NATIVE_SESSION_EXTENSIONS = new Set([".json", ".jsonl", ".sh"]);
const WORKFLOW_STAGE_FILE_SUFFIXES: ReadonlyArray<{
  readonly stage: WorkflowStageId;
  readonly suffix: string;
}> = [
  { stage: "description", suffix: "-description" },
  { stage: "virtual_simulation", suffix: "-virtual-simulation" },
  { stage: "diagram_modules", suffix: "-diagram-modules" },
  { stage: "application_skeleton", suffix: "-application-skeleton" },
  { stage: "quality_gates", suffix: "-quality-gates" },
];
export interface WorkflowRuntimeSessionRef {
  readonly historySessionId: string;
  readonly providerId: string;
  readonly providerSessionId?: string;
  readonly sessionId: string;
}

const resolveDialogAgentRole = (session: Session): string | null =>
  session.stage?.startsWith(DEVELOPMENT_TREE_STAGE_PREFIX)
    ? session.stage
    : (session.runSlug ?? session.stage ?? null);

export const createWorkflowRuntimeSessionRef = (
  session: Session
): WorkflowRuntimeSessionRef => ({
  historySessionId: buildHumanReadableDialogId({
    providerId: session.providerId,
    uuid: session.id,
    agentRole: resolveDialogAgentRole(session),
  }),
  providerId: session.providerId,
  providerSessionId: session.providerSessionId,
  sessionId: session.id,
});

const walkSessionFiles = async (
  root: string,
  extensions: ReadonlySet<string>
): Promise<readonly string[]> => {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkSessionFiles(absolutePath, extensions)));
      continue;
    }
    if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }
  return files;
};

const isProviderNativeSessionPath = (params: {
  readonly filePath: string;
  readonly providerHomeId: WorkspaceRuntimeProviderId;
}): boolean => {
  const normalized = params.filePath.replace(/\\/gu, "/");
  if (params.providerHomeId === "codex") {
    return (
      normalized.includes("/sessions/") ||
      normalized.includes("/shell_snapshots/")
    );
  }
  if (
    params.providerHomeId === "claude" ||
    params.providerHomeId === "glm-claude-code"
  ) {
    return (
      normalized.includes("/.claude/projects/") ||
      normalized.includes("/.claude/sessions/")
    );
  }
  if (params.providerHomeId === "gemini") {
    const basename = path.basename(normalized);
    return normalized.includes("/chats/") && basename.startsWith("session-");
  }
  return false;
};

const basenameWithoutSessionExtension = (filePath: string): string => {
  const basename = path.basename(filePath);
  if (basename.endsWith(TRANSLATION_SESSION_SUFFIX)) {
    return basename.slice(0, -TRANSLATION_SESSION_SUFFIX.length);
  }
  if (basename.endsWith(JSONL_EXTENSION)) {
    return basename.slice(0, -JSONL_EXTENSION.length);
  }
  return basename;
};

const resolveWorkflowStageFromHistoryFileName = (
  filePath: string
): WorkflowStageId | null => {
  const historyId = basenameWithoutSessionExtension(filePath);
  return (
    WORKFLOW_STAGE_FILE_SUFFIXES.find((entry) =>
      historyId.endsWith(entry.suffix)
    )?.stage ?? null
  );
};

const contentReferencesDevelopmentTree = (content: string): boolean =>
  content.includes("Workflow path: development_tree/") ||
  content.includes('"workflowPath":"development_tree/') ||
  content.includes("development_tree/materialized/");

const shouldRemoveWorkflowHistoryFile = (params: {
  readonly content: string;
  readonly exactHistorySessionIds: ReadonlySet<string>;
  readonly filePath: string;
}): boolean => {
  const historyId = basenameWithoutSessionExtension(params.filePath);
  if (params.exactHistorySessionIds.has(historyId)) {
    return true;
  }
  const stage = resolveWorkflowStageFromHistoryFileName(params.filePath);
  if (stage) {
    return true;
  }
  return contentReferencesDevelopmentTree(params.content);
};

const readOptionalText = async (filePath: string): Promise<string> =>
  await readFile(filePath, "utf8").catch(() => "");

const removeFileIfExistsAndRecord = async (params: {
  readonly filePath: string;
  readonly removedPaths: string[];
  readonly workspacePath: string;
}): Promise<void> => {
  const exists = await stat(params.filePath).catch(() => null);
  if (!exists?.isFile()) {
    return;
  }
  await rm(params.filePath, { force: true });
  params.removedPaths.push(
    path.relative(params.workspacePath, params.filePath)
  );
};

export const pruneUnifiedWorkflowSessions = async (params: {
  readonly sessions: readonly WorkflowRuntimeSessionRef[];
  readonly targetStage: WorkflowStageId;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<readonly string[]> => {
  const capsule = resolveWorkspaceRuntimeCapsule({
    workspaceRoot: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
  });
  const removedPaths: string[] = [];
  const exactHistorySessionIds = new Set(
    params.sessions.map((session) => session.historySessionId)
  );
  const providerRoots = await readdir(
    capsule.unifiedSessionsRoot.absolutePath,
    {
      withFileTypes: true,
    }
  ).catch(() => []);
  for (const providerRoot of providerRoots) {
    if (!providerRoot.isDirectory()) {
      continue;
    }
    const providerDirectory = path.join(
      capsule.unifiedSessionsRoot.absolutePath,
      providerRoot.name
    );
    const files = await readdir(providerDirectory, {
      withFileTypes: true,
    }).catch(() => []);
    for (const file of files) {
      if (!(file.isFile() && file.name.endsWith(JSONL_EXTENSION))) {
        continue;
      }
      const filePath = path.join(providerDirectory, file.name);
      const content = await readOptionalText(filePath);
      if (
        !shouldRemoveWorkflowHistoryFile({
          content,
          exactHistorySessionIds,
          filePath,
        })
      ) {
        continue;
      }
      await removeFileIfExistsAndRecord({
        filePath,
        removedPaths,
        workspacePath: params.workspacePath,
      });
      if (!file.name.endsWith(TRANSLATION_SESSION_SUFFIX)) {
        await removeFileIfExistsAndRecord({
          filePath: filePath.replace(
            JSONL_EXTENSION,
            TRANSLATION_SESSION_SUFFIX
          ),
          removedPaths,
          workspacePath: params.workspacePath,
        });
      }
    }
  }
  return removedPaths;
};

export const pruneProviderNativeWorkflowSessions = async (params: {
  readonly sessions: readonly WorkflowRuntimeSessionRef[];
  readonly targetStage: WorkflowStageId;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<readonly string[]> => {
  const removedPaths: string[] = [];
  const capsule = resolveWorkspaceRuntimeCapsule({
    workspaceRoot: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
  });

  for (const [providerHomeId, providerHome] of Object.entries(
    capsule.providerHomes
  ) as ReadonlyArray<
    readonly [WorkspaceRuntimeProviderId, { readonly absolutePath: string }]
  >) {
    for (const filePath of await walkSessionFiles(
      providerHome.absolutePath,
      PROVIDER_NATIVE_SESSION_EXTENSIONS
    )) {
      if (!isProviderNativeSessionPath({ filePath, providerHomeId })) {
        continue;
      }
      await removeFileIfExistsAndRecord({
        filePath,
        removedPaths,
        workspacePath: params.workspacePath,
      });
    }
  }
  return removedPaths;
};
