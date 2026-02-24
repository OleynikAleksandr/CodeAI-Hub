import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

type TaskTimerTotals = Readonly<Record<string, number>>;

export type PersistedTaskTimerState = {
  readonly schemaVersion: 1;
  readonly workspaces: Readonly<Record<string, TaskTimerTotals>>;
};

const STATE_DIR = ".codeai-hub/state";
const STORAGE_FILE = "task-timers.json";

const emptyState = (): PersistedTaskTimerState => ({
  schemaVersion: 1,
  workspaces: {},
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeTotals = (value: unknown): Record<string, number> => {
  if (!isRecord(value)) {
    return {};
  }
  const result: Record<string, number> = {};
  for (const [nodeId, rawTotal] of Object.entries(value)) {
    if (typeof rawTotal !== "number" || !Number.isFinite(rawTotal)) {
      continue;
    }
    const clamped = Math.max(0, Math.floor(rawTotal));
    if (clamped > 0) {
      result[nodeId] = clamped;
    }
  }
  return result;
};

const normalizeState = (value: unknown): PersistedTaskTimerState => {
  if (!isRecord(value)) {
    return emptyState();
  }

  const schemaVersion = value.schemaVersion;
  if (schemaVersion !== 1) {
    return emptyState();
  }

  const workspacesRaw = value.workspaces;
  if (!isRecord(workspacesRaw)) {
    return emptyState();
  }

  const workspaces: Record<string, TaskTimerTotals> = {};
  for (const [workspaceRoot, totalsRaw] of Object.entries(workspacesRaw)) {
    const normalized = normalizeTotals(totalsRaw);
    if (Object.keys(normalized).length > 0) {
      workspaces[workspaceRoot] = normalized;
    }
  }

  return {
    schemaVersion: 1,
    workspaces,
  };
};

export class TaskTimerStorage {
  private readonly stateDirectory: string;
  private readonly storagePath: string;

  constructor(options?: { readonly stateDirectory?: string }) {
    const home = homedir();
    this.stateDirectory = options?.stateDirectory ?? join(home, STATE_DIR);
    this.storagePath = join(this.stateDirectory, STORAGE_FILE);
  }

  load(): PersistedTaskTimerState {
    if (!existsSync(this.storagePath)) {
      return emptyState();
    }
    try {
      const content = readFileSync(this.storagePath, "utf-8");
      return normalizeState(JSON.parse(content) as unknown);
    } catch {
      return emptyState();
    }
  }

  save(state: PersistedTaskTimerState): void {
    if (!existsSync(this.stateDirectory)) {
      mkdirSync(this.stateDirectory, { recursive: true });
    }

    writeFileSync(this.storagePath, JSON.stringify(state, null, 2), "utf-8");
  }
}
