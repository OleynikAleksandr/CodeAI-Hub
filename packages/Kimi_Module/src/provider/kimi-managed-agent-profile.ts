import { accessSync, constants, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  CODEX_NATIVE_SYSTEM_INSTRUCTIONS,
  CODEX_NATIVE_TOOL_DEFINITIONS_JSON,
} from "./codex-native-baseline";

const MANAGED_AGENT_DIR = "codeai-managed-agent";
const KIMI_PROVIDER_HOME_RELATIVE_PATH = path.join(
  ".codeai-hub",
  "providers",
  "kimi",
  "home"
);
const KIMI_DEFAULT_CONFIG_RELATIVE_PATH = path.join(
  ".kimi-code",
  "config.toml"
);
const WORKSPACE_FALLBACK_SLUG = "workspace";
const KIMI_CLI_PATH_ENV = "KIMI_CLI_PATH";
const KIMI_BINARY_NAME = "kimi";
const KIMI_CODE_BIN_RELATIVE_PATH = path.join(".kimi-code", "bin");
const KIMI_USER_LOCAL_BIN_RELATIVE_PATH = path.join(".local", "bin");
const KIMI_COMMON_BIN_DIRS = ["/opt/homebrew/bin", "/usr/local/bin"] as const;

const KIMI_MANAGED_AGENT_YAML = `version: 1
agent:
  name: "codeai-managed-workflow"
  system_prompt_path: ./system.md
  tools:
    - "kimi_cli.tools.file:ReadFile"
    - "kimi_cli.tools.file:ReadMediaFile"
    - "kimi_cli.tools.file:Glob"
    - "kimi_cli.tools.file:Grep"
    - "kimi_cli.tools.file:WriteFile"
    - "kimi_cli.tools.file:StrReplaceFile"
    - "kimi_cli.tools.shell:Shell"
  subagents:
`;

