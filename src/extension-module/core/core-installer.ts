import { promises as fs } from "node:fs";
import path from "node:path";
import type { ExtensionContext } from "vscode";
import { type PlatformKey, resolvePlatformKey } from "../cef/platform";
import { ensureDirectory, extractArchive } from "../cef/runtime-files";
import {
  recordCoreInstall,
  writeCurrentPointer,
} from "../runtime/runtime-registry";
import {
  type CoreManifest,
  ensureCoreArchiveAvailable,
  getBaseCoreInstallDir,
  getManifestEntryOrThrow,
  type ManifestEntry,
  type ProgressReporter,
  prepareCoreDownloadDir,
  readCoreManifest,
  verifyCoreChecksumIfNeeded,
  verifyExistingCoreInstall,
  writeCoreInstallMarker,
} from "./core-install-helpers";
import { resolveEntryPoint, resolveNodeExecutable } from "./runtime-paths";

export interface CoreRuntimeInfo {
  readonly entryPoint: string;
  readonly nodePath: string;
  readonly platform: PlatformKey;
  readonly runtimeDir: string;
  readonly version: string;
}

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
  const existingIsValid = await verifyExistingCoreInstall(
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

const finalizeCoreSetup = async (options: {
  readonly platformDir: string;
  readonly platform: PlatformKey;
  readonly runtimeDir: string;
  readonly manifestEntry: ManifestEntry;
}): Promise<void> => {
  await writeCurrentPointer(
    options.platformDir,
    options.manifestEntry.coreVersion
  );
  await recordCoreInstall({
    platform: options.platform,
    version: options.manifestEntry.coreVersion,
    runtimeDir: options.runtimeDir,
  });
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
    await finalizeCoreSetup({
      platformDir,
      platform,
      runtimeDir,
      manifestEntry,
    });
    return reused;
  }

  const downloadsDir = await prepareCoreDownloadDir(platformDir);
  const archivePath = await ensureCoreArchiveAvailable(
    manifest,
    manifestEntry,
    downloadsDir,
    progress
  );
  await verifyCoreChecksumIfNeeded(archivePath, manifestEntry);

  progress?.report({ message: "Extracting core orchestrator..." });
  const parentDir = path.dirname(runtimeDir);
  await ensureDirectory(parentDir);
  const extractRoot = await fs.mkdtemp(path.join(parentDir, "core-extract-"));
  try {
    await extractArchive(archivePath, extractRoot);
    const extractedEntries = await fs.readdir(extractRoot);
    if (extractedEntries.length === 0) {
      throw new Error("Core archive extraction produced no files");
    }
    const extractedRoot = path.join(extractRoot, extractedEntries[0]);
    await fs.rm(runtimeDir, { recursive: true, force: true });
    await fs.rename(extractedRoot, runtimeDir);
  } finally {
    await fs.rm(extractRoot, { recursive: true, force: true }).catch(() => {
      /* ignore cleanup errors */
    });
  }

  await writeCoreInstallMarker(runtimeDir, platform, manifestEntry);

  progress?.report({ message: "Core orchestrator installed successfully" });

  const runtimeInfo = buildRuntimeInfo(manifestEntry, runtimeDir, platform);

  await finalizeCoreSetup({
    platformDir,
    platform,
    runtimeDir,
    manifestEntry,
  });

  return runtimeInfo;
};

export const ensureCoreInstalled = async (
  context: ExtensionContext,
  progress?: ProgressReporter
): Promise<CoreRuntimeInfo> => {
  const platform = resolvePlatformKey();
  const manifest = await readCoreManifest(context);
  const baseDir = await getBaseCoreInstallDir();

  return await performInstall(manifest, platform, baseDir, progress);
};
