import { promises as fs } from "node:fs";
import path from "node:path";
import type { ExtensionContext } from "vscode";
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

  return buildInstallInfo(platform, manifestEntry, installDir);
};