const KIMI_MANAGED_SYSTEM_PROMPT = `${CODEX_NATIVE_SYSTEM_INSTRUCTIONS}

# CodeAI Hub Kimi Runtime Addendum

You are Kimi Code CLI operating inside CodeAI Hub as a managed workflow agent.

Your role is to help the user turn project intent into durable CodeAI Hub artifacts. Follow the CodeAI Core Runtime prompt for the active workflow step exactly. The Core prompt is the authority for target artifact paths, artifact mode, language contract, source boundaries, validation rules, and next user-facing output.

# Core Operating Rules

## Source Discipline

- Use only the current user turn, Core Runtime prompt, runtime-provided artifacts, and files explicitly allowed by that prompt as sources of truth.
- Do not use CodeAI Hub implementation source, parser code, tests, or unrelated repository files as product-truth evidence unless the current Core prompt explicitly asks for that.
- Do not read or rely on AGENTS.md, project memory, skills, MCP resources, or provider-global project instructions. CodeAI Hub provides the required instructions in the system prompt and the first user prompt.
- If a source is missing or ambiguous, record a careful assumption or ask a focused question in ordinary assistant text when the answer materially affects the artifact.
- Preserve the difference between confirmed facts, assumptions, open questions, and future implementation decisions.

## Artifact-First Work

- Prefer improving the target artifact over giving long explanations in chat.
- Write or update the target artifact file when the active Core prompt requires it.
- Keep artifacts user-readable and useful for downstream workflow steps.
- Do not publish full artifact contents in chat unless the user asks for them.
- When updating an artifact, keep the structure coherent instead of appending disconnected notes.
- Use the exact target path from the Core prompt. If the parent directory is missing, report a runtime preflight failure instead of creating unrelated workflow directories.

## Tool Use

- Use file tools only for the current managed task and only within the active workspace or Core-provided target paths.
- When an artifact must be written, use WriteFile or StrReplaceFile so the file system actually changes.
- Do not claim a file was changed unless the tool call succeeded.
- Do not perform Git operations. Managed commits, validation, and workflow state transitions belong to CodeAI Core.
- Use Shell only when the active Core prompt or a failed file-tool write makes a local filesystem action necessary for the current managed task, such as creating the target parent directory, inspecting a just-written artifact, or running an explicitly requested narrow check.
- Do not use web access, subagents, background tasks, MCP tools, provider skills, or shell commands unrelated to the current managed task. They are intentionally unavailable or out of scope in this managed profile.

## Architecture Workflow Behavior

- Interpret products as systems with top-level product parts, clusters, standalone modules, and boundaries when the active workflow step asks for architecture discovery.
- Do not wait for the user to use technical terms; translate plain-language descriptions into careful architecture language.
- Do not collapse separately living product parts into one cluster.
- Do not invent fake precision for unknown transports, APIs, runtimes, storage, deployment, or ownership boundaries.
- Do not turn early workflow steps into implementation planning unless the active Core prompt explicitly asks for that.

## User-Facing Progress Updates

- During work, send short progress updates as ordinary visible assistant text messages.
- These updates must be normal assistant messages, not reasoning-only text, hidden thoughts, tool-call notes, metadata, or any other non-user-visible channel.
- Reasoning text does not count as a progress update. If reasoning display is disabled, the user must still see visible progress messages.
- Use summarized reasoning as your default output style. Do not stream or write a full detailed chain-of-thought, private scratchpad, or step-by-step internal analysis.
- Keep any hidden/internal reasoning minimal. Use it only to decide what to do next, not as a long work log for the whole artifact.
- When you notice you are producing detailed reasoning, compress it immediately into a short visible ordinary assistant message instead. The message should be a reasoning summary, not raw reasoning.
- A reasoning summary should be 1-3 short sentences or 2-3 compact bullets. It should say only user-safe conclusions: what you inspected, what decision or boundary you found, what artifact area you are changing, and what remains to validate.
- Prefer ordinary assistant summaries over hidden reasoning for progress communication. The user should be able to hide reasoning display and still understand the agent's current work from these summaries.
- A progress update is non-terminal: after sending one, continue the same turn and do not stop, wait for the user, or treat it as the final answer until the promised work or requested artifact is actually complete.
- For managed artifact-writing work that may take more than about 90 seconds, send at least two visible progress updates before the final answer: one after the first concrete direction is clear, and another after a meaningful artifact section or validation pass is complete.
- Send the first visible progress update early, before a long silent stretch: usually within the first 15-30 seconds of substantial work.
- After that, send another visible update whenever about 45-60 seconds have passed since the last visible assistant message while you are still working.
- If elapsed time is hard to estimate, use work progress as the fallback: after every 2-3 substantial file-reading, artifact-editing, or internal-analysis cycles without a visible assistant message, send one short visible update before continuing.
- Convert user-safe operational conclusions from your reasoning into visible progress summaries. Say what source group you reviewed, what artifact section you are drafting or revising, what risk you found, or what validation remains.
- Do not expose private step-by-step reasoning. Progress updates should be concise summaries of observable work state, not raw internal analysis.
- For long artifact-generation turns, do not wait until the file is ready to summarize. If you have already planned or drafted several scenarios, sections, clusters, modules, boundaries, or validation checks, publish a visible summary and then continue.
- A useful progress update should usually contain one or two concrete facts: sources reviewed, artifact section currently being built, coverage already achieved, boundary or assumption found, remaining validation, or next section to write.
- Use the active chat language for progress updates. Example meanings to translate into that language:
  - "I have reviewed the description and am mapping actors, product parts, and missing scenarios before writing the draft."
  - "I have drafted the startup, settings, and provider-switch flows; next I am checking recovery and workspace integration for gaps."
  - "I see the main boundaries between Project Manager, Core Runtime, VS Code Extension, and Provider Modules; now I am turning them into boundary-sensitive interactions."
  - "The artifact structure is complete; I am doing a final validator pass before writing the file."
  - "Reasoning summary: the source material points to three product boundaries and two unresolved ownership assumptions; I am keeping the draft explicit about those assumptions."
- Avoid vague progress updates such as "I am working", "I am thinking", or "I am writing the draft" unless they also say what was reviewed, found, or will be checked next.
- Keep progress updates concrete and brief: say what was just learned, what you are doing next, or whether there is a blocker.
- Before editing files, briefly state what changes you are going to make.
- Do not send progress updates about routine patch retries, invisible whitespace, encoding retries, or fallback edit mechanics unless they remain blocking.

## Communication

- Follow the Core-provided language contract. If no language contract is present, respond in the user's language.
- Be direct, factual, and concise.
- Ask at most a few focused questions at a time.
- Do not add motivational filler or generic praise.
- Do not end a response with an open-ended "if you want" offer.

# Working Environment

Operating system: \${KIMI_OS}
Shell, if a shell tool is available in another profile: \${KIMI_SHELL}
Current date and time: \${KIMI_NOW}
Working directory: \${KIMI_WORK_DIR}

Directory listing of the current working directory:

\`\`\`
\${KIMI_WORK_DIR_LS}
\`\`\`

{% if KIMI_ADDITIONAL_DIRS_INFO %}
Additional directories:

\${KIMI_ADDITIONAL_DIRS_INFO}
{% endif %}

# Captured Codex Native Tool Definitions

The following JSON is the complete Codex-native tool definition list captured for this Kimi comparison profile. The Kimi ACP runtime still executes only the tools declared in the actual Kimi managed agent profile.

\`\`\`json
${CODEX_NATIVE_TOOL_DEFINITIONS_JSON}
\`\`\`
`;

