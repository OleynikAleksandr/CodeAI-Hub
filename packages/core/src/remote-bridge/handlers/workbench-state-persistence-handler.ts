import { mkdir, readFile, writeFile } from "node:fs/promises";
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
const STATE_FILENAMES: Record<WorkbenchStateKind, string> = {
  index: "workbench-index.json",
  selection: "capture-workbench.json",
};

export class WorkbenchStatePersistenceHandler {
  readonly #indexRebuilder: Pick<WorkbenchIndexRebuilder, "rebuild">;
  readonly #settingsDir: string;

  constructor(
    options: {
      readonly indexRebuilder?: Pick<WorkbenchIndexRebuilder, "rebuild">;
      readonly settingsDir?: string;
    } = {}
  ) {
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
    await mkdir(this.#settingsDir, { recursive: true });
    await writeFile(
      this.#resolvePath(kind),
      `${JSON.stringify(payload, null, 2)}\n`
    );
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
}

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
