import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import type { IncomingMessage } from "node:http";
import https from "node:https";
import path from "node:path";
import type { Progress } from "vscode";

type ProgressReporter = Progress<{
  message?: string;
  increment?: number;
}>;

type DownloadRequest = {
  readonly url: string;
  readonly destination: string;
  readonly size: number;
  readonly progress?: ProgressReporter;
  readonly label?: string;
};

type StreamOptions = {
  readonly response: IncomingMessage;
  readonly destination: string;
  readonly totalBytes: number;
  readonly progress?: ProgressReporter;
  readonly label: string;
};

type ExtractOptions = {
  readonly archivePath: string;
  readonly destination: string;
  readonly progress?: ProgressReporter;
  readonly label: string;
};

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

export const downloadFile = async ({
  url,
  destination,
  size,
  progress,
  label = "CEF archive",
}: DownloadRequest): Promise<void> => {
  await ensureDirectory(path.dirname(destination));

  let currentUrl = url;

  for (let attempt = 0; attempt <= MAX_HTTP_REDIRECTS; attempt += 1) {
    const response = await getResponse(currentUrl);
    const statusCode = response.statusCode ?? 0;

    if (REDIRECT_STATUS_CODES.has(statusCode)) {
      response.resume();
      currentUrl = resolveRedirectLocation(currentUrl, response);
      continue;
    }

    if (statusCode !== HTTP_STATUS_OK) {
      response.resume();
      throw new Error(`CEF download failed: HTTP ${statusCode}`);
    }

    const contentLength = Number.parseInt(
      response.headers["content-length"] ?? "0",
      10
    );
    const totalBytes = size > 0 ? size : contentLength;

    await streamResponseToFile({
      response,
      destination,
      totalBytes,
      progress,
      label,
    });
    return;
  }

  throw new Error("CEF download failed: too many redirects");
};

const extractWithTar = async ({
  archivePath,
  destination,
  progress,
  label,
}: ExtractOptions): Promise<void> => {
  progress?.report({ message: `Extracting ${label}…` });
  await ensureDirectory(destination);

  await new Promise<void>((resolve, reject) => {
    execFile("tar", ["-xjf", archivePath, "-C", destination], (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

export const extractArchive = async (
  archivePath: string,
  destination: string,
  progress?: ProgressReporter,
  label = "CEF runtime"
): Promise<void> => {
  await extractWithTar({ archivePath, destination, progress, label });
};
