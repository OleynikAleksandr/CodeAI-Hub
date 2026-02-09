import { promises as fs } from "node:fs";
import path from "node:path";
import type { ExtensionContext } from "vscode";
import {
  recordLauncherInstall,
  writeCurrentPointer,
} from "../runtime/runtime-registry";
import {
  buildInstallInfo,
  ensureArchiveAvailable,
  getInstallPaths,
  getManifestEntryOrThrow,
  installFromArchive,
  type ProgressReporter,
  prepareDownloadDir,
  resolveLegacyInstall,
  tryReuseExistingLauncher,
  writeInstallMarker,
} from "./launcher-install-helpers";
import {
  type LauncherManifestEntry,
  readLauncherManifest,
} from "./launcher-manifest";
import { type PlatformKey, resolvePlatformKey } from "./platform";

export type LauncherInstallInfo = ReturnType<typeof buildInstallInfo>;

const resolveBaseUrlOverride = (): string | undefined =>
  process.env.CODEAI_HUB_LAUNCHER_BASE_URL;

const finalizeLauncherSetup = async (options: {
  readonly platformDir: string;
  readonly legacyPlatformDir?: string;
  readonly platform: PlatformKey;
  readonly manifestEntry: LauncherManifestEntry;
  readonly installDir: string;
}): Promise<void> => {
  await writeCurrentPointer(
    options.platformDir,
    options.manifestEntry.launcherVersion
  );
  if (options.legacyPlatformDir) {
    await writeCurrentPointer(
      options.legacyPlatformDir,
      options.manifestEntry.launcherVersion
    ).catch(() => {
      /* best-effort */
    });
  }
  await recordLauncherInstall({
    platform: options.platform,
    version: options.manifestEntry.launcherVersion,
    installDir: options.installDir,
  });
};

const mirrorLegacyInstall = async (
  sourceDir: string,
  legacyInstallDir: string
): Promise<void> => {
  if (sourceDir === legacyInstallDir) {
    return;
  }
  await fs.mkdir(path.dirname(legacyInstallDir), { recursive: true });
  await fs.rm(legacyInstallDir, { recursive: true, force: true });
  try {
    await fs.symlink(sourceDir, legacyInstallDir, "junction");
    return;
  } catch {
    // Fall back to copying if symlink is not permitted (Windows without admin)
  }
  await fs.cp(sourceDir, legacyInstallDir, { recursive: true });
};

const isSymlinkPointingTo = async (
  sourcePath: string,
  targetPath: string
): Promise<boolean> => {
  try {
    const stats = await fs.lstat(sourcePath);
    if (!stats.isSymbolicLink()) {
      return false;
    }
    const linkTarget = await fs.readlink(sourcePath);
    const resolvedLinkTarget = path.resolve(
      path.dirname(sourcePath),
      linkTarget
    );
    return resolvedLinkTarget === targetPath;
  } catch {
    return false;
  }
};

const resolveRealPath = async (targetPath: string): Promise<string | null> => {
  try {
    return await fs.realpath(targetPath);
  } catch {
    return null;
  }
};

const copyLegacyToPrimary = async (
  legacyInstallDir: string,
  installDir: string
): Promise<void> => {
  if (legacyInstallDir === installDir) {
    return;
  }
  if (await isSymlinkPointingTo(legacyInstallDir, installDir)) {
    return;
  }
  const [legacyRealPath, installRealPath] = await Promise.all([
    resolveRealPath(legacyInstallDir),
    resolveRealPath(installDir),
  ]);
  if (legacyRealPath && installRealPath && legacyRealPath === installRealPath) {
    return;
  }
  await fs.rm(installDir, { recursive: true, force: true });
  await fs.mkdir(path.dirname(installDir), { recursive: true });
  await fs.cp(legacyInstallDir, installDir, { recursive: true });
};

export const ensureLauncherInstalled = async (
  context: ExtensionContext,
  progress?: ProgressReporter
): Promise<LauncherInstallInfo> => {
  const manifest = await readLauncherManifest(context);
  const platform = resolvePlatformKey();
  const manifestEntry = getManifestEntryOrThrow(manifest, platform);

  const { platformDir, installDir, legacyPlatformDir, legacyInstallDir } =
    await getInstallPaths(platform, manifestEntry.launcherVersion);

  const reused = await tryReuseExistingLauncher(
    installDir,
    manifestEntry,
    platform,
    progress
  );
  if (reused) {
    await finalizeLauncherSetup({
      platformDir,
      legacyPlatformDir,
      platform,
      manifestEntry,
      installDir,
    });
    await mirrorLegacyInstall(installDir, legacyInstallDir);
    return reused;
  }

  const reusedLegacy = await tryReuseExistingLauncher(
    legacyInstallDir,
    manifestEntry,
    platform,
    progress
  );
  if (reusedLegacy) {
    await copyLegacyToPrimary(legacyInstallDir, installDir);
    await finalizeLauncherSetup({
      platformDir,
      legacyPlatformDir,
      platform,
      manifestEntry,
      installDir,
    });
    await mirrorLegacyInstall(installDir, legacyInstallDir);
    return buildInstallInfo(platform, manifestEntry, installDir);
  }

  const legacyInstall = await resolveLegacyInstall(
    platformDir,
    platform,
    manifestEntry,
    legacyPlatformDir
  );
  if (legacyInstall) {
    await copyLegacyToPrimary(legacyInstall.installDir, installDir);
    await finalizeLauncherSetup({
      platformDir,
      legacyPlatformDir,
      platform,
      manifestEntry,
      installDir,
    });
    await mirrorLegacyInstall(installDir, legacyInstallDir);
    return buildInstallInfo(platform, manifestEntry, installDir);
  }

  progress?.report({ message: "Preparing CodeAIHubLauncher…" });

  const downloadsDir = await prepareDownloadDir(platformDir);
  const archivePath = path.join(downloadsDir, manifestEntry.package);
  const baseUrlOverride = resolveBaseUrlOverride();
  const downloadUrl = new URL(
    manifestEntry.package,
    baseUrlOverride ?? manifest.baseUrl
  ).toString();

  await ensureArchiveAvailable(
    manifestEntry,
    downloadUrl,
    archivePath,
    progress
  );

  await installFromArchive(installDir, archivePath, platform, progress);
  await writeInstallMarker(installDir, platform, manifestEntry);

  await fs.rm(archivePath, { force: true }).catch(() => {
    /* ignore */
  });

  const installInfo = buildInstallInfo(platform, manifestEntry, installDir);

  await finalizeLauncherSetup({
    platformDir,
    legacyPlatformDir,
    platform,
    manifestEntry,
    installDir,
  });
  await mirrorLegacyInstall(installDir, legacyInstallDir);

  return installInfo;
};
