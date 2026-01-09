import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import {
  resolveRunDir,
  resolveRunManifestPath,
  resolveRunsRoot,
  resolveUniqueSlug,
  toSlug,
} from "./index";
import { InitiativeStore } from "./initiative-store";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export type RunManifest = {
  readonly runId: string;
  readonly runSlug: string;
  readonly displayName: string;
  readonly description?: string;
  readonly createdAt: string;
};

const parseRunManifest = (value: unknown): RunManifest | null => {
  if (!isRecord(value)) {
    return null;
  }

  const runId = value.runId;
  const runSlug = value.runSlug;
  const displayName = value.displayName;
  const createdAt = value.createdAt;

  if (
    typeof runId !== "string" ||
    typeof runSlug !== "string" ||
    typeof displayName !== "string" ||
    typeof createdAt !== "string"
  ) {
    return null;
  }

  const description =
    typeof value.description === "string" ? value.description : undefined;

  return {
    runId,
    runSlug,
    displayName,
    description,
    createdAt,
  };
};

const readJsonFile = async (filePath: string): Promise<unknown | null> => {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
};

const listExistingSlugs = async (rootDir: string): Promise<string[]> => {
  try {
    const entries = await readdir(rootDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
};

export class RunStore {
  private readonly initiativeStore: InitiativeStore;

  constructor(initiativeStore?: InitiativeStore) {
    this.initiativeStore = initiativeStore ?? new InitiativeStore();
  }

  async list(
    workspaceRoot: string,
    initiativeSlug: string
  ): Promise<RunManifest[]> {
    const runsRoot = resolveRunsRoot(workspaceRoot, initiativeSlug);
    const runSlugs = await listExistingSlugs(runsRoot);
    const result: RunManifest[] = [];

    for (const runSlug of runSlugs) {
      const manifestPath = resolveRunManifestPath(
        workspaceRoot,
        initiativeSlug,
        runSlug
      );
      const parsed = parseRunManifest(await readJsonFile(manifestPath));
      if (parsed) {
        result.push(parsed);
      }
    }

    return result;
  }

  async read(
    workspaceRoot: string,
    initiativeSlug: string,
    runSlug: string
  ): Promise<RunManifest | null> {
    const manifestPath = resolveRunManifestPath(
      workspaceRoot,
      initiativeSlug,
      runSlug
    );
    return parseRunManifest(await readJsonFile(manifestPath));
  }

  async create(
    workspaceRoot: string,
    initiativeSlug: string,
    input: { readonly displayName: string; readonly description?: string }
  ): Promise<RunManifest> {
    const runsRoot = resolveRunsRoot(workspaceRoot, initiativeSlug);
    await mkdir(runsRoot, { recursive: true });

    const baseSlug = toSlug(input.displayName);
    const existing = await listExistingSlugs(runsRoot);
    const runSlug = resolveUniqueSlug(baseSlug, existing);

    const runDir = resolveRunDir(workspaceRoot, initiativeSlug, runSlug);
    await mkdir(runDir, { recursive: true });

    const now = new Date().toISOString();
    const manifest: RunManifest = {
      runId: randomUUID(),
      runSlug,
      displayName: input.displayName.trim(),
      description: input.description?.trim() || undefined,
      createdAt: now,
    };

    await writeFile(
      resolveRunManifestPath(workspaceRoot, initiativeSlug, runSlug),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf-8"
    );

    return manifest;
  }

  async selectCurrent(
    workspaceRoot: string,
    initiativeSlug: string,
    runId: string
  ): Promise<void> {
    await this.initiativeStore.update(workspaceRoot, initiativeSlug, {
      currentRunId: runId,
    });
  }
}
