import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { ExtensionContext, Progress } from "vscode";
import {
  downloadFile,
  ensureDirectory,
  extractArchive,
  verifySha1,
} from "../../cef/runtime-files";

type ProgressReporter = Progress<{
  message?: string;
  increment?: number;
}>;

type ProviderManifestEntry = {
  readonly version: string;
  readonly package: string;
  readonly size: number;
  readonly sha1: string;
};

type ProviderManifest = {
  readonly schema: number;
  readonly baseUrl: string;
  readonly module: ProviderManifestEntry;
};

type InstallMarker = {
  readonly version: string;
  readonly installedAt: string;
};

type EnsureProviderModuleOptions = {
  readonly providerId: string;
  readonly manifestRelativePath: string;
  readonly label: string;
  readonly entryPoints: readonly string[];
  readonly progressMessage?: string;
};

const INSTALL_MARKER = "install.json";
const LATEST_POINTER = "latest";
const PROVIDERS_WITH_HOME = new Set(["claude", "codex"]);

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const readManifest = async (
  context: ExtensionContext,
  manifestRelativePath: string
): Promise<ProviderManifest> => {
  const manifestPath = path.join(context.extensionPath, manifestRelativePath);
  const contents = await fs.readFile(manifestPath, "utf8");
  return JSON.parse(contents) as ProviderManifest;
};

const isInstallValid = async (
  installDir: string,
  manifestEntry: ProviderManifestEntry,
  entryPoints: readonly string[]
): Promise<boolean> => {
  try {
    const markerPath = path.join(installDir, INSTALL_MARKER);
    const markerContents = await fs.readFile(markerPath, "utf8");
    const marker = JSON.parse(markerContents) as InstallMarker;
    if (marker.version !== manifestEntry.version) {
      return false;
    }
    await Promise.all(
      entryPoints.map(async (entryPoint) => {
        await fs.access(path.join(installDir, entryPoint));
      })
    );
    return true;
  } catch {
    return false;
  }
};

const writeLatestPointer = async (
  installRoot: string,
  version: string
): Promise<void> => {
  await ensureDirectory(installRoot);
  await fs.writeFile(path.join(installRoot, LATEST_POINTER), version, "utf8");
};

export const ensureProviderModuleInstalled = async (
  context: ExtensionContext,
  options: EnsureProviderModuleOptions,
  progress?: ProgressReporter
): Promise<string> => {
  if (options.entryPoints.length === 0) {
    throw new Error(`${options.label} module entry points not configured`);
  }
  const installRoot = path.join(
    homedir(),
    ".codeai-hub",
    "providers",
    options.providerId
  );
  const downloadsDir = path.join(installRoot, "downloads");
  const manifest = await readManifest(context, options.manifestRelativePath);
  if (manifest.module.version === "home") {
    throw new Error(
      `${options.label} manifest version is invalid ("home" is reserved).`
    );
  }
  const targetDir = path.join(installRoot, manifest.module.version);

  if (await isInstallValid(targetDir, manifest.module, options.entryPoints)) {
    await writeLatestPointer(installRoot, manifest.module.version);
    return targetDir;
  }

  const installMessage =
    options.progressMessage ?? `Installing ${options.label} provider module…`;
  progress?.report?.({ message: installMessage });

  await ensureDirectory(installRoot);
  await ensureDirectory(downloadsDir);
  if (PROVIDERS_WITH_HOME.has(options.providerId)) {
    await ensureDirectory(path.join(installRoot, "home"));
  }

  await fs.rm(targetDir, { recursive: true, force: true });
  await ensureDirectory(targetDir);

  const archivePath = path.join(downloadsDir, manifest.module.package);
  const downloadUrl = new URL(
    manifest.module.package,
    manifest.baseUrl
  ).toString();

  try {
    await downloadFile({
      url: downloadUrl,
      destination: archivePath,
      size: manifest.module.size,
      label: `${options.label} Module`,
      progress,
      localFallbacks: [
        archivePath,
        path.join(
          homedir(),
          ".codeai-hub",
          "releases",
          manifest.module.package
        ),
      ],
    });
  } catch (error) {
    const message = toErrorMessage(error);
    throw new Error(`${options.label} module download failed: ${message}`);
  }

  const checksumValid = await verifySha1(archivePath, manifest.module.sha1);
  if (!checksumValid) {
    throw new Error(`${options.label} module checksum verification failed`);
  }

  await extractArchive(archivePath, targetDir);

  const marker: InstallMarker = {
    version: manifest.module.version,
    installedAt: new Date().toISOString(),
  };
  await fs.writeFile(
    path.join(targetDir, INSTALL_MARKER),
    `${JSON.stringify(marker, null, 2)}\n`,
    "utf8"
  );

  await writeLatestPointer(installRoot, manifest.module.version);
  return targetDir;
};
