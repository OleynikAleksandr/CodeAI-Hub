import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT } from "./workspace-runtime-capsule-gitignore";

export type WorkspaceRuntimeProviderId =
  | "codex"
  | "claude"
  | "gemini"
  | "glm-claude-code"
  | "kimi";

export interface WorkspaceRuntimePath {
  readonly absolutePath: string;
  readonly relativePath: string;
}

export interface WorkspaceRuntimeCapsule {
  readonly descriptionQuestionnaireFile: WorkspaceRuntimePath;
  readonly descriptionRoot: WorkspaceRuntimePath;
  readonly gitignoreFile: WorkspaceRuntimePath;
  readonly localizationRoot: WorkspaceRuntimePath;
  readonly logsRoot: WorkspaceRuntimePath;
  readonly projectManagerRoot: WorkspaceRuntimePath;
  readonly providerHomes: Readonly<
    Record<WorkspaceRuntimeProviderId, WorkspaceRuntimePath>
  >;
  readonly providersRoot: WorkspaceRuntimePath;
  readonly runtimeRoot: WorkspaceRuntimePath;
  readonly sessionsRoot: WorkspaceRuntimePath;
  readonly settingsFile: WorkspaceRuntimePath;
  readonly settingsRoot: WorkspaceRuntimePath;
  readonly stateRoot: WorkspaceRuntimePath;
  readonly unifiedSessionsRoot: WorkspaceRuntimePath;
  readonly workflowRoot: WorkspaceRuntimePath;
  readonly workflowStateFile: WorkspaceRuntimePath;
  readonly workspaceCapsuleRoot: WorkspaceRuntimePath;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface ResolveWorkspaceRuntimeCapsuleParams {
  readonly workspaceRoot: string;
  readonly workspaceSlug?: string | null;
}

const CAPSULE_ROOT_DIR = ".codeai-hub";
const DESCRIPTION_DIR = "description";
const DESCRIPTION_QUESTIONNAIRE_FILE_NAME = "questionnaire.md";
const RUNTIME_ROOT_DIR = "runtime";
const SETTINGS_FILE_NAME = "settings.json";
const WORKFLOW_ROOT_DIR = "workflow";
const WORKFLOW_STATE_FILE_NAME = "state.json";
const WORKSPACE_FALLBACK_SLUG = "workspace";

const PROVIDER_IDS = [
  "codex",
  "claude",
  "gemini",
  "glm-claude-code",
  "kimi",
] as const;
const DESCRIPTION_STAGE_ID = "description";
const DESCRIPTION_QUESTIONNAIRE_SEED = "# Description Questionnaire\n\n";
const WORKSPACE_SETTINGS_SEED = {
  providers: {
    claude: {
      thinking: {
        enabled: true,
        effort: "medium",
      },
      thinkingDisplaySyncEnabled: true,
      autoUpdate: { enabled: false },
      defaultModel: "sonnet",
      sessionContinuity: { remainingPercentThreshold: 30 },
    },
    codex: {
      autoUpdate: { enabled: false },
      defaultModel: "gpt-5.4-mini",
      reasoningByModel: {
        "gpt-5.2": "medium",
        "gpt-5.3-codex-spark": "medium",
        "gpt-5.4-mini": "medium",
        "gpt-5.4": "medium",
        "gpt-5.5": "medium",
      },
      sessionContinuity: { remainingPercentThreshold: 30 },
    },
    gemini: {
      autoUpdate: { enabled: false },
      defaultModel: "gemini-3-pro-preview",
      thinkingDisplaySyncEnabled: true,
      thinkingLevelByModel: {},
      sessionContinuity: {
        remainingPercentThreshold: 30,
        contextWindowTokenLimit: 300_000,
      },
    },
    kimi: {
      autoUpdate: { enabled: false },
      defaultModel: "kimi-k2.7-code",
      thinkingDisplaySyncEnabled: true,
    },
    glmClaudeCode: {
      apiKey: "",
      baseUrl: "https://api.z.ai/api/anthropic",
      configPath: "~/.codeai-hub/providers/glm-claude-code/config.json",
      defaultModel: "glm-5.2",
      haikuModel: "glm-5.2",
      opusModel: "glm-5.2",
      sonnetModel: "glm-5.2",
      thinkingDisplaySyncEnabled: true,
    },
  },
} as const;

export interface BootstrapWorkspaceRuntimeCapsuleResult {
  readonly capsule: WorkspaceRuntimeCapsule;
  readonly changedPaths: readonly string[];
}

export const normalizeWorkspaceRuntimeSlug = (value: string): string => {
  const normalized = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "");
  const parts = normalized.match(/[a-z0-9]+/gu);
  return parts?.join("-") || WORKSPACE_FALLBACK_SLUG;
};