export interface KimiManagedAgentProfilePaths {
  readonly agentFilePath: string;
  readonly mcpConfigPath: string;
  readonly profileDir: string;
  readonly skillsDirPath: string;
  readonly systemPromptPath: string;
}

export interface KimiRuntimeHome {
  readonly providerHomePath: string;
  readonly userConfigPath: string;
}

interface KimiRuntimeHomeOptions {
  readonly homeDir?: string;
  readonly providerHomePath?: string;
  readonly userConfigPath?: string;
  readonly workspacePath?: string;
}

export interface KimiCliEnvironment {
  readonly args: readonly string[];
  readonly command: string;
  readonly env: NodeJS.ProcessEnv;
  readonly runtimeHome: KimiRuntimeHome;
  readonly usesEnvironmentModel: boolean;
}

interface KimiCliEnvironmentOptions extends KimiRuntimeHomeOptions {
  readonly defaultModel?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly thinkingEnabled?: boolean;
  readonly workspacePath?: string;
}

const resolveKimiManagedAgentProfilePaths = (
  providerHomePath: string
): KimiManagedAgentProfilePaths => {
  const profileDir = path.join(providerHomePath, MANAGED_AGENT_DIR);
  return {
    agentFilePath: path.join(profileDir, "agent.yaml"),
    mcpConfigPath: path.join(profileDir, "mcp-empty.json"),
    profileDir,
    skillsDirPath: path.join(profileDir, "skills-empty"),
    systemPromptPath: path.join(profileDir, "system.md"),
  };
};

const resolveHomeDir = (homeDir?: string): string => {
  const resolvedHomeDir = homeDir ?? os.homedir();
  if (resolvedHomeDir.trim().length === 0) {
    throw new Error(
      "Cannot resolve Kimi runtime home without a home directory."
    );
  }
  return resolvedHomeDir;
};

const normalizeWorkspaceRuntimeSlug = (value: string): string => {
  const normalized = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "");
  const parts = normalized.match(/[a-z0-9]+/gu);
  return parts?.join("-") || WORKSPACE_FALLBACK_SLUG;
};

const resolveWorkspaceKimiProviderHome = (workspacePath: string): string =>
  path.join(
    path.resolve(workspacePath),
    ".codeai-hub",
    normalizeWorkspaceRuntimeSlug(path.basename(workspacePath)),
    "runtime",
    "providers",
    "kimi",
    "home"
  );

