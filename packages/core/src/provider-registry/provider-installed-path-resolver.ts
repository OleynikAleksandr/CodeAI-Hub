import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

type ProviderModuleId = "claude" | "codex" | "gemini";

const PROVIDERS_ROOT = path.join(homedir(), ".codeai-hub", "providers");

const resolveInstalledProviderPathFromPointer = (
  providerRoot: string
): string | null => {
  const latestPath = path.join(providerRoot, "latest");
  if (!existsSync(latestPath)) {
    return null;
  }
  try {
    const raw = readFileSync(latestPath, "utf8").trim();
    if (!raw) {
      return null;
    }
    const installDirectory = path.join(providerRoot, raw);
    const installMarker = path.join(installDirectory, "install.json");
    if (!existsSync(installMarker)) {
      return null;
    }
    return installDirectory;
  } catch {
    return null;
  }
};

const resolveInstalledProviderPathByScan = (
  providerRoot: string
): string | null => {
  try {
    const entries = readdirSync(providerRoot, { withFileTypes: true });
    let bestVersion: string | null = null;
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const candidateVersion = entry.name;
      const markerPath = path.join(
        providerRoot,
        candidateVersion,
        "install.json"
      );
      if (!existsSync(markerPath)) {
        continue;
      }
      if (!bestVersion || candidateVersion > bestVersion) {
        bestVersion = candidateVersion;
      }
    }
    if (!bestVersion) {
      return null;
    }
    return path.join(providerRoot, bestVersion);
  } catch {
    return null;
  }
};

const resolveInstalledProviderPath = (
  providerId: ProviderModuleId
): string | null => {
  const providerRoot = path.join(PROVIDERS_ROOT, providerId);
  if (!existsSync(providerRoot)) {
    return null;
  }
  return (
    resolveInstalledProviderPathFromPointer(providerRoot) ??
    resolveInstalledProviderPathByScan(providerRoot)
  );
};

const resolveModuleOverride = (environmentKey: string): string | undefined => {
  const override = process.env[environmentKey];
  return override?.trim() ? override : undefined;
};

const resolveProviderModulePath = (
  providerId: ProviderModuleId,
  environmentKey: string
): string | undefined =>
  resolveModuleOverride(environmentKey) ??
  resolveInstalledProviderPath(providerId) ??
  undefined;

export const resolveClaudeModulePath = (): string | undefined =>
  resolveProviderModulePath("claude", "CLAUDE_MODULE_PATH");

export const resolveCodexModulePath = (): string | undefined =>
  resolveProviderModulePath("codex", "CODEX_MODULE_PATH");

export const resolveGeminiModulePath = (): string | undefined =>
  resolveProviderModulePath("gemini", "GEMINI_MODULE_PATH");