const resolveWorkspaceSlug = (
  params: ResolveWorkspaceRuntimeCapsuleParams
): string => {
  const explicitSlug = params.workspaceSlug?.trim();
  if (explicitSlug) {
    return normalizeWorkspaceRuntimeSlug(explicitSlug);
  }
  return normalizeWorkspaceRuntimeSlug(path.basename(params.workspaceRoot));
};

const normalizeRelativeSegments = (
  segments: readonly string[]
): readonly string[] => {
  const parts: string[] = [];
  for (const segment of segments) {
    const splitSegments = segment.replace(/\\/g, "/").split("/");
    for (const part of splitSegments) {
      if (!part || part === ".") {
        continue;
      }
      if (part === "..") {
        throw new Error("Workspace runtime capsule paths cannot escape root.");
      }
      parts.push(part);
    }
  }
  return parts;
};

const buildWorkspaceCapsuleRelativePath = (
  workspaceSlug: string,
  ...segments: readonly string[]
): string =>
  path.posix.join(
    CAPSULE_ROOT_DIR,
    workspaceSlug,
    ...normalizeRelativeSegments(segments)
  );

export const buildWorkspaceRuntimeRelativePath = (
  workspaceSlug: string,
  ...segments: readonly string[]
): string =>
  buildWorkspaceCapsuleRelativePath(
    workspaceSlug,
    RUNTIME_ROOT_DIR,
    ...segments
  );

const resolvePath = (
  workspaceRoot: string,
  relativePath: string
): WorkspaceRuntimePath => ({
  absolutePath: path.resolve(workspaceRoot, relativePath),
  relativePath,
});

const buildRuntimePath = (
  workspaceRoot: string,
  workspaceSlug: string,
  ...segments: readonly string[]
): WorkspaceRuntimePath =>
  resolvePath(
    workspaceRoot,
    buildWorkspaceRuntimeRelativePath(workspaceSlug, ...segments)
  );

const buildProviderHomes = (
  workspaceRoot: string,
  workspaceSlug: string
): Record<WorkspaceRuntimeProviderId, WorkspaceRuntimePath> => {
  const entries = PROVIDER_IDS.map((providerId) => [
    providerId,
    buildRuntimePath(
      workspaceRoot,
      workspaceSlug,
      "providers",
      providerId,
      "home"
    ),
  ]);
  return Object.fromEntries(entries) as Record<
    WorkspaceRuntimeProviderId,
    WorkspaceRuntimePath
  >;
};

export const resolveWorkspaceRuntimeCapsule = (
  params: ResolveWorkspaceRuntimeCapsuleParams
): WorkspaceRuntimeCapsule => {
  const workspaceRoot = path.resolve(params.workspaceRoot);
  const workspaceSlug = resolveWorkspaceSlug(params);
  const settingsRoot = buildRuntimePath(
    workspaceRoot,
    workspaceSlug,
    "settings"
  );
  const sessionsRoot = buildRuntimePath(
    workspaceRoot,
    workspaceSlug,
    "sessions"
  );
  const providersRoot = buildRuntimePath(
    workspaceRoot,
    workspaceSlug,
    "providers"
  );
  const descriptionRoot = resolvePath(
    workspaceRoot,
    buildWorkspaceCapsuleRelativePath(workspaceSlug, DESCRIPTION_DIR)
  );
  const workflowRoot = resolvePath(
    workspaceRoot,
    buildWorkspaceCapsuleRelativePath(workspaceSlug, WORKFLOW_ROOT_DIR)
  );

  return {
    descriptionQuestionnaireFile: resolvePath(
      workspaceRoot,
      buildWorkspaceCapsuleRelativePath(
        workspaceSlug,
        DESCRIPTION_DIR,
        DESCRIPTION_QUESTIONNAIRE_FILE_NAME
      )
    ),
    descriptionRoot,
    gitignoreFile: resolvePath(
      workspaceRoot,
      buildWorkspaceCapsuleRelativePath(workspaceSlug, ".gitignore")
    ),
    localizationRoot: buildRuntimePath(
      workspaceRoot,
      workspaceSlug,
      "localization"
    ),
    logsRoot: buildRuntimePath(workspaceRoot, workspaceSlug, "logs"),
    projectManagerRoot: buildRuntimePath(
      workspaceRoot,
      workspaceSlug,
      "project-manager"
    ),
    providerHomes: buildProviderHomes(workspaceRoot, workspaceSlug),
    providersRoot,
    runtimeRoot: buildRuntimePath(workspaceRoot, workspaceSlug),
    sessionsRoot,
    settingsFile: buildRuntimePath(
      workspaceRoot,
      workspaceSlug,
      "settings",
      SETTINGS_FILE_NAME
    ),
    settingsRoot,
    stateRoot: buildRuntimePath(workspaceRoot, workspaceSlug, "state"),
    unifiedSessionsRoot: buildRuntimePath(
      workspaceRoot,
      workspaceSlug,
      "sessions",
      "unified"
    ),
    workspaceCapsuleRoot: resolvePath(
      workspaceRoot,
      buildWorkspaceCapsuleRelativePath(workspaceSlug)
    ),
    workspaceRoot,
    workspaceSlug,
    workflowRoot,
    workflowStateFile: resolvePath(
      workspaceRoot,
      buildWorkspaceCapsuleRelativePath(
        workspaceSlug,
        WORKFLOW_ROOT_DIR,
        WORKFLOW_STATE_FILE_NAME
      )
    ),
  };
};

