import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ExtensionContext, Progress } from "vscode";
import type { LauncherManifestEntry } from "./launcher-manifest";
import { readLauncherManifest } from "./launcher-manifest";
import { getLauncherExecutableRelativePath } from "./launcher-paths";
import type { PlatformKey } from "./platform";
import { resolvePlatformKey } from "./platform";
import {
  downloadFile,
  ensureDirectory,
  extractArchive,
  verifySha1,
} from "./runtime-files";

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

type ProgressReporter = Progress<{
  message?: string;
  increment?: number;
}>;

const INSTALL_MARKER_FILE = "install.json";
const DOWNLOADS_DIR_NAME = "downloads";
const LAUNCHER_LABEL = "CodeAIHubLauncher";

type InstallMarker = {
  readonly platform: PlatformKey;
  readonly launcherVersion: string;
  readonly installedAt: string;
  readonly package: string;
};

export type LauncherInstallInfo = {
  readonly platform: PlatformKey;
  readonly version: string;
  readonly installDir: string;
  readonly executablePath: string;
};

const getBaseInstallDir = async (): Promise<string> => {
  const homeDir = process.env.HOME ?? tmpdir();
  const baseDir = path.join(homeDir, ".codeai-hub", "cef-launcher");
  await ensureDirectory(baseDir);
  return baseDir;
};

const loadInstallMarker = async (
  installDir: string
): Promise<InstallMarker | null> => {
  try {
    const markerPath = path.join(installDir, INSTALL_MARKER_FILE);
    const content = await fs.readFile(markerPath, "utf8");
    return JSON.parse(content) as InstallMarker;
  } catch {
    return null;
  }
};

const getExecutablePath = (installDir: string, platform: PlatformKey): string =>
  path.join(installDir, getLauncherExecutableRelativePath(platform));

const verifyExistingInstall = async (
  installDir: string,
  manifestEntry: LauncherManifestEntry,
  platform: PlatformKey
): Promise<boolean> => {
  const marker = await loadInstallMarker(installDir);
  const executablePath = getExecutablePath(installDir, platform);
  const executableExists = await pathExists(executablePath);
  if (!executableExists) {
    return false;
  }

  if (!marker) {
    await writeInstallMarker(installDir, platform, manifestEntry);
    return true;
  }

  return marker.launcherVersion === manifestEntry.launcherVersion;
};

const writeInstallMarker = async (
  installDir: string,
  platform: PlatformKey,
  manifestEntry: LauncherManifestEntry
): Promise<void> => {
  await ensureDirectory(installDir);
  const marker: InstallMarker = {
    platform,
    launcherVersion: manifestEntry.launcherVersion,
    installedAt: new Date().toISOString(),
    package: manifestEntry.package,
  };

  const targetPath = path.join(installDir, INSTALL_MARKER_FILE);
  await fs.writeFile(
    targetPath,
    `${JSON.stringify(marker, null, 2)}\n`,
    "utf8"
  );
};

const prepareDownloadDir = async (platformDir: string): Promise<string> => {
  const downloadsDir = path.join(platformDir, DOWNLOADS_DIR_NAME);
  await ensureDirectory(downloadsDir);
  return downloadsDir;
};

const resolveLegacyInstall = async (
  platformDir: string,
  platform: PlatformKey,
  manifestEntry: LauncherManifestEntry
): Promise<LauncherInstallInfo | null> => {
  const executablePath = path.join(
    platformDir,
    getLauncherExecutableRelativePath(platform)
  );

  if (!(await pathExists(executablePath))) {
    return null;
  }

  await writeInstallMarker(platformDir, platform, manifestEntry);

  return {
    platform,
    version: manifestEntry.launcherVersion,
    installDir: platformDir,
    executablePath,
  };
};

const installFromArchive = async (
  installDir: string,
  archivePath: string,
  platform: PlatformKey,
  progress?: ProgressReporter
): Promise<void> => {
  const parentDir = path.dirname(installDir);
  await ensureDirectory(parentDir);

  const extractRoot = await fs.mkdtemp(
    path.join(parentDir, "launcher-extract-")
  );

  try {
    await extractArchive(archivePath, extractRoot, progress, LAUNCHER_LABEL);
    const extractedEntries = await fs.readdir(extractRoot);
    if (extractedEntries.length === 0) {
      throw new Error("Launcher archive extraction produced no files");
    }

    const extractedRoot = path.join(extractRoot, extractedEntries[0]);
    await fs.rm(installDir, { recursive: true, force: true });
    await fs.rename(extractedRoot, installDir);

    const executablePath = getExecutablePath(installDir, platform);
    try {
      await fs.access(executablePath);
    } catch {
      throw new Error("Launcher executable missing after extraction");
    }
  } finally {
    await fs.rm(extractRoot, { recursive: true, force: true }).catch(() => {
      /* ignore */
    });
  }
};

const resolveBaseUrlOverride = (): string | undefined =>
  process.env.CODEAI_HUB_LAUNCHER_BASE_URL;

export const ensureLauncherInstalled = async (
  context: ExtensionContext,
  progress?: ProgressReporter
): Promise<LauncherInstallInfo> => {
  const manifest = await readLauncherManifest(context);
  const platform = resolvePlatformKey();
  const manifestEntry = manifest.platforms[platform];

  if (!manifestEntry) {
    throw new Error(`No launcher distribution configured for ${platform}`);
  }

  const baseDir = await getBaseInstallDir();
  const platformDir = path.join(baseDir, platform);
  const installDir = path.join(platformDir, manifestEntry.launcherVersion);

  if (await verifyExistingInstall(installDir, manifestEntry, platform)) {
    return {
      platform,
      version: manifestEntry.launcherVersion,
      installDir,
      executablePath: getExecutablePath(installDir, platform),
    };
  }

  const legacyInstall = await resolveLegacyInstall(
    platformDir,
    platform,
    manifestEntry
  );
  if (legacyInstall) {
    return legacyInstall;
  }

  progress?.report({ message: "Preparing CodeAIHubLauncher…" });

  await ensureDirectory(platformDir);
  const downloadsDir = await prepareDownloadDir(platformDir);
  const archivePath = path.join(downloadsDir, manifestEntry.package);
  const baseUrlOverride = resolveBaseUrlOverride();
  const downloadUrl = new URL(
    manifestEntry.package,
    baseUrlOverride ?? manifest.baseUrl
  ).toString();

  const hasArchive =
    (await pathExists(archivePath)) && manifestEntry.sha1
      ? await verifySha1(archivePath, manifestEntry.sha1)
      : false;

  if (hasArchive) {
    progress?.report({ message: "Using cached CodeAIHubLauncher archive" });
  } else {
    await downloadFile({
      url: downloadUrl,
      destination: archivePath,
      size: manifestEntry.size,
      progress,
      label: LAUNCHER_LABEL,
    });

    if (manifestEntry.sha1) {
      const checksumMatches = await verifySha1(archivePath, manifestEntry.sha1);
      if (!checksumMatches) {
        throw new Error("Downloaded launcher failed checksum validation");
      }
    }
  }

  await installFromArchive(installDir, archivePath, platform, progress);
  await writeInstallMarker(installDir, platform, manifestEntry);

  await fs.rm(archivePath, { force: true }).catch(() => {
    /* ignore */
  });

  return {
    platform,
    version: manifestEntry.launcherVersion,
    installDir,
    executablePath: getExecutablePath(installDir, platform),
  };
};
