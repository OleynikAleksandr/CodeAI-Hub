import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CLAUDE_OAUTH_ENV_KEY = "CLAUDE_CODE_OAUTH_TOKEN";
const CLAUDE_OAUTH_STORE_SERVICE = "Claude Code-credentials";
const CLAUDE_CREDENTIALS_FILENAME = ".credentials.json";
const DEFAULT_CODEAI_CLAUDE_HOME = path.join(
  homedir(),
  ".codeai-hub",
  "providers",
  "claude",
  "home"
);
const MAC_SECURITY = "/usr/bin/security";
const WINDOWS_POWERSHELL = "powershell.exe";
const TOKEN_FIELD_CANDIDATES = [
  "accessToken",
  "access_token",
  "oauthToken",
  "oauth_token",
  "token",
] as const;
const LINUX_SECRET_LOOKUP_QUERIES: ReadonlyArray<readonly string[]> = [
  ["service", CLAUDE_OAUTH_STORE_SERVICE],
  ["application", CLAUDE_OAUTH_STORE_SERVICE],
  ["target", CLAUDE_OAUTH_STORE_SERVICE],
];
const WINDOWS_CREDENTIAL_TARGETS = [
  CLAUDE_OAUTH_STORE_SERVICE,
  "Claude Code Credentials",
] as const;
const WHITESPACE_PATTERN = /\s/;

const isLikelyRawToken = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.length >= 24 && !WHITESPACE_PATTERN.test(trimmed);
};

const extractTokenFromCredentialPayload = (value: unknown): string | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const field of TOKEN_FIELD_CANDIDATES) {
    const candidate = record[field];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  for (const nestedValue of Object.values(record)) {
    const token = extractTokenFromCredentialPayload(nestedValue);
    if (token) {
      return token;
    }
  }

  return null;
};

const extractTokenFromRawPayload = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return extractTokenFromCredentialPayload(parsed) ?? null;
  } catch {
    return isLikelyRawToken(trimmed) ? trimmed : null;
  }
};

const readTokenFromCredentialsFile = async (
  filePath: string
): Promise<string | null> => {
  try {
    return extractTokenFromRawPayload(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
};

const runCommandForToken = async (
  command: string,
  args: readonly string[]
): Promise<string | null> => {
  try {
    const { stdout } = await execFileAsync(command, args, {
      windowsHide: true,
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    });
    return extractTokenFromRawPayload(stdout);
  } catch {
    return null;
  }
};

const buildWindowsCredentialReadScript = (): string => {
  const escapedTargets = WINDOWS_CREDENTIAL_TARGETS.map(
    (target) => `'${target.replace(/'/g, "''")}'`
  );
  return [
    "$ErrorActionPreference='SilentlyContinue'",
    "if (-not (Get-Command Get-StoredCredential -ErrorAction SilentlyContinue)) { exit 0 }",
    `$targets=@(${escapedTargets.join(",")})`,
    "foreach ($target in $targets) {",
    "  $credential=Get-StoredCredential -Target $target",
    "  if ($credential -and $credential.Password) {",
    "    Write-Output $credential.Password",
    "    exit 0",
    "  }",
    "}",
    "exit 0",
  ].join(";");
};

const readTokenFromPlatformStore = async (): Promise<string | null> => {
  if (process.platform === "darwin") {
    return await runCommandForToken(MAC_SECURITY, [
      "find-generic-password",
      "-s",
      CLAUDE_OAUTH_STORE_SERVICE,
      "-w",
    ]);
  }

  if (process.platform === "linux") {
    for (const query of LINUX_SECRET_LOOKUP_QUERIES) {
      const token = await runCommandForToken("secret-tool", [
        "lookup",
        ...query,
      ]);
      if (token) {
        return token;
      }
    }
    return null;
  }

  if (process.platform === "win32") {
    return await runCommandForToken(WINDOWS_POWERSHELL, [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      buildWindowsCredentialReadScript(),
    ]);
  }

  return null;
};

const resolveClaudeCredentialsPaths = (): readonly string[] => {
  const claudeHome =
    process.env.CODEAI_CLAUDE_HOME?.trim() || DEFAULT_CODEAI_CLAUDE_HOME;
  return [
    path.join(claudeHome, ".claude", CLAUDE_CREDENTIALS_FILENAME),
    path.join(homedir(), ".claude", CLAUDE_CREDENTIALS_FILENAME),
  ];
};

export const resolveClaudeUsageOAuthToken = async (
  environment: NodeJS.ProcessEnv | undefined
): Promise<string | null> => {
  const fromEnvironment = environment?.[CLAUDE_OAUTH_ENV_KEY]?.trim();
  if (fromEnvironment) {
    return fromEnvironment;
  }

  const fromProcessEnvironment = process.env[CLAUDE_OAUTH_ENV_KEY]?.trim();
  if (fromProcessEnvironment) {
    return fromProcessEnvironment;
  }

  for (const filePath of resolveClaudeCredentialsPaths()) {
    const token = await readTokenFromCredentialsFile(filePath);
    if (token) {
      return token;
    }
  }

  return await readTokenFromPlatformStore();
};