const resolveDefaultKimiProviderHome = (
  homeDir: string,
  workspacePath?: string
): string => {
  const normalizedWorkspacePath = workspacePath?.trim();
  return normalizedWorkspacePath
    ? resolveWorkspaceKimiProviderHome(normalizedWorkspacePath)
    : path.join(homeDir, KIMI_PROVIDER_HOME_RELATIVE_PATH);
};

const resolveKimiRuntimeHome = (
  options: KimiRuntimeHomeOptions = {}
): KimiRuntimeHome => {
  const homeDir = resolveHomeDir(options.homeDir);
  const providerHomePath =
    options.providerHomePath ??
    resolveDefaultKimiProviderHome(homeDir, options.workspacePath);
  return {
    providerHomePath,
    userConfigPath:
      options.userConfigPath ??
      path.join(homeDir, KIMI_DEFAULT_CONFIG_RELATIVE_PATH),
  };
};

export const ensureKimiProviderHome = async (
  options: KimiRuntimeHomeOptions = {}
): Promise<KimiRuntimeHome> => {
  const runtimeHome = resolveKimiRuntimeHome(options);
  await mkdir(runtimeHome.providerHomePath, { recursive: true });
  await mkdir(path.dirname(runtimeHome.userConfigPath), { recursive: true });
  return runtimeHome;
};

const canExecuteFile = (filePath: string): boolean => {
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

const prependPathEntries = (
  pathValue: string | undefined,
  entries: readonly string[]
): string => {
  const existingEntries =
    pathValue?.split(path.delimiter).filter(Boolean) ?? [];
  const nextEntries = [...entries, ...existingEntries];
  return Array.from(new Set(nextEntries)).join(path.delimiter);
};

const getKimiCandidateBinDirs = (homeDir: string): string[] => [
  path.join(homeDir, KIMI_CODE_BIN_RELATIVE_PATH),
  path.join(homeDir, KIMI_USER_LOCAL_BIN_RELATIVE_PATH),
  ...KIMI_COMMON_BIN_DIRS,
];

const resolveKimiCliCommand = (
  env: NodeJS.ProcessEnv,
  homeDir: string
): string => {
  const explicitCommand = env[KIMI_CLI_PATH_ENV]?.trim();
  if (explicitCommand) {
    return explicitCommand;
  }

  for (const binDir of getKimiCandidateBinDirs(homeDir)) {
    const candidatePath = path.join(binDir, KIMI_BINARY_NAME);
    if (canExecuteFile(candidatePath)) {
      return candidatePath;
    }
  }

  return KIMI_BINARY_NAME;
};

const KIMI_CODEAI_MODEL_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  "kimi-k2.7-code": "Kimi K2.7 Code",
  "kimi-k2.7-code-highspeed": "Kimi K2.7 Code High Speed",
};
const KIMI_DEFAULT_MODEL_RE = /^\s*default_model\s*=\s*"([^"]*)"/mu;

const readTomlString = (section: string, key: string): string | undefined => {
  const match = section.match(
    new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, "mu")
  );
  return match?.[1];
};

const unquoteTomlKey = (value: string): string =>
  value.startsWith('"') && value.endsWith('"')
    ? value.slice(1, -1).replace(/\\"/gu, '"')
    : value;

const readTomlSections = (
  toml: string,
  tableName: string
): Array<{ readonly name: string; readonly text: string }> => {
  const headers = Array.from(toml.matchAll(/^\s*\[([^\]]+)\]\s*$/gmu));
  return headers
    .map((header, index) => {
      const rawName = header[1];
      const prefix = `${tableName}.`;
      if (!rawName.startsWith(prefix)) {
        return null;
      }
      const start = (header.index ?? 0) + header[0].length;
      const end = headers[index + 1]?.index ?? toml.length;
      return {
        name: unquoteTomlKey(rawName.slice(prefix.length)),
        text: toml.slice(start, end),
      };
    })
    .filter(
      (section): section is { readonly name: string; readonly text: string } =>
        section !== null
    );
};

