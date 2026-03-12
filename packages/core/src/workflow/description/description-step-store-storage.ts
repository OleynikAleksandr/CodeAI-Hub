import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Logger } from "../../telemetry/logger";

export type DescriptionStepStoreLogger = {
  warn(message: string, context?: Record<string, unknown>): void;
};

const DEFAULT_LOGGER = new Logger();

function ignoreFailure(): undefined {
  return;
}

const buildTempStatePath = (filePath: string): string =>
  `${filePath}.tmp-${process.pid}-${Date.now()}`;

export const resolveDescriptionStepStoreLogger = (
  logger?: DescriptionStepStoreLogger
): DescriptionStepStoreLogger => logger ?? DEFAULT_LOGGER;

export const readDescriptionStepJson = async <T>(
  filePath: string,
  logger: DescriptionStepStoreLogger
): Promise<T | null> => {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === "ENOENT") {
      return null;
    }
    logger.warn("Failed to read description step snapshot", {
      filePath,
      code: candidate.code ?? null,
      error: candidate.message,
    });
    return null;
  }
};

export const writeDescriptionStepJson = async (
  filePath: string,
  value: unknown
): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = buildTempStatePath(filePath);
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  try {
    await rename(tempPath, filePath);
  } catch (error) {
    await unlink(tempPath).catch(ignoreFailure);
    throw error;
  }
};

export class SerializedWorkspaceWriter {
  private readonly queue = new Map<string, Promise<void>>();

  serialize<T>(queueKey: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.queue.get(queueKey) ?? Promise.resolve();
    const next = previous.catch(ignoreFailure).then(operation);
    const completion = next.then(ignoreFailure, ignoreFailure);
    this.queue.set(queueKey, completion);
    return next.finally(() => {
      if (this.queue.get(queueKey) === completion) {
        this.queue.delete(queueKey);
      }
    });
  }
}
