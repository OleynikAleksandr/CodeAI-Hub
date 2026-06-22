import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { WorkbenchIndexRebuilder } from "./workbench-index-rebuilder";
import {
  isWorkbenchIndexFile,
  isWorkbenchSelectionFile,
  isWorkbenchStatePayload,
  type WorkbenchIndexFile,
  type WorkbenchSelectionFile,
  type WorkbenchStateKind,
  type WorkbenchStatePayloadByKind,
} from "./workbench-state-types";

const SETTINGS_DIR = path.join(homedir(), ".codeai-hub", "settings");
const CAPTURE_LOGS_DIR = path.join(
  homedir(),
  ".codeai-hub",
  "logs",
  "native-request-capture"
);
const STATE_FILENAMES: Record<WorkbenchStateKind, string> = {
  index: "workbench-index.json",
  selection: "capture-workbench.json",
};

export class WorkbenchStatePersistenceHandler {
  readonly #captureLogsDir: string;
  readonly #indexRebuilder: Pick<WorkbenchIndexRebuilder, "rebuild">;
  readonly #settingsDir: string;

  constructor(
    options: {
      readonly captureLogsDir?: string;
      readonly indexRebuilder?: Pick<WorkbenchIndexRebuilder, "rebuild">;
      readonly settingsDir?: string;
    } = {}
  ) {
    this.#captureLogsDir = path.resolve(
      options.captureLogsDir ?? CAPTURE_LOGS_DIR
    );
    this.#indexRebuilder =
      options.indexRebuilder ?? new WorkbenchIndexRebuilder();
    this.#settingsDir = options.settingsDir ?? SETTINGS_DIR;
  }

  async load<Kind extends WorkbenchStateKind>(
    kind: Kind
  ): Promise<WorkbenchStatePayloadByKind[Kind] | null> {
    const parsed = await this.#readStateFile(kind);
    if (isWorkbenchStatePayload(kind, parsed)) {
      return parsed;
    }
    if (kind !== "index") {
      return null;
    }
    const rebuilt = await this.#indexRebuilder.rebuild();
    await this.save("index", rebuilt);
    return rebuilt as WorkbenchStatePayloadByKind[Kind];
  }

  async save<Kind extends WorkbenchStateKind>(
    kind: Kind,
    payload: WorkbenchStatePayloadByKind[Kind]
  ): Promise<void> {
    assertValidPayload(kind, payload);
    const previousIndex =
      kind === "index" ? await this.#readStateFile(kind) : null;
    await mkdir(this.#settingsDir, { recursive: true });
    await writeFile(
      this.#resolvePath(kind),
      `${JSON.stringify(payload, null, 2)}\n`
    );
    if (kind === "index" && isWorkbenchIndexFile(previousIndex)) {
      await this.#removeUnreferencedArtifacts(
        previousIndex,
        payload as WorkbenchIndexFile
      );
    }
  }

  #resolvePath(kind: WorkbenchStateKind): string {
    return path.join(this.#settingsDir, STATE_FILENAMES[kind]);
  }

  async #readStateFile(kind: WorkbenchStateKind): Promise<unknown> {
    try {
      return JSON.parse(
        await readFile(this.#resolvePath(kind), "utf8")
      ) as unknown;
    } catch {
      return null;
    }
  }

  async #removeUnreferencedArtifacts(
    previous: WorkbenchIndexFile,
    next: WorkbenchIndexFile
  ): Promise<void> {
    const kept = new Set(collectArtifactPaths(next));
    const stale = [...new Set(collectArtifactPaths(previous))].filter(
      (filePath) => !kept.has(filePath)
    );
    await Promise.all(
      stale.map((filePath) => this.#removeCaptureLog(filePath))
    );
  }

  async #removeCaptureLog(filePath: string): Promise<void> {
    const resolved = path.resolve(filePath);
    const relative = path.relative(this.#captureLogsDir, resolved);
    if (
      relative.length === 0 ||
      relative.startsWith("..") ||
      path.isAbsolute(relative)
    ) {
      return;
    }
    await rm(resolved, { force: true });
  }
}

const collectArtifactPaths = (index: WorkbenchIndexFile): readonly string[] =>
  index.slots.flatMap((slot) =>
    [slot.managed, slot.vanilla].flatMap((state) =>
      [state.current, state.previous].flatMap((record) =>
        record ? [record.jsonlPath, record.markdownPath] : []
      )
    )
  );

const assertValidPayload = <Kind extends WorkbenchStateKind>(
  kind: Kind,
  payload: WorkbenchStatePayloadByKind[Kind]
): void => {
  const valid =
    kind === "index"
      ? isWorkbenchIndexFile(payload as WorkbenchIndexFile)
      : isWorkbenchSelectionFile(payload as WorkbenchSelectionFile);
  if (!valid) {
    throw new Error(`Invalid workbench ${kind} payload`);
  }
};
