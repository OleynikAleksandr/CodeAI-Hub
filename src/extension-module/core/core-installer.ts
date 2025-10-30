import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ExtensionContext, Progress } from "vscode";
import { type PlatformKey, resolvePlatformKey } from "../cef/platform";
import {
  DownloadError,
  downloadFile,
  ensureDirectory,
  extractArchive,
  verifySha1,
} from "../cef/runtime-files";
import { resolveEntryPoint, resolveNodeExecutable } from "./runtime-paths";

type ProgressReporter = Progress<{
  message?: string;
  increment?: number;
}>;

export type CoreRuntimeInfo = {
  readonly version: string;
  readonly platform: PlatformKey;
  readonly runtimeDir: string;
  readonly nodePath: string;
  readonly entryPoint: string;
};

type ManifestEntry = {
  readonly coreVersion: string;
  readonly package: string;
  readonly size: number;
  readonly sha1: string;
};

type CoreManifest = {
  readonly schema: number;
  readonly baseUrl: string;
  readonly platforms: Record<PlatformKey, ManifestEntry>;
};

const INSTALL_MARKER_FILE = "install.json";
const DOWNLOADS_DIR_NAME = "downloads";

type InstallMarker = {
  readonly platform: PlatformKey;
  readonly coreVersion: string;
  readonly installedAt: string;
  readonly package: string;
};

const readManifest = async (
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

const getBaseInstallDir = async (): Promise<string> => {
  const homeDir = process.env.HOME ?? tmpdir();
  const baseDir = path.join(homeDir, ".codeai-hub", "core");
  await ensureDirectory(baseDir);
  return baseDir;
};

const loadInstallMarker = async (
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

const verifyExistingInstall = async (
  runtimeDir: string,
  manifestEntry: ManifestEntry,
  platform: PlatformKey
): Promise<boolean> => {
  const marker = await loadInstallMarker(runtimeDir);
  if (!marker || marker.coreVersion !== manifestEntry.coreVersion) {
    return false;
  }

  try {
    const nodePath = resolveNodeExecutable(runtimeDir, platform);
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

const writeInstallMarker = async (
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

const prepareDownload = async (platformDir: string): Promise<string> => {
  const downloadsDir = path.join(platformDir, DOWNLOADS_DIR_NAME);
  await ensureDirectory(downloadsDir);
  return downloadsDir;
};

const getManifestEntryOrThrow = (
  manifest: CoreManifest,
  platform: PlatformKey
): ManifestEntry => {
  const manifestEntry = manifest.platforms[platform];
  if (!manifestEntry) {
    throw new Error(`No manifest entry for platform: ${platform}`);
  }
  return manifestEntry;
};

const buildRuntimeInfo = (
  manifestEntry: ManifestEntry,
  runtimeDir: string,
  platform: PlatformKey
): CoreRuntimeInfo => ({
  version: manifestEntry.coreVersion,
  platform,
  runtimeDir,
  nodePath: resolveNodeExecutable(runtimeDir, platform),
  entryPoint: resolveEntryPoint(runtimeDir),
});

const tryReuseExistingInstall = async (
  runtimeDir: string,
  manifestEntry: ManifestEntry,
  platform: PlatformKey,
  progress?: ProgressReporter
): Promise<CoreRuntimeInfo | null> => {
  const existingIsValid = await verifyExistingInstall(
    runtimeDir,
    manifestEntry,
    platform
  );
  if (!existingIsValid) {
    return null;
  }
  progress?.report({ message: "Using existing core installation" });
  return buildRuntimeInfo(manifestEntry, runtimeDir, platform);
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

const ensureArchiveAvailable = async (
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

const verifyChecksumIfNeeded = async (
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

const performInstall = async (
  manifest: CoreManifest,
  platform: PlatformKey,
  baseDir: string,
  progress?: ProgressReporter
): Promise<CoreRuntimeInfo> => {
  const manifestEntry = getManifestEntryOrThrow(manifest, platform);
  const platformDir = path.join(baseDir, platform);
  const runtimeDir = path.join(platformDir, manifestEntry.coreVersion);

  const reused = await tryReuseExistingInstall(
    runtimeDir,
    manifestEntry,
    platform,
    progress
  );
  if (reused) {
    return reused;
  }

  await ensureDirectory(runtimeDir);

  const downloadsDir = await prepareDownload(platformDir);
  const archivePath = await ensureArchiveAvailable(
    manifest,
    manifestEntry,
    downloadsDir,
    progress
  );
  await verifyChecksumIfNeeded(archivePath, manifestEntry);

  progress?.report({ message: "Extracting core orchestrator..." });
  await extractArchive(archivePath, runtimeDir);

  await writeInstallMarker(runtimeDir, platform, manifestEntry);

  progress?.report({ message: "Core orchestrator installed successfully" });

  return buildRuntimeInfo(manifestEntry, runtimeDir, platform);
};

export const ensureCoreInstalled = async (
  context: ExtensionContext,
  progress?: ProgressReporter
): Promise<CoreRuntimeInfo> => {
  const platform = resolvePlatformKey();
  const manifest = await readManifest(context);
  const baseDir = await getBaseInstallDir();

  return await performInstall(manifest, platform, baseDir, progress);
};
