import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Progress } from "vscode";
import type {
  LauncherManifest,
  LauncherManifestEntry,
} from "./launcher-manifest";
import { getLauncherExecutableRelativePath } from "./launcher-paths";
import { collectMissingLauncherPaths } from "./launcher-runtime-integrity";
import type { PlatformKey } from "./platform";
import {
  downloadFile,
  ensureDirectory,
  extractArchive,
  verifySha1,
} from "./runtime-files";

export type ProgressReporter = Progress<{
  message?: string;
  increment?: number;
}>;

export interface InstallMarker {
  readonly installedAt: string;
  readonly launcherVersion: string;
  readonly package: string;
  readonly platform: PlatformKey;
}

export const INSTALL_MARKER_FILE = "install.json";
export const DOWNLOADS_DIR_NAME = "downloads";
export const LAUNCHER_LABEL = "CodeAIHubLauncher";

export const pathExists = async (targetPath: string): Promise<boolean> =>
  fs.access(targetPath).then(
    () => true,
    () => false
  );

export const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const getBaseInstallDir = async (): Promise<string> => {
  const homeDir = process.env.HOME ?? tmpdir();
  const baseDir = path.join(homeDir, ".codeai-hub", "packages", "launcher");
  await ensureDirectory(baseDir);
  return baseDir;
};

export const getLegacyBaseInstallDir = async (): Promise<string> => {
  const homeDir = process.env.HOME ?? tmpdir();
  const legacyDir = path.join(homeDir, ".codeai-hub", "cef-launcher");
  await ensureDirectory(legacyDir);
  return legacyDir;
};

export const getInstallPaths = async (
  platform: PlatformKey,
  version: string
): Promise<{
  readonly platformDir: string;
  readonly installDir: string;
  readonly legacyPlatformDir: string;
  readonly legacyInstallDir: string;
}> => {
  const baseDir = await getBaseInstallDir();
  const legacyBaseDir = await getLegacyBaseInstallDir();

  const platformDir = path.join(baseDir, platform);
  const installDir = path.join(platformDir, version);
  const legacyPlatformDir = path.join(legacyBaseDir, platform);
  const legacyInstallDir = path.join(legacyPlatformDir, version);

  return { platformDir, installDir, legacyPlatformDir, legacyInstallDir };
};

export const loadInstallMarker = async (
  installDir: string
): Promise<InstallMarker | null> => {
  try {
    const markerPath = path.join(installDir, INSTALL_MARKER_FILE);
    return JSON.parse(await fs.readFile(markerPath, "utf8")) as InstallMarker;
  } catch {
    return null;
  }
};

export const getExecutablePath = (
  installDir: string,
  platform: PlatformKey
): string => path.join(installDir, getLauncherExecutableRelativePath(platform));

export const verifyExistingInstall = async (
  installDir: string,
  manifestEntry: LauncherManifestEntry,
  platform: PlatformKey
): Promise<boolean> => {
  const marker = await loadInstallMarker(installDir);
  const missingPaths = await collectMissingLauncherPaths(
    installDir,
    platform,
    pathExists
  );
  if (missingPaths.length > 0) {
    return false;
  }
  if (!marker) {
    await writeInstallMarker(installDir, platform, manifestEntry);
    return true;
  }
  return marker.launcherVersion === manifestEntry.launcherVersion;
};

export const writeInstallMarker = async (
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
  await fs.writeFile(
    path.join(installDir, INSTALL_MARKER_FILE),
    `${JSON.stringify(marker, null, 2)}\n`,
    "utf8"
  );
};

export const prepareDownloadDir = async (
  platformDir: string
): Promise<string> => {
  const downloadsDir = path.join(platformDir, DOWNLOADS_DIR_NAME);
  await ensureDirectory(downloadsDir);
  return downloadsDir;
};

export const resolveLegacyInstall = async (
  platformDir: string,
  platform: PlatformKey,
  manifestEntry: LauncherManifestEntry,
  legacyPlatformDir?: string
): Promise<ReturnType<typeof buildInstallInfo> | null> => {
  const candidates = [platformDir, legacyPlatformDir].filter(
    Boolean
  ) as string[];

  for (const candidate of candidates) {
    const executablePath = path.join(
      candidate,
      getLauncherExecutableRelativePath(platform)
    );
    if (!(await pathExists(executablePath))) {
      continue;
    }
    await writeInstallMarker(candidate, platform, manifestEntry);
    return buildInstallInfo(platform, manifestEntry, candidate);
  }

  return null;
};

export const installFromArchive = async (
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
    const missingPaths = await collectMissingLauncherPaths(
      installDir,
      platform,
      pathExists
    );
    if (missingPaths.length > 0) {
      throw new Error(
        `Launcher runtime integrity check failed: missing required files:\n${missingPaths.join("\n")}`
      );
    }
  } finally {
    await fs.rm(extractRoot, { recursive: true, force: true }).catch(() => {
      /* ignore */
    });
  }
};

export const getManifestEntryOrThrow = (
  manifest: LauncherManifest,
  platform: PlatformKey
): LauncherManifestEntry => {
  const manifestEntry = manifest.platforms[platform];
  if (!manifestEntry) {
    throw new Error(`No launcher distribution configured for ${platform}`);
  }
  return manifestEntry;
};

export function buildInstallInfo(
  platform: PlatformKey,
  manifestEntry: LauncherManifestEntry,
  installDir: string
): {
  readonly platform: PlatformKey;
  readonly version: string;
  readonly installDir: string;
  readonly executablePath: string;
} {
  return {
    platform,
    version: manifestEntry.launcherVersion,
    installDir,
    executablePath: getExecutablePath(installDir, platform),
  };
}

export const tryReuseExistingLauncher = async (
  installDir: string,
  manifestEntry: LauncherManifestEntry,
  platform: PlatformKey,
  progress?: ProgressReporter
): Promise<ReturnType<typeof buildInstallInfo> | null> => {
  const existing = await verifyExistingInstall(
    installDir,
    manifestEntry,
    platform
  );
  if (!existing) {
    return null;
  }
  progress?.report({ message: "CodeAIHubLauncher is up to date." });
  return buildInstallInfo(platform, manifestEntry, installDir);
};

export const ensureArchiveAvailable = async (
  manifestEntry: LauncherManifestEntry,
  downloadUrl: string,
  archivePath: string,
  progress?: ProgressReporter
): Promise<void> => {
  const hasArchive =
    (await pathExists(archivePath)) && manifestEntry.sha1
      ? await verifySha1(archivePath, manifestEntry.sha1)
      : false;
  if (hasArchive) {
    progress?.report({ message: "Using cached CodeAIHubLauncher archive" });
    return;
  }
  const fallbackPaths = [
    archivePath,
    path.join(
      process.env.HOME ?? tmpdir(),
      ".codeai-hub",
      "releases",
      manifestEntry.package
    ),
  ];
  await downloadFile({
    url: downloadUrl,
    destination: archivePath,
    size: manifestEntry.size,
    progress,
    label: LAUNCHER_LABEL,
    localFallbacks: fallbackPaths,
  }).catch((error) => {
    const reason = toErrorMessage(error);
    throw new Error(`Launcher download failed: ${reason}`);
  });
  if (manifestEntry.sha1) {
    const checksumMatches = await verifySha1(archivePath, manifestEntry.sha1);
    if (!checksumMatches) {
      throw new Error("Downloaded launcher failed checksum validation");
    }
  }
};
