import { promises as fs } from "node:fs";
import nodeModule from "node:module";
import { homedir } from "node:os";
import path from "node:path";

const { createRequire } = nodeModule;
const moduleGlobalPaths =
  (nodeModule as unknown as { globalPaths?: readonly string[] }).globalPaths ??
  [];
const requireFromWorkspaceRoot = createRequire(
  path.join(process.cwd(), "package.json")
);

const GEMINI_CLI_PACKAGE = "@google/gemini-cli";
const GEMINI_CLI_CORE_PACKAGE = "@google/gemini-cli-core";
const GEMINI_BINARY_NAMES =
  process.platform === "win32"
    ? ["gemini.cmd", "gemini.exe", "gemini.bat", "gemini"]
    : ["gemini"];

const normalizeCandidate = (candidate: string): string => {
  if (candidate.endsWith("package.json")) {
    return path.dirname(candidate);
  }
  return candidate;
};

const readPackageMetadata = async (
  root: string
): Promise<{ readonly version: string } | null> => {
  const packageJsonPath = path.join(root, "package.json");
  try {
    const raw = await fs.readFile(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw) as { readonly version?: string };
    if (!parsed.version) {
      return null;
    }
    return { version: parsed.version };
  } catch {
    return null;
  }
};

const candidateRootsFromEnv = (packageName: string): readonly string[] => {
  const nodePath = process.env.NODE_PATH;
  if (!nodePath) {
    return [];
  }
  return nodePath
    .split(path.delimiter)
    .filter(Boolean)
    .map((entry) => path.join(entry, packageName));
};

const candidateRootsFromBinaryPath = async (): Promise<string[]> => {
  const pathEnv = process.env.PATH;
  if (!pathEnv) {
    return [];
  }

  const results: string[] = [];
  const segments = pathEnv.split(path.delimiter).filter(Boolean);

  for (const segment of segments) {
    for (const binaryName of GEMINI_BINARY_NAMES) {
      const binaryCandidate = path.join(segment, binaryName);
      try {
        await fs.access(binaryCandidate);
      } catch {
        continue;
      }
      const resolvedDir = path.resolve(segment, "..");
      results.push(
        path.join(resolvedDir, "lib", "node_modules", GEMINI_CLI_PACKAGE)
      );
      results.push(path.join(resolvedDir, "node_modules", GEMINI_CLI_PACKAGE));
    }
  }

  return results;
};

const resolvePackageRoot = async (
  packageName: string,
  options: {
    readonly candidates: readonly string[];
    readonly errorMessage: string;
  }
): Promise<{ readonly root: string; readonly version: string }> => {
  const seen = new Set<string>();

  for (const candidate of options.candidates) {
    const normalized = path.resolve(normalizeCandidate(candidate));
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    const metadata = await readPackageMetadata(normalized);
    if (metadata) {
      return { root: normalized, version: metadata.version };
    }
  }

  throw new Error(options.errorMessage.replace("{packageName}", packageName));
};

export const resolveGeminiCliRoot = async (): Promise<{
  readonly root: string;
  readonly version: string;
}> => {
  const candidates: string[] = [];

  const override = process.env.CODEAI_HUB_GEMINI_CLI_ROOT?.trim();
  if (override) {
    candidates.push(override);
  }

  const npmPrefix =
    process.env.NPM_CONFIG_PREFIX ?? process.env.npm_config_prefix;
  if (npmPrefix) {
    candidates.push(
      path.join(npmPrefix, "lib", "node_modules", GEMINI_CLI_PACKAGE)
    );
    candidates.push(path.join(npmPrefix, "node_modules", GEMINI_CLI_PACKAGE));
  }

  try {
    const resolved = requireFromWorkspaceRoot.resolve(
      `${GEMINI_CLI_PACKAGE}/package.json`
    );
    candidates.push(resolved);
  } catch {
    // ignore resolution errors
  }

  candidates.push(...(await candidateRootsFromBinaryPath()));

  for (const globalPath of moduleGlobalPaths) {
    if (globalPath) {
      candidates.push(path.join(globalPath, GEMINI_CLI_PACKAGE));
    }
  }

  candidates.push(...candidateRootsFromEnv(GEMINI_CLI_PACKAGE));
  candidates.push(
    path.join(process.cwd(), "node_modules", "@google", "gemini-cli")
  );
  const homeDirectory = homedir();
  candidates.push(
    path.join(
      homeDirectory,
      ".npm-global",
      "lib",
      "node_modules",
      GEMINI_CLI_PACKAGE
    )
  );
  candidates.push(
    path.join(homeDirectory, ".npm-global", "node_modules", GEMINI_CLI_PACKAGE)
  );

  return await resolvePackageRoot(GEMINI_CLI_PACKAGE, {
    candidates,
    errorMessage:
      "Gemini CLI package not found. Install it with `npm install -g {packageName}`.",
  });
};

export const resolveGeminiCliCoreRoot = async (
  cliRoot: string
): Promise<{ readonly root: string; readonly version: string }> => {
  const candidates: string[] = [];

  try {
    const requireFromCli = createRequire(path.join(cliRoot, "package.json"));
    const resolved = requireFromCli.resolve(
      `${GEMINI_CLI_CORE_PACKAGE}/package.json`
    );
    candidates.push(resolved);
  } catch {
    // ignore resolution errors
  }

  const npmPrefix =
    process.env.NPM_CONFIG_PREFIX ?? process.env.npm_config_prefix;
  if (npmPrefix) {
    candidates.push(
      path.join(npmPrefix, "lib", "node_modules", GEMINI_CLI_CORE_PACKAGE)
    );
    candidates.push(
      path.join(npmPrefix, "node_modules", GEMINI_CLI_CORE_PACKAGE)
    );
  }

  try {
    const resolved = requireFromWorkspaceRoot.resolve(
      `${GEMINI_CLI_CORE_PACKAGE}/package.json`
    );
    candidates.push(resolved);
  } catch {
    // ignore resolution errors
  }

  for (const globalPath of moduleGlobalPaths) {
    if (globalPath) {
      candidates.push(path.join(globalPath, GEMINI_CLI_CORE_PACKAGE));
    }
  }

  candidates.push(...candidateRootsFromEnv(GEMINI_CLI_CORE_PACKAGE));
  candidates.push(
    path.join(process.cwd(), "node_modules", "@google", "gemini-cli-core")
  );
  const homeDirectory = homedir();
  candidates.push(
    path.join(
      homeDirectory,
      ".npm-global",
      "lib",
      "node_modules",
      GEMINI_CLI_CORE_PACKAGE
    )
  );
  candidates.push(
    path.join(
      homeDirectory,
      ".npm-global",
      "node_modules",
      GEMINI_CLI_CORE_PACKAGE
    )
  );

  return await resolvePackageRoot(GEMINI_CLI_CORE_PACKAGE, {
    candidates,
    errorMessage:
      "Gemini CLI Core package not found. Install it with `npm install -g {packageName}`.",
  });
};
