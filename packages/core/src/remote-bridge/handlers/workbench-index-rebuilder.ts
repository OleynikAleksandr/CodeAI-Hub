import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type {
  SlotEntryRecord,
  WorkbenchCaptureMode,
  WorkbenchIndexFile,
  WorkbenchSlotCaptureState,
  WorkbenchSlotRecord,
} from "./workbench-state-types";

const CAPTURE_LOGS_DIR = path.join(
  homedir(),
  ".codeai-hub",
  "logs",
  "native-request-capture"
);

interface RebuildCandidate {
  readonly mode: WorkbenchCaptureMode;
  readonly record: SlotEntryRecord;
  readonly slotKey: string;
  readonly slotRecord: Omit<WorkbenchSlotRecord, "managed" | "vanilla">;
}

export class WorkbenchIndexRebuilder {
  readonly #captureLogsDir: string;

  constructor(options: { readonly captureLogsDir?: string } = {}) {
    this.#captureLogsDir = options.captureLogsDir ?? CAPTURE_LOGS_DIR;
  }

  async rebuild(): Promise<WorkbenchIndexFile> {
    const candidates = await this.#readCandidates();
    const grouped = new Map<string, RebuildCandidate[]>();
    for (const candidate of candidates) {
      const bucket = grouped.get(candidate.slotKey) ?? [];
      bucket.push(candidate);
      grouped.set(candidate.slotKey, bucket);
    }
    return {
      version: 1,
      slots: [...grouped.values()].map(materializeSlotRecord),
    };
  }

  async #readCandidates(): Promise<readonly RebuildCandidate[]> {
    let entries: readonly string[];
    try {
      entries = await readdir(this.#captureLogsDir);
    } catch {
      return [];
    }
    const candidates = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".jsonl"))
        .map((entry) =>
          this.#readCandidate(path.join(this.#captureLogsDir, entry))
        )
    );
    return candidates.filter((candidate) => candidate !== null);
  }

  async #readCandidate(jsonlPath: string): Promise<RebuildCandidate | null> {
    try {
      const firstLine = (await readFile(jsonlPath, "utf8"))
        .split("\n")
        .find((line) => line.trim().length > 0);
      const startRecord = parseCaptureStartRecord(firstLine);
      if (!startRecord) {
        return null;
      }
      const slotRecord = buildSlotIdentity(startRecord);
      if (!slotRecord) {
        return null;
      }
      const artifactId = path.basename(jsonlPath, ".jsonl");
      const capturedAt = readString(startRecord.timestamp);
      const releaseVersion = readString(startRecord.releaseVersion);
      if (!(capturedAt && releaseVersion)) {
        return null;
      }
      return {
        mode: startRecord.mode,
        record: {
          artifactId,
          capturedAt,
          jsonlPath,
          markdownPath: path.join(path.dirname(jsonlPath), `${artifactId}.md`),
          releaseVersion,
        },
        slotKey: [
          slotRecord.step,
          slotRecord.provider,
          slotRecord.model,
          slotRecord.reasoning,
        ].join("\u0000"),
        slotRecord,
      };
    } catch {
      return null;
    }
  }
}

const materializeSlotRecord = (
  candidates: readonly RebuildCandidate[]
): WorkbenchSlotRecord => {
  const first = candidates[0];
  if (!first) {
    throw new Error("Cannot materialize empty workbench slot");
  }
  return {
    ...first.slotRecord,
    managed: materializeModeState(candidates, "managed"),
    vanilla: materializeModeState(candidates, "vanilla"),
  };
};

const materializeModeState = (
  candidates: readonly RebuildCandidate[],
  mode: WorkbenchCaptureMode
): WorkbenchSlotCaptureState => {
  const records = candidates
    .filter((candidate) => candidate.mode === mode)
    .map((candidate) => candidate.record)
    .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));
  return {
    current: records[0] ?? null,
    previous: records[1] ?? null,
  };
};

const parseCaptureStartRecord = (
  line: string | undefined
): (Record<string, unknown> & { mode: WorkbenchCaptureMode }) | null => {
  if (!line) {
    return null;
  }
  const parsed = JSON.parse(line) as unknown;
  if (!isRecord(parsed) || parsed.type !== "capture_start") {
    return null;
  }
  return parsed.mode === "managed" || parsed.mode === "vanilla"
    ? (parsed as Record<string, unknown> & { mode: WorkbenchCaptureMode })
    : null;
};

const buildSlotIdentity = (
  record: Record<string, unknown>
): Omit<WorkbenchSlotRecord, "managed" | "vanilla"> | null => {
  const appliedTurnConfig = asRecord(record.appliedTurnConfig);
  const provider = readString(record.providerId);
  const model =
    readString(appliedTurnConfig?.modelId) ??
    readString(record.selectedModelId);
  const scenarioMetadata = asRecord(record.scenarioMetadata);
  const step =
    readString(scenarioMetadata?.id) ??
    readString(scenarioMetadata?.scenarioId) ??
    "diagnostic_probe";
  const reasoning = resolveReasoningSlug(provider, appliedTurnConfig);
  if (!(provider && model && reasoning)) {
    return null;
  }
  return { step, provider, model, reasoning };
};

const resolveReasoningSlug = (
  provider: string | null,
  appliedTurnConfig: Record<string, unknown> | null
): string | null => {
  const effort = readString(appliedTurnConfig?.reasoningEffort);
  if (provider === "claude") {
    return appliedTurnConfig?.thinkingEnabled === false
      ? "thinking-off"
      : `thinking-${effort ?? "medium"}`;
  }
  if (provider === "codex") {
    return `reasoning-${effort ?? "medium"}`;
  }
  return null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  isRecord(value) ? value : null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