const findKimiProviderCredentials = (
  userConfigPath: string
): { readonly apiKey: string; readonly baseUrl: string } | null => {
  let toml: string;
  try {
    toml = readFileSync(userConfigPath, "utf8");
  } catch {
    return null;
  }

  const defaultModel = toml.match(KIMI_DEFAULT_MODEL_RE)?.[1];
  const modelSections = readTomlSections(toml, "models");
  const providerSections = readTomlSections(toml, "providers");
  const defaultModelSection = modelSections.find(
    (section) => section.name === defaultModel
  );
  const defaultProviderName = defaultModelSection
    ? readTomlString(defaultModelSection.text, "provider")
    : undefined;
  const provider =
    providerSections.find((section) => section.name === defaultProviderName) ??
    providerSections.find(
      (section) => readTomlString(section.text, "type") === "kimi"
    ) ??
    providerSections[0];
  const apiKey = provider
    ? readTomlString(provider.text, "api_key")
    : undefined;
  if (!apiKey) {
    return null;
  }
  return {
    apiKey,
    baseUrl:
      (provider ? readTomlString(provider.text, "base_url") : undefined) ??
      "https://api.kimi.com/coding/v1",
  };
};

const buildKimiEnvironmentModelEnv = (
  defaultModel: string | undefined,
  userConfigPath: string
): NodeJS.ProcessEnv | null => {
  const modelName = defaultModel?.trim();
  if (!(modelName && modelName in KIMI_CODEAI_MODEL_DISPLAY_NAMES)) {
    return null;
  }
  const credentials = findKimiProviderCredentials(userConfigPath);
  if (!credentials) {
    throw new Error(
      `Kimi model "${modelName}" requires Kimi API credentials in ${userConfigPath}. Run "kimi migrate" or "kimi login", then restart Core.`
    );
  }
  return {
    KIMI_MODEL_API_KEY: credentials.apiKey,
    KIMI_MODEL_BASE_URL: credentials.baseUrl,
    KIMI_MODEL_DISPLAY_NAME: KIMI_CODEAI_MODEL_DISPLAY_NAMES[modelName],
    KIMI_MODEL_MAX_CONTEXT_SIZE: "262144",
    KIMI_MODEL_NAME: modelName,
    KIMI_MODEL_PROVIDER_TYPE: "kimi",
  };
};

export const buildKimiCliEnvironment = (
  options: KimiCliEnvironmentOptions = {}
): KimiCliEnvironment => {
  const baseEnv = options.env ?? process.env;
  const runtimeHome = resolveKimiRuntimeHome(options);
  const homeDir = resolveHomeDir(options.homeDir);
  const candidateBinDirs = getKimiCandidateBinDirs(homeDir);
  const environmentModelEnv = buildKimiEnvironmentModelEnv(
    options.defaultModel,
    runtimeHome.userConfigPath
  );
  return {
    args: ["acp"],
    command: resolveKimiCliCommand(baseEnv, homeDir),
    env: {
      ...baseEnv,
      KIMI_CLI_NO_AUTO_UPDATE: "1",
      PATH: prependPathEntries(baseEnv.PATH, candidateBinDirs),
      ...(environmentModelEnv ?? {}),
    },
    runtimeHome,
    usesEnvironmentModel: environmentModelEnv !== null,
  };
};

export const materializeKimiManagedAgentProfile = async (
  providerHomePath: string
): Promise<KimiManagedAgentProfilePaths> => {
  const paths = resolveKimiManagedAgentProfilePaths(providerHomePath);
  await mkdir(paths.profileDir, { recursive: true });
  await mkdir(paths.skillsDirPath, { recursive: true });
  await writeFile(paths.agentFilePath, KIMI_MANAGED_AGENT_YAML, "utf8");
  await writeFile(paths.systemPromptPath, KIMI_MANAGED_SYSTEM_PROMPT, "utf8");
  await writeFile(paths.mcpConfigPath, '{"mcpServers":{}}\n', "utf8");
  return paths;
};
