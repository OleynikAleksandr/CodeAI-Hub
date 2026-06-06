import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const readStringArray = (
  value: Record<string, unknown> | null,
  key: string
): readonly string[] => {
  const raw = value?.[key];
  return Array.isArray(raw)
    ? raw.filter((entry): entry is string => typeof entry === "string")
    : [];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const collectPlannedCommandPaths = (
  contractJson: Record<string, unknown> | null
): readonly string[] => {
  if (!(contractJson && isRecord(contractJson.commands))) {
    return [];
  }
  return Object.values(contractJson.commands).flatMap((command) =>
    isRecord(command) ? readStringArray(command, "plannedIntegrationPaths") : []
  );
};

export const collectQualityGatePaths = (
  contractJson: Record<string, unknown> | null
): readonly string[] => [
  ...readStringArray(contractJson, "integratedPaths"),
  ...collectPlannedCommandPaths(contractJson),
];

export const collectRootQualityGatePaths = async (
  workspaceRoot: string
): Promise<readonly string[]> => {
  const entries = await readdir(workspaceRoot).catch(() => []);
  return [
    ...entries.filter((entry) =>
      [
        "package.json",
        "package-lock.json",
        "npm-shrinkwrap.json",
        "pnpm-lock.yaml",
        "yarn.lock",
        "bun.lockb",
        "biome.json",
        "eslint.config.js",
      ].includes(entry)
    ),
    ".husky/pre-commit",
    ".husky/pre-push",
    "scripts/quality-gates",
  ];
};

export const uniqueExistingPaths = async (
  workspaceRoot: string,
  paths: readonly string[]
): Promise<readonly string[]> => {
  const existing: string[] = [];
  for (const relativePath of Array.from(new Set(paths))) {
    if (await stat(path.join(workspaceRoot, relativePath)).catch(() => null)) {
      existing.push(relativePath);
    }
  }
  return existing;
};
