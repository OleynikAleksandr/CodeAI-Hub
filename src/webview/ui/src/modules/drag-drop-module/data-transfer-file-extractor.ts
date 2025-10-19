/**
 * DataTransferFileExtractor - normalizes DataTransfer payloads into file paths.
 * Centralizes drop parsing logic for components and drag-drop module classes.
 */

export type DragDropLogger = (
  message: string,
  ...details: readonly unknown[]
) => void;

export type DataTransferExtractionOptions = {
  readonly logger?: DragDropLogger;
  readonly debug?: boolean;
  readonly logPrefix?: string;
};

const WINDOWS_PATH_PATTERN = /^[a-zA-Z]:[\\/]/;

const LINE_SPLIT_REGEX = /\r?\n/;

const normalizeCandidate = (rawValue: string): string | null => {
  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  if (value.startsWith("file://")) {
    const withoutScheme = value.replace("file://", "");
    try {
      return decodeURIComponent(withoutScheme);
    } catch {
      return withoutScheme;
    }
  }

  if (value.startsWith("/") || WINDOWS_PATH_PATTERN.test(value)) {
    return value;
  }

  return null;
};

const forEachEntry = (
  raw: string | null | undefined,
  handler: (entry: string) => void
) => {
  if (!raw) {
    return;
  }

  const lines = raw.split(LINE_SPLIT_REGEX);
  for (const line of lines) {
    if (line.trim()) {
      handler(line);
    }
  }
};

export const extractFilePathsFromDataTransfer = (
  dataTransfer: DataTransfer | null,
  options: DataTransferExtractionOptions = {}
): string[] => {
  if (!dataTransfer) {
    return [];
  }

  const { logger, debug = false, logPrefix = "[DropDataExtractor]" } = options;
  const seen = new Set<string>();
  const results: string[] = [];

  const logDebug = (message: string, ...details: readonly unknown[]) => {
    if (debug && logger) {
      logger(`${logPrefix} ${message}`, ...details);
    }
  };

  const acceptCandidate = (candidate: string, source: string) => {
    if (!seen.has(candidate)) {
      seen.add(candidate);
      results.push(candidate);
      logDebug(`accepted ${candidate} from ${source}`);
    }
  };

  const inspectType = (mime: string) => {
    try {
      const payload = dataTransfer.getData(mime);
      logDebug(`DataTransfer[${mime}]`, payload);
      return payload;
    } catch (error) {
      logDebug(`failed to read DataTransfer[${mime}]`, error);
      return null;
    }
  };

  const mimeTypes = [
    "application/vnd.code.uri-list",
    "text/plain",
    "text/uri-list",
  ] as const;

  for (const mime of mimeTypes) {
    const payload = inspectType(mime);
    forEachEntry(payload, (entry) => {
      const candidate = normalizeCandidate(entry);
      if (candidate) {
        acceptCandidate(candidate, mime);
      } else {
        logDebug(`ignored entry from ${mime}`, entry);
      }
    });
  }

  if (dataTransfer.files && dataTransfer.files.length > 0) {
    for (const file of Array.from(dataTransfer.files)) {
      const candidate = (file as File & { path?: string }).path;
      if (!candidate) {
        continue;
      }
      const normalised = normalizeCandidate(candidate);
      if (normalised) {
        acceptCandidate(normalised, "FileList");
      } else {
        logDebug("ignored FileList entry", candidate);
      }
    }
  }

  logDebug("extraction result", results);
  return results;
};
