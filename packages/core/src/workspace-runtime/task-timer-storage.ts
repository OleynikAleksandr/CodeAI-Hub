import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

type TaskTimerTotals = Readonly<Record<string, number>>;

export type PersistedTaskTimerState = {
  readonly schemaVersion: 2;
  readonly totals: TaskTimerTotals;
};

const STATE_SUBDIR = ".codeai-hub/state";
const STORAGE_FILE = "task-timers.json";

const LEGACY_STORAGE_PATH = join(
  homedir(),
  ".codeai-hub",
  "state",
  STORAGE_FILE
);

const emptyTotals = (): TaskTimerTotals => ({});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeTotals = (value: unknown): TaskTimerTotals => {
  if (!isRecord(value)) {
    return emptyTotals();
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
  if (!isRecord(value) || value.schemaVersion !== 2) {
    return { schemaVersion: 2, totals: emptyTotals() };
  }
  return {
    schemaVersion: 2,
    totals: normalizeTotals(value.totals),
  };
};

export class TaskTimerStorage {
  private readonly stateDirectory: string;
  private readonly storagePath: string;

  constructor(workspaceRoot: string) {
    this.stateDirectory = join(workspaceRoot, STATE_SUBDIR);
    this.storagePath = join(this.stateDirectory, STORAGE_FILE);
  }

  load(): TaskTimerTotals {
    if (!existsSync(this.storagePath)) {
      return emptyTotals();
    }
    try {
      const content = readFileSync(this.storagePath, "utf-8");
      return normalizeState(JSON.parse(content) as unknown).totals;
    } catch {
      return emptyTotals();
    }
  }

  save(totals: TaskTimerTotals): void {
    if (!existsSync(this.stateDirectory)) {
      mkdirSync(this.stateDirectory, { recursive: true });
    }
    const state: PersistedTaskTimerState = { schemaVersion: 2, totals };
    writeFileSync(this.storagePath, JSON.stringify(state, null, 2), "utf-8");
  }

  /** One-time best-effort removal of the legacy global task-timers.json. */
  static cleanupLegacy(): void {
    try {
      if (existsSync(LEGACY_STORAGE_PATH)) {
        rmSync(LEGACY_STORAGE_PATH);
      }
    } catch {
      // ignore — non-critical cleanup
    }
  }
}
