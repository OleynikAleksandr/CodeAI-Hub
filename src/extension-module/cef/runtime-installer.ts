import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ExtensionContext, Progress } from "vscode";
import {
  recordCefInstall,
  writeCurrentPointer,
} from "../runtime/runtime-registry";
import { type ManifestEntry, readManifest } from "./manifest";
import { type PlatformKey, resolvePlatformKey } from "./platform";
import {
  downloadFile,
  ensureDirectory,
  extractArchive,
  verifySha1,
} from "./runtime-files";

export type { PlatformKey } from "./platform";

type ProgressReporter = Progress<{
  message?: string;
  increment?: number;
}>;

export interface CefRuntimeInfo {
  readonly platform: PlatformKey;
  readonly runtimeDir: string;
  readonly version: string;
}

const INSTALL_MARKER_FILE = "install.json";
const DOWNLOADS_DIR_NAME = "downloads";

interface InstallMarker {
  readonly cefVersion: string;
  readonly channel: string;
  readonly installedAt: string;
  readonly package: string;
  readonly platform: PlatformKey;
}

const getBaseInstallDir = async (): Promise<string> => {
  const homeDir = process.env.HOME ?? tmpdir();
  const baseDir = path.join(homeDir, ".codeai-hub", "cef");
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
  manifestEntry: ManifestEntry
): Promise<boolean> => {
  const marker = await loadInstallMarker(runtimeDir);
  if (!marker) {
    return false;
  }

  if (marker.cefVersion !== manifestEntry.cefVersion) {
    return false;
  }

  try {
    const releaseDir = path.join(runtimeDir, "Release");
    const stat = await fs.stat(releaseDir);
    return stat.isDirectory();
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
    cefVersion: manifestEntry.cefVersion,
    installedAt: new Date().toISOString(),
    package: manifestEntry.package,
    channel: manifestEntry.channel,
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

const installRuntimeFromArchive = async (
  runtimeDir: string,
  archivePath: string,
  progress?: ProgressReporter
): Promise<void> => {
  const parentDir = path.dirname(runtimeDir);
  await ensureDirectory(parentDir);

  const extractRoot = await fs.mkdtemp(path.join(parentDir, "extract-"));

  try {
    await extractArchive(archivePath, extractRoot, progress);
    const extractedEntries = await fs.readdir(extractRoot);
    if (extractedEntries.length === 0) {
      throw new Error("CEF archive extraction produced no files");
    }

    const extractedRoot = path.join(extractRoot, extractedEntries[0]);
    await fs.rm(runtimeDir, { recursive: true, force: true });
    await fs.rename(extractedRoot, runtimeDir);
  } finally {
    await fs.rm(extractRoot, { recursive: true, force: true }).catch(() => {
      /* ignore */
    });
  }
};

const finalizeCefSetup = async (options: {
  readonly platformDir: string;
  readonly platform: PlatformKey;
  readonly runtimeDir: string;
  readonly manifestEntry: ManifestEntry;
}): Promise<void> => {
  await writeCurrentPointer(
    options.platformDir,
    options.manifestEntry.cefVersion
  );
  await recordCefInstall({
    platform: options.platform,
    version: options.manifestEntry.cefVersion,
    runtimeDir: options.runtimeDir,
  });
};

export const ensureCefRuntime = async (
  context: ExtensionContext,
  progress?: ProgressReporter
): Promise<CefRuntimeInfo> => {
  const manifest = await readManifest(context);
  const platform = resolvePlatformKey();
  const manifestEntry = manifest.platforms[platform];

  if (!manifestEntry) {
    throw new Error(`No CEF distribution configured for ${platform}`);
  }

  const baseDir = await getBaseInstallDir();
  const platformDir = path.join(baseDir, platform);
  const runtimeDir = path.join(platformDir, manifestEntry.cefVersion);

  if (await verifyExistingInstall(runtimeDir, manifestEntry)) {
    progress?.report({ message: "CEF runtime is up to date." });
    await finalizeCefSetup({
      platformDir,
      platform,
      runtimeDir,
      manifestEntry,
    });
    return { version: manifestEntry.cefVersion, platform, runtimeDir };
  }

  progress?.report({ message: "Preparing CEF installation…" });

  await ensureDirectory(platformDir);
  const downloadsDir = await prepareDownload(platformDir);
  const archivePath = path.join(downloadsDir, manifestEntry.package);
  if (await verifySha1(archivePath, manifestEntry.sha1)) {
    progress?.report({ message: "Using cached CEF archive" });
  } else {
    const downloadUrl = new URL(
      manifestEntry.package,
      manifest.baseUrl
    ).toString();

    try {
      await downloadFile({
        url: downloadUrl,
        destination: archivePath,
        size: manifestEntry.size,
        progress,
        label: "CEF runtime",
        localFallbacks: [
          path.join(platformDir, DOWNLOADS_DIR_NAME, manifestEntry.package),
        ],
      });
    } catch (error) {
      throw new Error(
        `CEF runtime download failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (!(await verifySha1(archivePath, manifestEntry.sha1))) {
    throw new Error("Downloaded CEF archive failed checksum validation");
  }

  await installRuntimeFromArchive(runtimeDir, archivePath, progress);
  await writeInstallMarker(runtimeDir, platform, manifestEntry);

  await fs.rm(archivePath, { force: true }).catch(() => {
    /* ignore */
  });

  await finalizeCefSetup({
    platformDir,
    platform,
    runtimeDir,
    manifestEntry,
  });

  return {
    version: manifestEntry.cefVersion,
    platform,
    runtimeDir,
  };
};
