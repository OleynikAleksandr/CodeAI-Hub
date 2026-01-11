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
  readonly lastQuestionnaireAt?: string;
  readonly providerId?: string;
  readonly providerSessionId?: string;
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

  const lastQuestionnaireAt =
    typeof value.lastQuestionnaireAt === "string"
      ? value.lastQuestionnaireAt
      : undefined;

  const providerId =
    typeof value.providerId === "string" ? value.providerId : undefined;

  let providerSessionIdCandidate: string | undefined;
  if (typeof value.providerSessionId === "string") {
    providerSessionIdCandidate = value.providerSessionId;
  } else if (typeof value.lastProviderSessionId === "string") {
    providerSessionIdCandidate = value.lastProviderSessionId;
  } else {
    providerSessionIdCandidate = undefined;
  }

  const description =
    typeof value.description === "string" ? value.description : undefined;

  return {
    runId,
    runSlug,
    displayName,
    description,
    createdAt,
    lastQuestionnaireAt,
    providerId,
    providerSessionId: providerSessionIdCandidate,
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

const RUN_COUNTER_PATTERN = /^(\d{3})-/;

const parseRunCounter = (runSlug: string): number | null => {
  const match = RUN_COUNTER_PATTERN.exec(runSlug);
  if (!match) {
    return null;
  }
  const value = Number.parseInt(match[1], 10);
  return Number.isNaN(value) ? null : value;
};

const formatRunCounter = (value: number): string =>
  String(value).padStart(3, "0");

const parseTimestamp = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
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

  async updateLastQuestionnaireAt(
    workspaceRoot: string,
    initiativeSlug: string,
    runSlug: string,
    timestamp = new Date().toISOString()
  ): Promise<RunManifest | null> {
    const manifestPath = resolveRunManifestPath(
      workspaceRoot,
      initiativeSlug,
      runSlug
    );
    const parsed = parseRunManifest(await readJsonFile(manifestPath));
    if (!parsed) {
      return null;
    }

    const updated: RunManifest = {
      ...parsed,
      lastQuestionnaireAt: timestamp,
    };

    await writeFile(
      manifestPath,
      `${JSON.stringify(updated, null, 2)}\n`,
      "utf-8"
    );

    return updated;
  }

  async findLatestQuestionnaireRun(
    workspaceRoot: string,
    initiativeSlug: string
  ): Promise<RunManifest | null> {
    const runs = await this.list(workspaceRoot, initiativeSlug);
    let latest: RunManifest | null = null;
    let latestTimestamp = -1;

    for (const run of runs) {
      const timestamp = parseTimestamp(run.lastQuestionnaireAt);
      if (timestamp === null) {
        continue;
      }
      if (timestamp > latestTimestamp) {
        latest = run;
        latestTimestamp = timestamp;
      }
    }

    return latest;
  }

  async createAutoRun(
    workspaceRoot: string,
    initiativeSlug: string,
    modelLabel: string,
    providerId: string
  ): Promise<RunManifest> {
    const runsRoot = resolveRunsRoot(workspaceRoot, initiativeSlug);
    await mkdir(runsRoot, { recursive: true });

    const modelSlug = toSlug(modelLabel);
    const existing = await listExistingSlugs(runsRoot);
    const existingCounters = existing
      .map((slug) => parseRunCounter(slug))
      .filter((value): value is number => value !== null);
    let counter =
      existingCounters.length > 0 ? Math.max(...existingCounters) + 1 : 1;
    let runSlug = `${formatRunCounter(counter)}-${modelSlug}`;
    while (existing.includes(runSlug)) {
      counter += 1;
      runSlug = `${formatRunCounter(counter)}-${modelSlug}`;
    }

    const runDir = resolveRunDir(workspaceRoot, initiativeSlug, runSlug);
    await mkdir(runDir, { recursive: true });

    const now = new Date().toISOString();
    const manifest: RunManifest = {
      runId: randomUUID(),
      runSlug,
      displayName: runSlug,
      createdAt: now,
      providerId,
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
