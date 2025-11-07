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
  getBaseInstallDir,
  getManifestEntryOrThrow,
  installFromArchive,
  type ProgressReporter,
  prepareDownloadDir,
  resolveLegacyInstall,
  tryReuseExistingLauncher,
  writeInstallMarker,
} from "./launcher-install-helpers";
import { readLauncherManifest } from "./launcher-manifest";
import { resolvePlatformKey } from "./platform";

export type LauncherInstallInfo = ReturnType<typeof buildInstallInfo>;

const resolveBaseUrlOverride = (): string | undefined =>
  process.env.CODEAI_HUB_LAUNCHER_BASE_URL;

const finalizeLauncherSetup = async (options: {
  readonly platformDir: string;
  readonly platform: PlatformKey;
  readonly manifestEntry: LauncherManifestEntry;
  readonly installDir: string;
}): Promise<void> => {
  await writeCurrentPointer(
    options.platformDir,
    options.manifestEntry.launcherVersion
  );
  await recordLauncherInstall({
    platform: options.platform,
    version: options.manifestEntry.launcherVersion,
    installDir: options.installDir,
  });
};

export const ensureLauncherInstalled = async (
  context: ExtensionContext,
  progress?: ProgressReporter
): Promise<LauncherInstallInfo> => {
  const manifest = await readLauncherManifest(context);
  const platform = resolvePlatformKey();
  const manifestEntry = getManifestEntryOrThrow(manifest, platform);

  const baseDir = await getBaseInstallDir();
  const platformDir = path.join(baseDir, platform);
  const installDir = path.join(platformDir, manifestEntry.launcherVersion);

  const reused = await tryReuseExistingLauncher(
    installDir,
    manifestEntry,
    platform,
    progress
  );
  if (reused) {
    await finalizeLauncherSetup({
      platformDir,
      platform,
      manifestEntry,
      installDir,
    });
    return reused;
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
    platform,
    manifestEntry,
    installDir,
  });

  return installInfo;
};