const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
};

const writeTextIfMissing = async (
  target: WorkspaceRuntimePath,
  content: string
): Promise<string | null> => {
  if (await pathExists(target.absolutePath)) {
    return null;
  }
  await mkdir(path.dirname(target.absolutePath), { recursive: true });
  await writeFile(target.absolutePath, content, "utf8");
  return target.relativePath;
};

const writeTextIfChanged = async (
  target: WorkspaceRuntimePath,
  content: string
): Promise<string | null> => {
  const current = await readFile(target.absolutePath, "utf8").catch(() => null);
  if (current === content) {
    return null;
  }
  await mkdir(path.dirname(target.absolutePath), { recursive: true });
  await writeFile(target.absolutePath, content, "utf8");
  return target.relativePath;
};

const writeJsonIfMissing = async (
  target: WorkspaceRuntimePath,
  value: unknown
): Promise<string | null> =>
  await writeTextIfMissing(target, `${JSON.stringify(value, null, 2)}\n`);

const buildWorkflowStateSeed = (params: {
  readonly artifactPath: string;
  readonly now: string;
  readonly workspaceSlug: string;
}): Record<string, unknown> => ({
  workspaceSlug: params.workspaceSlug,
  updatedAt: params.now,
  lastActive: {
    stage: DESCRIPTION_STAGE_ID,
    updatedAt: params.now,
    artifactPath: params.artifactPath,
  },
});

export const bootstrapWorkspaceRuntimeCapsule = async (
  params: ResolveWorkspaceRuntimeCapsuleParams
): Promise<BootstrapWorkspaceRuntimeCapsuleResult> => {
  const capsule = await prepareWorkspaceRuntimeCapsuleDirectories(params);
  const now = new Date().toISOString();
  const changedPaths = await Promise.all([
    writeTextIfChanged(
      capsule.gitignoreFile,
      WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT
    ),
    writeTextIfMissing(
      capsule.descriptionQuestionnaireFile,
      DESCRIPTION_QUESTIONNAIRE_SEED
    ),
    writeJsonIfMissing(capsule.settingsFile, WORKSPACE_SETTINGS_SEED),
    writeJsonIfMissing(
      capsule.workflowStateFile,
      buildWorkflowStateSeed({
        artifactPath: capsule.descriptionQuestionnaireFile.relativePath,
        now,
        workspaceSlug: capsule.workspaceSlug,
      })
    ),
  ]);
  return {
    capsule,
    changedPaths: changedPaths.filter((value): value is string =>
      Boolean(value)
    ),
  };
};

export const prepareWorkspaceRuntimeCapsuleDirectories = async (
  params: ResolveWorkspaceRuntimeCapsuleParams
): Promise<WorkspaceRuntimeCapsule> => {
  const capsule = resolveWorkspaceRuntimeCapsule(params);
  await Promise.all([
    mkdir(capsule.descriptionRoot.absolutePath, { recursive: true }),
    mkdir(capsule.logsRoot.absolutePath, { recursive: true }),
    mkdir(capsule.projectManagerRoot.absolutePath, { recursive: true }),
    mkdir(capsule.settingsRoot.absolutePath, { recursive: true }),
    mkdir(capsule.stateRoot.absolutePath, { recursive: true }),
    mkdir(capsule.unifiedSessionsRoot.absolutePath, { recursive: true }),
    mkdir(capsule.workflowRoot.absolutePath, { recursive: true }),
    ...Object.values(capsule.providerHomes).map((providerHome) =>
      mkdir(providerHome.absolutePath, { recursive: true })
    ),
  ]);
  return capsule;
};
