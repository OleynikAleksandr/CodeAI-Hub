import { copyFile, mkdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const DEFAULT_CODEAI_GEMINI_HOME = path.join(
  homedir(),
  ".codeai-hub",
  "providers",
  "gemini",
  "home"
);
const WORKSPACE_FALLBACK_SLUG = "workspace";
const MCP_OAUTH_TOKENS_FILENAME = "mcp-oauth-tokens.json";
const SETTINGS_FILENAME = "settings.json";
const INSTALLATION_ID_FILENAME = "installation_id";
const GOOGLE_ACCOUNTS_FILENAME = "google_accounts.json";
const GLOBAL_MEMORY_FILENAME = "memory.md";
const OAUTH_CREDS_FILENAME = "oauth_creds.json";
const CREDENTIALS_FILENAME = "credentials.json";
const AUTH_BOOTSTRAP_FILENAMES = [
  OAUTH_CREDS_FILENAME,
  CREDENTIALS_FILENAME,
  GOOGLE_ACCOUNTS_FILENAME,
  SETTINGS_FILENAME,
  INSTALLATION_ID_FILENAME,
] as const;

type EnvironmentMap = Readonly<Record<string, string | undefined>>;

interface GeminiStorageStatic {
  getGlobalBinDir(): string;
  getGlobalGeminiDir(): string;
  getGlobalMemoryFilePath(): string;
  getGlobalSettingsPath(): string;
  getGlobalTempDir(): string;
  getGoogleAccountsPath(): string;
  getInstallationIdPath(): string;
  getMcpOAuthTokensPath(): string;
  getOAuthCredsPath(): string;
  getUserCommandsDir(): string;
  getUserPoliciesDir(): string;
}

export interface GeminiStorageModule {
  readonly Storage?: GeminiStorageStatic;
}

export interface GeminiProviderHomeBootstrapOptions {
  readonly legacyGeminiDir?: string;
  readonly providerGeminiDir?: string;
}

export interface GeminiProviderHomeBootstrapResult {
  readonly authAvailable: boolean;
  readonly copiedFiles: string[];
  readonly legacyGeminiDir: string;
  readonly providerGeminiDir: string;
}

const normalizeWorkspaceRuntimeSlug = (value: string): string => {
  const normalized = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "");
  const parts = normalized.match(/[a-z0-9]+/gu);
  return parts?.join("-") || WORKSPACE_FALLBACK_SLUG;
};

const resolveWorkspaceGeminiHome = (workspaceRoot: string): string =>
  path.join(
    workspaceRoot,
    ".codeai-hub",
    normalizeWorkspaceRuntimeSlug(path.basename(workspaceRoot)),
    "runtime",
    "providers",
    "gemini",
    "home"
  );

const resolveGeminiProviderHome = (
  environment: EnvironmentMap = process.env
): string => {
  const explicitHome =
    environment.CODEAI_GEMINI_HOME?.trim() ||
    environment.CODEAI_HUB_GEMINI_HOME?.trim();
  if (explicitHome) {
    return explicitHome;
  }

  const workspaceRoot =
    environment.GEMINI_WORKSPACE_PATH?.trim() ||
    environment.CLAUDE_WORKSPACE_PATH?.trim() ||
    environment.CODEX_WORKSPACE_PATH?.trim();
  if (workspaceRoot) {
    return resolveWorkspaceGeminiHome(path.resolve(workspaceRoot));
  }

  return DEFAULT_CODEAI_GEMINI_HOME;
};

export const resolveGeminiProviderGeminiDir = (
  environment: EnvironmentMap = process.env
): string => path.join(resolveGeminiProviderHome(environment), ".gemini");

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
};

export const bootstrapGeminiProviderHomeFromLegacyAuth = async (
  options: GeminiProviderHomeBootstrapOptions = {}
): Promise<GeminiProviderHomeBootstrapResult> => {
  const providerGeminiDir =
    options.providerGeminiDir ?? resolveGeminiProviderGeminiDir();
  const legacyGeminiDir =
    options.legacyGeminiDir ?? path.join(homedir(), ".gemini");
  const copiedFiles: string[] = [];

  await mkdir(providerGeminiDir, { recursive: true });
  for (const filename of AUTH_BOOTSTRAP_FILENAMES) {
    const targetPath = path.join(providerGeminiDir, filename);
    if (await fileExists(targetPath)) {
      continue;
    }
    const sourcePath = path.join(legacyGeminiDir, filename);
    if (!(await fileExists(sourcePath))) {
      continue;
    }
    await copyFile(sourcePath, targetPath);
    copiedFiles.push(filename);
  }

  return {
    authAvailable:
      (await fileExists(path.join(providerGeminiDir, OAUTH_CREDS_FILENAME))) ||
      (await fileExists(path.join(providerGeminiDir, CREDENTIALS_FILENAME))),
    copiedFiles,
    legacyGeminiDir,
    providerGeminiDir,
  };
};

export const patchGeminiStorageGlobalDir = (
  storageModule: GeminiStorageModule,
  environment: EnvironmentMap = process.env
): boolean => {
  const Storage = storageModule.Storage;
  if (!Storage) {
    return false;
  }

  const geminiDir = resolveGeminiProviderGeminiDir(environment);
  const tempDir = path.join(geminiDir, "tmp");
  Storage.getGlobalGeminiDir = () => geminiDir;
  Storage.getMcpOAuthTokensPath = () =>
    path.join(geminiDir, MCP_OAUTH_TOKENS_FILENAME);
  Storage.getGlobalSettingsPath = () => path.join(geminiDir, SETTINGS_FILENAME);
  Storage.getInstallationIdPath = () =>
    path.join(geminiDir, INSTALLATION_ID_FILENAME);
  Storage.getGoogleAccountsPath = () =>
    path.join(geminiDir, GOOGLE_ACCOUNTS_FILENAME);
  Storage.getUserCommandsDir = () => path.join(geminiDir, "commands");
  Storage.getGlobalMemoryFilePath = () =>
    path.join(geminiDir, GLOBAL_MEMORY_FILENAME);
  Storage.getUserPoliciesDir = () => path.join(geminiDir, "policies");
  Storage.getGlobalTempDir = () => tempDir;
  Storage.getGlobalBinDir = () => path.join(tempDir, "bin");
  Storage.getOAuthCredsPath = () => path.join(geminiDir, OAUTH_CREDS_FILENAME);
  return true;
};
