import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import https from "node:https";
import path from "node:path";
import type { Progress } from "vscode";

type ProgressReporter = Progress<{
  message?: string;
  increment?: number;
}>;

const HTTP_STATUS_OK = 200;
const ONE_HUNDRED_PERCENT = 100;

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

type DownloadRequest = {
  readonly url: string;
  readonly destination: string;
  readonly size: number;
  readonly progress?: ProgressReporter;
  readonly label?: string;
};

export const downloadFile = async ({
  url,
  destination,
  size,
  progress,
  label = "CEF archive",
}: DownloadRequest): Promise<void> => {
  await ensureDirectory(path.dirname(destination));

  await new Promise<void>((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode !== HTTP_STATUS_OK) {
        reject(
          new Error(
            `CEF download failed: HTTP ${response.statusCode ?? "unknown"}`
          )
        );
        response.resume();
        return;
      }

      const totalBytes =
        size > 0
          ? size
          : Number.parseInt(response.headers["content-length"] ?? "0", 10);
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

    request.on("error", (error) => {
      reject(error);
    });
  });
};

export const extractArchive = async (
  archivePath: string,
  destination: string,
  progress?: ProgressReporter,
  label = "CEF runtime"
): Promise<void> => {
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
