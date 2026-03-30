import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const CLAUDE_OAUTH_ENV_KEY = "CLAUDE_CODE_OAUTH_TOKEN";
const CLAUDE_OAUTH_STORE_SERVICE = "Claude Code-credentials";
const MAC_SECURITY = "/usr/bin/security";
const WINDOWS_POWERSHELL = "powershell.exe";
const TOKEN_FIELD_CANDIDATES = [
  "accessToken",
  "access_token",
  "oauthToken",
  "oauth_token",
  "token",
] as const;
const WHITESPACE_PATTERN = /\s/;
interface ExtractTokenOptions {
  readonly allowRawToken?: boolean;
}

const isLikelyRawToken = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length < 24) {
    return false;
  }
  if (WHITESPACE_PATTERN.test(trimmed)) {
    return false;
  }
  return true;
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

const extractTokenFromRawPayload = (
  raw: string,
  options?: ExtractTokenOptions
): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const tokenFromJson = extractTokenFromCredentialPayload(parsed);
    if (tokenFromJson) {
      return tokenFromJson;
    }
  } catch {
    // ignore and fallback to raw token detection below
  }

  if ((options?.allowRawToken ?? true) && isLikelyRawToken(trimmed)) {
    return trimmed;
  }

  return null;
};

const readTokenFromCredentialsFile = async (
  filePath: string
): Promise<string | null> => {
  try {
    const raw = await readFile(filePath, "utf8");
    return extractTokenFromRawPayload(raw, { allowRawToken: true });
  } catch {
    return null;
  }
};

const runCommandForToken = async (payload: {
  readonly command: string;
  readonly args: readonly string[];
  readonly allowRawToken?: boolean;
}): Promise<string | null> => {
  try {
    const { stdout } = await execFileAsync(payload.command, payload.args, {
      windowsHide: true,
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    });
    return extractTokenFromRawPayload(stdout, {
      allowRawToken: payload.allowRawToken,
    });
  } catch {
    return null;
  }
};

const readTokenFromMacKeychain = async (payload?: {
  readonly allowRawToken?: boolean;
}): Promise<string | null> =>
  await runCommandForToken({
    // In GUI-launched processes PATH can miss /usr/bin; avoid relying on PATH.
    command: MAC_SECURITY,
    args: ["find-generic-password", "-s", CLAUDE_OAUTH_STORE_SERVICE, "-w"],
    allowRawToken: payload?.allowRawToken,
  });

const LINUX_SECRET_LOOKUP_QUERIES: ReadonlyArray<readonly string[]> = [
  ["service", CLAUDE_OAUTH_STORE_SERVICE],
  ["application", CLAUDE_OAUTH_STORE_SERVICE],
  ["target", CLAUDE_OAUTH_STORE_SERVICE],
];

const readTokenFromLinuxSecretStore = async (payload?: {
  readonly allowRawToken?: boolean;
}): Promise<string | null> => {
  for (const query of LINUX_SECRET_LOOKUP_QUERIES) {
    const token = await runCommandForToken({
      command: "secret-tool",
      args: ["lookup", ...query],
      allowRawToken: payload?.allowRawToken,
    });
    if (token) {
      return token;
    }
  }
  return null;
};

const WINDOWS_CREDENTIAL_TARGETS = [
  CLAUDE_OAUTH_STORE_SERVICE,
  "Claude Code Credentials",
] as const;

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

const readTokenFromWindowsCredentialStore = async (payload?: {
  readonly allowRawToken?: boolean;
}): Promise<string | null> =>
  await runCommandForToken({
    command: WINDOWS_POWERSHELL,
    args: [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      buildWindowsCredentialReadScript(),
    ],
    allowRawToken: payload?.allowRawToken,
  });

const readTokenFromPlatformStore = async (payload?: {
  readonly allowRawToken?: boolean;
}): Promise<string | null> => {
  if (process.platform === "darwin") {
    return await readTokenFromMacKeychain({
      allowRawToken: payload?.allowRawToken,
    });
  }
  if (process.platform === "linux") {
    return await readTokenFromLinuxSecretStore({
      allowRawToken: payload?.allowRawToken,
    });
  }
  if (process.platform === "win32") {
    return await readTokenFromWindowsCredentialStore({
      allowRawToken: payload?.allowRawToken,
    });
  }
  return null;
};

export const readClaudeOAuthToken = async (payload: {
  readonly credentialPaths: readonly string[];
  readonly allowRawPlatformToken?: boolean;
}): Promise<string | null> => {
  for (const filePath of payload.credentialPaths) {
    const token = await readTokenFromCredentialsFile(filePath);
    if (token) {
      return token;
    }
  }

  return await readTokenFromPlatformStore({
    allowRawToken: payload.allowRawPlatformToken ?? true,
  });
};
