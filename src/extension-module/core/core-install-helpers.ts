import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ExtensionContext, Progress } from "vscode";
import type { PlatformKey } from "../cef/platform";
import {
  DownloadError,
  downloadFile,
  ensureDirectory,
  verifySha1,
} from "../cef/runtime-files";
import { resolveEntryPoint, resolveNodeExecutable } from "./runtime-paths";

export type ProgressReporter = Progress<{
  message?: string;
  increment?: number;
}>;

export interface ManifestEntry {
  readonly coreVersion: string;
  readonly package: string;
  readonly sha1: string;
  readonly size: number;
}

export interface CoreManifest {
  readonly baseUrl: string;
  readonly platforms: Record<string, ManifestEntry>;
  readonly schema: number;
}

const INSTALL_MARKER_FILE = "install.json";
const DOWNLOADS_DIR_NAME = "downloads";

interface InstallMarker {
  readonly coreVersion: string;
  readonly installedAt: string;
  readonly package: string;
  readonly platform: string;
}

export const readCoreManifest = async (
  context: ExtensionContext
): Promise<CoreManifest> => {
  const manifestPath = path.join(
    context.extensionPath,
    "assets",
    "core",
    "manifest.json"
  );
  const content = await fs.readFile(manifestPath, "utf8");
  return JSON.parse(content) as CoreManifest;
};

export const getBaseCoreInstallDir = async (): Promise<string> => {
  const homeDir = process.env.HOME ?? tmpdir();
  const baseDir = path.join(homeDir, ".codeai-hub", "core");
  await ensureDirectory(baseDir);
  return baseDir;
};

const loadCoreInstallMarker = async (
  runtimeDir: string
): Promise<InstallMarker | null> => {
  try {
    const markerPath = path.join(runtimeDir, INSTALL_MARKER_FILE);
    const content = await fs.readFile(markerPath, "utf8");
    return JSON.parse(content) as InstallMarker;
  } catch {
    return null;
  }
};

export const verifyExistingCoreInstall = async (
  runtimeDir: string,
  manifestEntry: ManifestEntry,
  platform: PlatformKey
): Promise<boolean> => {
  const marker = await loadCoreInstallMarker(runtimeDir);
  if (!marker || marker.coreVersion !== manifestEntry.coreVersion) {
    return false;
  }

  try {
    const nodePath = resolveNodeExecutable(runtimeDir, platform as never);
    const entryPoint = resolveEntryPoint(runtimeDir);
    const [nodeStat, entryStat] = await Promise.all([
      fs.stat(nodePath),
      fs.stat(entryPoint),
    ]);
    return nodeStat.isFile() && entryStat.isFile();
  } catch {
    return false;
  }
};

export const writeCoreInstallMarker = async (
  runtimeDir: string,
  platform: PlatformKey,
  manifestEntry: ManifestEntry
): Promise<void> => {
  const marker: InstallMarker = {
    platform,
    coreVersion: manifestEntry.coreVersion,
    installedAt: new Date().toISOString(),
    package: manifestEntry.package,
  };

  const targetPath = path.join(runtimeDir, INSTALL_MARKER_FILE);
  await fs.writeFile(
    targetPath,
    `${JSON.stringify(marker, null, 2)}\n`,
    "utf8"
  );
};

export const prepareCoreDownloadDir = async (
  platformDir: string
): Promise<string> => {
  const downloadsDir = path.join(platformDir, DOWNLOADS_DIR_NAME);
  await ensureDirectory(downloadsDir);
  return downloadsDir;
};

const formatDownloadFailure = (
  error: unknown,
  fallbackLabel: string
): string => {
  if (error instanceof DownloadError) {
    const status = error.statusCode ?? "unknown";
    return `${error.label} (HTTP ${status}) ${error.url}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return `${fallbackLabel}: ${String(error)}`;
};

export const ensureCoreArchiveAvailable = async (
  manifest: CoreManifest,
  manifestEntry: ManifestEntry,
  downloadsDir: string,
  progress?: ProgressReporter
): Promise<string> => {
  const archivePath = path.join(downloadsDir, manifestEntry.package);
  if (await verifySha1(archivePath, manifestEntry.sha1)) {
    progress?.report({ message: "Using cached core archive" });
    return archivePath;
  }

  const downloadUrl = new URL(
    manifestEntry.package,
    manifest.baseUrl
  ).toString();
  const localFallbacks = [
    archivePath,
    path.join(
      process.env.HOME ?? tmpdir(),
      ".codeai-hub",
      "releases",
      manifestEntry.package
    ),
  ];

  try {
    await downloadFile({
      url: downloadUrl,
      destination: archivePath,
      size: manifestEntry.size,
      progress,
      label: "Core orchestrator",
      localFallbacks,
    });
  } catch (error) {
    const details = formatDownloadFailure(
      error,
      "Unknown core orchestrator download error"
    );
    throw new Error(`Core orchestrator download failed: ${details}`);
  }

  return archivePath;
};

export const verifyCoreChecksumIfNeeded = async (
  archivePath: string,
  manifestEntry: ManifestEntry
): Promise<void> => {
  if (!manifestEntry.sha1) {
    return;
  }
  const checksumValid = await verifySha1(archivePath, manifestEntry.sha1);
  if (!checksumValid) {
    throw new Error("SHA-1 checksum verification failed");
  }
};

export const getManifestEntryOrThrow = (
  manifest: CoreManifest,
  platform: PlatformKey
): ManifestEntry => {
  const manifestEntry = manifest.platforms[platform];
  if (!manifestEntry) {
    throw new Error(`No manifest entry for platform: ${platform}`);
  }
  return manifestEntry;
};
