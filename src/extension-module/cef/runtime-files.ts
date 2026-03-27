import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import type { IncomingMessage } from "node:http";
import https from "node:https";
import path from "node:path";
import type { Progress } from "vscode";
import { extractArchiveWithTar } from "./tar-utils";

type ProgressReporter = Progress<{
  message?: string;
  increment?: number;
}>;

interface DownloadRequest {
  readonly destination: string;
  readonly label?: string;
  readonly localFallbacks?: readonly string[];
  readonly progress?: ProgressReporter;
  readonly size: number;
  readonly url: string;
}

interface StreamOptions {
  readonly destination: string;
  readonly label: string;
  readonly progress?: ProgressReporter;
  readonly response: IncomingMessage;
  readonly totalBytes: number;
}

const HTTP_STATUS_OK = 200;
const HTTP_STATUS_MOVED_PERMANENTLY = 301;
const HTTP_STATUS_FOUND = 302;
const HTTP_STATUS_SEE_OTHER = 303;
const HTTP_STATUS_TEMPORARY_REDIRECT = 307;
const HTTP_STATUS_PERMANENT_REDIRECT = 308;
const MAX_HTTP_REDIRECTS = 5;
const ONE_HUNDRED_PERCENT = 100;

const REDIRECT_STATUS_CODES = new Set<number>([
  HTTP_STATUS_MOVED_PERMANENTLY,
  HTTP_STATUS_FOUND,
  HTTP_STATUS_SEE_OTHER,
  HTTP_STATUS_TEMPORARY_REDIRECT,
  HTTP_STATUS_PERMANENT_REDIRECT,
]);

const FILE_PROTOCOL_REGEX = /^file:\/\//;

export const ensureDirectory = async (target: string): Promise<void> => {
  await fs.mkdir(target, { recursive: true });
};

export const verifySha1 = (
  filePath: string,
  expectedSha1: string
): Promise<boolean> => {
  const lowerExpected = expectedSha1.toLowerCase();

  return new Promise<boolean>((resolve) => {
    const hash = createHash("sha1");
    const stream = createReadStream(filePath);

    stream.on("data", (chunk) => {
      if (typeof chunk === "string") {
        hash.update(Buffer.from(chunk));
        return;
      }
      hash.update(chunk as Buffer);
    });

    stream.on("error", () => {
      resolve(false);
    });

    stream.on("end", () => {
      const digest = hash.digest("hex");
      resolve(digest.toLowerCase() === lowerExpected);
    });
  });
};

const getResponse = (targetUrl: string): Promise<IncomingMessage> =>
  new Promise((resolve, reject) => {
    const request = https.get(targetUrl, resolve);
    request.on("error", reject);
  });

const streamResponseToFile = async ({
  response,
  destination,
  totalBytes,
  progress,
  label,
}: StreamOptions): Promise<void> =>
  new Promise((resolve, reject) => {
    let received = 0;
    const fileStream = createWriteStream(destination);

    response.on("data", (chunk: Buffer) => {
      received += chunk.length;
      if (totalBytes > 0 && progress) {
        const percentage = Math.min(
          ONE_HUNDRED_PERCENT,
          Math.round((received / totalBytes) * ONE_HUNDRED_PERCENT)
        );
        progress.report({ message: `Downloading ${label}… ${percentage}%` });
      }
    });

    response.on("error", (error) => {
      fileStream.close();
      reject(error);
    });

    fileStream.on("error", (error) => {
      response.destroy();
      reject(error);
    });

    fileStream.on("finish", () => {
      fileStream.close();
      resolve();
    });

    response.pipe(fileStream);
  });

const resolveRedirectLocation = (
  currentUrl: string,
  response: IncomingMessage
): string => {
  const location = response.headers.location;
  if (!location) {
    throw new Error("CEF download failed: missing redirect location");
  }

  return new URL(location, currentUrl).toString();
};

const copyFromLocalFallbacks = async (
  destination: string,
  label: string,
  progress: ProgressReporter | undefined,
  localFallbacks: readonly string[]
): Promise<boolean> => {
  for (const candidate of localFallbacks) {
    if (!candidate) {
      continue;
    }
    try {
      const stats = await fs.stat(candidate);
      if (!stats.isFile()) {
        continue;
      }
      await fs.copyFile(candidate, destination);
      progress?.report?.({
        message: `Using cached ${label} from ${candidate}`,
        increment: ONE_HUNDRED_PERCENT,
      });
      return true;
    } catch {
      /* ignore missing fallback */
    }
  }
  return false;
};

const performHttpDownload = async (
  url: string,
  request: {
    readonly destination: string;
    readonly size: number;
    readonly progress?: ProgressReporter;
    readonly label: string;
  },
  attempt = 0
): Promise<void> => {
  if (attempt > MAX_HTTP_REDIRECTS) {
    throw new DownloadError({
      label: request.label,
      url,
      cause: new Error("Too many redirects"),
    });
  }

  const response = await getResponse(url);
  const statusCode = response.statusCode ?? 0;

  if (REDIRECT_STATUS_CODES.has(statusCode)) {
    response.resume();
    const nextUrl = resolveRedirectLocation(url, response);
    await performHttpDownload(nextUrl, request, attempt + 1);
    return;
  }

  if (statusCode !== HTTP_STATUS_OK) {
    response.resume();
    throw new DownloadError({
      label: request.label,
      url,
      statusCode,
    });
  }

  const contentLength = Number.parseInt(
    response.headers["content-length"] ?? "0",
    10
  );
  const totalBytes = request.size > 0 ? request.size : contentLength;

  await streamResponseToFile({
    response,
    destination: request.destination,
    totalBytes,
    progress: request.progress,
    label: request.label,
  });
};

export class DownloadError extends Error {
  readonly statusCode?: number;
  readonly url: string;
  readonly label: string;

  constructor(options: {
    readonly label: string;
    readonly url: string;
    readonly statusCode?: number;
    readonly cause?: unknown;
  }) {
    const statusPart =
      typeof options.statusCode === "number"
        ? ` (HTTP ${options.statusCode})`
        : "";
    super(`${options.label} download failed${statusPart}: ${options.url}`);
    if (options.cause !== undefined) {
      (this as Partial<Error> & { cause?: unknown }).cause = options.cause;
    }
    this.name = "DownloadError";
    this.statusCode = options.statusCode;
    this.url = options.url;
    this.label = options.label;
  }
}

export const downloadFile = async ({
  url,
  destination,
  size,
  progress,
  label = "CEF archive",
  localFallbacks = [],
}: DownloadRequest): Promise<void> => {
  await ensureDirectory(path.dirname(destination));
  const copied = await copyFromLocalFallbacks(
    destination,
    label,
    progress,
    localFallbacks
  );
  if (copied) {
    return;
  }

  // Handle file:// URLs by converting to filesystem path
  if (url.startsWith("file://")) {
    const filePath = decodeURIComponent(url.replace(FILE_PROTOCOL_REGEX, ""));
    try {
      await fs.copyFile(filePath, destination);
      progress?.report({
        message: `Using local ${label} from ${filePath}`,
        increment: ONE_HUNDRED_PERCENT,
      });
      return;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to copy local ${label}: ${msg}`);
    }
  }

  await performHttpDownload(url, { destination, size, progress, label });
};

export const extractArchive = async (
  archivePath: string,
  destination: string,
  progress?: ProgressReporter,
  label = "CEF runtime"
): Promise<void> => {
  await ensureDirectory(destination);
  await extractArchiveWithTar({
    archivePath,
    destination,
    label,
    onProgress: (message) => progress?.report({ message }),
  });
};
