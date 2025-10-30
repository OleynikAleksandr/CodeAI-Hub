import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import https from "node:https";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { loadCliBridgeFromVendor } from "../runtime/cli-bridge";
import type { GeminiCliBridge } from "../runtime/cli-types";
import type { GeminiInstallerPaths, ModuleReporter } from "../types";

const REGISTRY_BASE = "https://registry.npmjs.org";
const VENDOR_DIR = "vendor";
const NODE_MODULES_DIR = "node_modules";
const DOWNLOADS_DIR = "downloads";
const GEMINI_CONFIG_KEY = "codeaiHub";
const GEMINI_CLI_CORE_PACKAGE = "@google/gemini-cli-core";
const GEMINI_CLI_PACKAGE = "@google/gemini-cli";
const HTTP_ERROR_STATUS_THRESHOLD = 400;

const ensureDirectory = async (target: string): Promise<void> => {
  await fs.mkdir(target, { recursive: true });
};

const ensureDirectoryChain = async (...segments: string[]): Promise<string> => {
  const target = path.join(...segments);
  await ensureDirectory(target);
  return target;
};

const readJsonFile = async <T>(filePath: string): Promise<T> => {
  const contents = await fs.readFile(filePath, "utf8");
  return JSON.parse(contents) as T;
};

const fetchRegistryMetadata = async (
  packageName: string,
  version: string
): Promise<{
  readonly tarball: string;
  readonly shasum?: string;
}> => {
  const encoded = packageName.replace("/", "%2f");
  const url = `${REGISTRY_BASE}/${encoded}`;

  const response = await new Promise<string>((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= HTTP_ERROR_STATUS_THRESHOLD) {
          reject(
            new Error(
              `Failed to fetch ${packageName}@${version} metadata (HTTP ${res.statusCode})`
            )
          );
          res.resume();
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk) => {
          chunks.push(chunk as Buffer);
        });
        res.on("end", () => {
          resolve(Buffer.concat(chunks).toString("utf8"));
        });
        res.on("error", reject);
      })
      .on("error", reject);
  });

  const meta = JSON.parse(response) as {
    readonly versions?: Record<
      string,
      {
        readonly dist?: {
          readonly tarball?: string;
          readonly shasum?: string;
        };
      }
    >;
  };

  const distInfo = meta.versions?.[version]?.dist;
  if (!distInfo?.tarball) {
    throw new Error(
      `Package ${packageName}@${version} dist information missing`
    );
  }

  return {
    tarball: distInfo.tarball,
    shasum: distInfo.shasum,
  };
};

const downloadToFile = async (
  url: string,
  destination: string
): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    https
      .get(url, async (response) => {
        if (
          response.statusCode &&
          response.statusCode >= HTTP_ERROR_STATUS_THRESHOLD
        ) {
          reject(
            new Error(`Failed to download ${url} (HTTP ${response.statusCode})`)
          );
          response.resume();
          return;
        }

        try {
          await pipeline(response, createWriteStream(destination));
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on("error", reject);
  });
};

const computeSha1 = async (filePath: string): Promise<string> =>
  await new Promise<string>((resolve, reject) => {
    const hash = createHash("sha1");
    const stream = createReadStream(filePath);

    stream.on("data", (chunk) => {
      hash.update(chunk);
    });

    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });

    stream.on("error", reject);
  });

const verifySha1IfPresent = async (
  filePath: string,
  expected?: string
): Promise<void> => {
  if (!expected) {
    return;
  }
  const actual = await computeSha1(filePath);
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`Checksum mismatch for ${path.basename(filePath)}`);
  }
};

