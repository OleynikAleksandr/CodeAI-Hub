import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
  isWorkbenchArtifactReadPayload,
  type WorkbenchArtifactReadPayload,
} from "./workbench-state-types";

const CAPTURE_LOGS_DIR = path.join(
  homedir(),
  ".codeai-hub",
  "logs",
  "native-request-capture"
);

export type WorkbenchArtifactReadResult =
  | {
      readonly ok: true;
      readonly records: readonly unknown[];
    }
  | {
      readonly error:
        | "invalid_payload"
        | "invalid_jsonl"
        | "path_outside_capture_logs"
        | "read_failed";
      readonly ok: false;
    };

export class WorkbenchArtifactReader {
  readonly #captureLogsDir: string;

  constructor(options: { readonly captureLogsDir?: string } = {}) {
    this.#captureLogsDir = path.resolve(
      options.captureLogsDir ?? CAPTURE_LOGS_DIR
    );
  }

  async read(payload: unknown): Promise<WorkbenchArtifactReadResult> {
    if (!isWorkbenchArtifactReadPayload(payload)) {
      return { ok: false, error: "invalid_payload" };
    }
    const jsonlPath = this.#resolveArtifactPath(payload);
    if (!jsonlPath) {
      return { ok: false, error: "path_outside_capture_logs" };
    }
    try {
      return {
        ok: true,
        records: parseJsonl(await readFile(jsonlPath, "utf8")),
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof SyntaxError ? "invalid_jsonl" : "read_failed",
      };
    }
  }

  #resolveArtifactPath(payload: WorkbenchArtifactReadPayload): string | null {
    const resolved = path.resolve(payload.jsonlPath);
    const relative = path.relative(this.#captureLogsDir, resolved);
    if (
      relative.length === 0 ||
      relative.startsWith("..") ||
      path.isAbsolute(relative)
    ) {
      return null;
    }
    return resolved;
  }
}

const parseJsonl = (text: string): readonly unknown[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as unknown);
