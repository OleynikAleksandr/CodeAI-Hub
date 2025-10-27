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

const INSTALL_ROOT = path.join(homedir(), ".codeai-hub", "providers", "claude");
const DOWNLOADS_DIR = path.join(INSTALL_ROOT, "downloads");
const LATEST_FILE = "latest";
const INSTALL_MARKER = "install.json";
const MANIFEST_RELATIVE_PATH = path.join(
  "assets",
  "providers",
  "claude",
  "manifest.json"
);

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

type ManifestEntry = {
  readonly version: string;
  readonly package: string;
  readonly size: number;
  readonly sha1: string;
};

type ClaudeModuleManifest = {
  readonly schema: number;
  readonly baseUrl: string;
  readonly module: ManifestEntry;
};

type InstallMarker = {
  readonly version: string;
  readonly installedAt: string;
};

export const ensureClaudeModuleInstalled = async (
  context: ExtensionContext,
  progress?: ProgressReporter
): Promise<string> => {
  const manifest = await readManifest(context);
  const targetDir = path.join(INSTALL_ROOT, manifest.module.version);

  if (await isInstallValid(targetDir, manifest.module.version)) {
    await writeLatestPointer(manifest.module.version);
    return targetDir;
  }

  progress?.report?.({ message: "Installing Claude provider module…" });

  await ensureDirectory(INSTALL_ROOT);
  await ensureDirectory(DOWNLOADS_DIR);

  await fs.rm(targetDir, { recursive: true, force: true });
  await ensureDirectory(targetDir);

  const archivePath = path.join(DOWNLOADS_DIR, manifest.module.package);
  const downloadUrl = new URL(
    manifest.module.package,
    manifest.baseUrl
  ).toString();

  try {
    await downloadFile({
      url: downloadUrl,
      destination: archivePath,
      size: manifest.module.size,
      label: "Claude Module",
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
    throw new Error(`Claude module download failed: ${message}`);
  }

  const checksumValid = await verifySha1(archivePath, manifest.module.sha1);
  if (!checksumValid) {
    throw new Error("Claude module checksum verification failed");
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
  await writeLatestPointer(manifest.module.version);
  return targetDir;
};

const readManifest = async (
  context: ExtensionContext
): Promise<ClaudeModuleManifest> => {
  const manifestPath = path.join(context.extensionPath, MANIFEST_RELATIVE_PATH);
  const contents = await fs.readFile(manifestPath, "utf8");
  return JSON.parse(contents) as ClaudeModuleManifest;
};

const isInstallValid = async (
  installDir: string,
  expectedVersion: string
): Promise<boolean> => {
  try {
    const markerPath = path.join(installDir, INSTALL_MARKER);
    const markerContents = await fs.readFile(markerPath, "utf8");
    const marker = JSON.parse(markerContents) as InstallMarker;
    if (marker.version !== expectedVersion) {
      return false;
    }
    const entryPoint = path.join(installDir, "dist", "index.js");
    await fs.access(entryPoint);
    return true;
  } catch {
    return false;
  }
};

const writeLatestPointer = async (version: string): Promise<void> => {
  await ensureDirectory(INSTALL_ROOT);
  await fs.writeFile(path.join(INSTALL_ROOT, LATEST_FILE), version, "utf8");
};
