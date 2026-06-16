import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";
const EXEC_MAX_BUFFER_BYTES = 10 * 1_048_576;
const VERSION_PATTERN = /\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/;

const describeExecError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const extractInstalledVersion = (
  packageName: string,
  output: string
): string | null => {
  try {
    const parsed = JSON.parse(output) as {
      readonly dependencies?: Record<
        string,
        { readonly version?: string; readonly resolved?: string }
      >;
    };
    const version = parsed.dependencies?.[packageName]?.version;
    if (typeof version === "string" && version.trim().length > 0) {
      return version.trim();
    }
  } catch {
    /* ignore parse failures */
  }
  return null;
};

export const readInstalledVersion = async (
  packageName: string
): Promise<{ version: string | null; error?: string }> => {
  try {
    const { stdout } = await execAsync(
      `${NPM_COMMAND} list -g ${packageName} --depth=0 --json`,
      { maxBuffer: EXEC_MAX_BUFFER_BYTES }
    );
    return { version: extractInstalledVersion(packageName, stdout) };
  } catch (error) {
    const candidateStdout =
      (error as { stdout?: string | undefined })?.stdout ?? "";
    const version = extractInstalledVersion(packageName, candidateStdout);
    if (version) {
      return { version };
    }
    return { version: null, error: describeExecError(error) };
  }
};

export const readLatestVersion = async (
  packageName: string
): Promise<{ version: string | null; error?: string }> => {
  try {
    const { stdout } = await execAsync(
      `${NPM_COMMAND} view ${packageName} version --json`,
      { maxBuffer: EXEC_MAX_BUFFER_BYTES }
    );
    const cleaned = stdout.trim();
    if (!cleaned) {
      return { version: null };
    }
    try {
      const parsed = JSON.parse(cleaned) as string | string[];
      if (typeof parsed === "string") {
        return { version: parsed.trim() };
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        const candidate = parsed.at(-1);
        return { version: typeof candidate === "string" ? candidate : null };
      }
    } catch {
      return { version: cleaned };
    }
    return { version: null };
  } catch (error) {
    return { version: null, error: describeExecError(error) };
  }
};

export const readCommandVersion = async (
  command: string
): Promise<{ version: string | null; error?: string }> => {
  try {
    const { stdout } = await execAsync(command, {
      maxBuffer: EXEC_MAX_BUFFER_BYTES,
    });
    return { version: stdout.match(VERSION_PATTERN)?.[0] ?? null };
  } catch (error) {
    return { version: null, error: describeExecError(error) };
  }
};

export const installGlobalPackageLatest = async (
  packageName: string
): Promise<void> => {
  await execAsync(`${NPM_COMMAND} install -g ${packageName}@latest`, {
    maxBuffer: EXEC_MAX_BUFFER_BYTES,
  });
};