const extractTarArchive = async (
  archivePath: string,
  destination: string
): Promise<void> => {
  await ensureDirectory(destination);
  const args = (() => {
    if (archivePath.endsWith(".tar.gz") || archivePath.endsWith(".tgz")) {
      return ["-xzf", archivePath, "-C", destination];
    }
    if (archivePath.endsWith(".tar.bz2")) {
      return ["-xjf", archivePath, "-C", destination];
    }
    throw new Error(`Unsupported archive format: ${archivePath}`);
  })();

  await new Promise<void>((resolve, reject) => {
    execFile("tar", args, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

const removeDirectoryIfExists = async (target: string): Promise<void> => {
  await fs.rm(target, { recursive: true, force: true });
};

const safeRename = async (
  source: string,
  destination: string
): Promise<void> => {
  await removeDirectoryIfExists(destination);
  await fs.rename(source, destination);
};

const installDependencies = async (
  targetDir: string,
  label: string,
  reporter?: ModuleReporter
): Promise<void> => {
  reporter?.info?.(`Installing dependencies for ${label}`);
  await new Promise<void>((resolve, reject) => {
    execFile(
      "npm",
      ["install", "--omit=dev", "--no-audit", "--no-fund"],
      { cwd: targetDir },
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      }
    );
  });
};

type ModuleMetadata = {
  readonly version: string;
  readonly geminiCliCoreVersion: string;
  readonly geminiCliVersion: string;
};

const readModuleMetadata = async (
  moduleRoot: string
): Promise<ModuleMetadata> => {
  const pkg = await readJsonFile<{
    readonly version: string;
    readonly [GEMINI_CONFIG_KEY]?: {
      readonly geminiCliCoreVersion?: string;
      readonly geminiCliVersion?: string;
    };
  }>(path.join(moduleRoot, "package.json"));

  const config = pkg[GEMINI_CONFIG_KEY] ?? {};
  if (!(config.geminiCliCoreVersion && config.geminiCliVersion)) {
    throw new Error("Gemini module metadata missing CLI version configuration");
  }

  return {
    version: pkg.version,
    geminiCliCoreVersion: config.geminiCliCoreVersion,
    geminiCliVersion: config.geminiCliVersion,
  };
};

export type GeminiInstallerOptions = {
  readonly reporter?: ModuleReporter;
};

export class GeminiInstaller {
  private readonly reporter?: ModuleReporter;

  private readonly moduleRoot: string;

  private bridge: GeminiCliBridge | null = null;

  constructor(
    _paths: GeminiInstallerPaths,
    options: GeminiInstallerOptions = {}
  ) {
    this.reporter = options.reporter;
    this.moduleRoot = path.resolve(__dirname, "..", "..");
  }

  async ensureCliBridge(): Promise<GeminiCliBridge> {
    if (this.bridge) {
      return this.bridge;
    }

    await this.ensureVendorArtifacts();
    this.bridge = await loadCliBridgeFromVendor();
    return this.bridge;
  }

  private async ensureVendorArtifacts(): Promise<void> {
    const metadata = await readModuleMetadata(this.moduleRoot);
    const vendorRoot = await ensureDirectoryChain(
      this.moduleRoot,
      "dist",
      VENDOR_DIR
    );
    const downloadsDir = await ensureDirectoryChain(vendorRoot, DOWNLOADS_DIR);
    const nodeModulesDir = await ensureDirectoryChain(
      vendorRoot,
      NODE_MODULES_DIR
    );

    await this.installIfNeeded({
      name: GEMINI_CLI_PACKAGE,
      version: metadata.geminiCliVersion,
      label: "Gemini CLI",
      downloadsDir,
      nodeModulesDir,
    });

    await this.installIfNeeded({
      name: GEMINI_CLI_CORE_PACKAGE,
      version: metadata.geminiCliCoreVersion,
      label: "Gemini CLI Core",
      downloadsDir,
      nodeModulesDir,
    });

    const metadataPath = path.join(vendorRoot, "cli-bridge.json");
    const bridgeMetadata = {
      version: metadata.version,
      preparedAt: new Date().toISOString(),
      source: "npm",
      cli: {
        package: GEMINI_CLI_PACKAGE,
        version: metadata.geminiCliVersion,
      },
      cliCore: {
        package: GEMINI_CLI_CORE_PACKAGE,
        version: metadata.geminiCliCoreVersion,
      },
    };
    await fs.writeFile(
      metadataPath,
      `${JSON.stringify(bridgeMetadata, null, 2)}\n`,
      "utf8"
    );
  }

  private async installIfNeeded({
    name,
    version,
    label,
    downloadsDir,
    nodeModulesDir,
  }: {
    readonly name: string;
    readonly version: string;
    readonly label: string;
    readonly downloadsDir: string;
    readonly nodeModulesDir: string;
  }): Promise<void> {
    const targetDir = path.join(nodeModulesDir, ...name.split("/"));
    const pkgJsonPath = path.join(targetDir, "package.json");
    const nodeModulesPath = path.join(targetDir, "node_modules");

    try {
      const existing = await readJsonFile<{ readonly version?: string }>(
        pkgJsonPath
      );
      if (existing.version === version) {
        try {
          await fs.access(nodeModulesPath);
          return;
        } catch {
          this.reporter?.info?.(
            `Repairing dependencies for ${label} ${version}`
          );
        }
      }
    } catch {
      // not installed yet
    }

    this.reporter?.info?.(`Installing ${label} ${version}`);

    const { tarball, shasum } = await fetchRegistryMetadata(name, version);
    const archiveName = path.basename(tarball);
    const archivePath = path.join(downloadsDir, archiveName);

    await downloadToFile(tarball, archivePath);
    await verifySha1IfPresent(archivePath, shasum);

    const tempDir = await fs.mkdtemp(path.join(tmpdir(), "gemini-cli-"));
    try {
      await extractTarArchive(archivePath, tempDir);
      const packageDir = path.join(tempDir, "package");
      await ensureDirectory(path.dirname(targetDir));
      await safeRename(packageDir, targetDir);
      await installDependencies(targetDir, label, this.reporter);
    } finally {
      await removeDirectoryIfExists(tempDir);
    }

    this.reporter?.info?.(`${label} ${version} installed`);
  }
}
