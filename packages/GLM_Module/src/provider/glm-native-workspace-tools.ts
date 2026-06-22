import { stat } from "node:fs/promises";
import path from "node:path";
import { runProcess, runShell } from "./glm-native-process";

const LEADING_DOT_SLASH_PATTERN = /^\.\/+/u;
const PATH_SEGMENT_SEPARATOR_PATTERN = /[\\/]+/u;
const HTML_SCRIPT_STYLE_PATTERN =
  /<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/giu;
const HTML_TAG_PATTERN = /<[^>]+>/gu;
const WHITESPACE_PATTERN = /\s+/gu;
const TEST_FAILURE_PATTERN =
  /\b(fail|failed|error|not ok|assertionerror|exception)\b/iu;

export const executeGlmNativeWorkspaceTool = (
  name: string,
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> | null => {
  switch (name) {
    case "browser_fetch":
      return executeBrowserFetchTool(args);
    case "find_references":
      return executeFindReferencesTool(args, workspacePath);
    case "git_blame":
      return executeGitBlameTool(args, workspacePath);
    case "git_diff":
      return executeGitDiffTool(args, workspacePath);
    case "git_log":
      return executeGitLogTool(args, workspacePath);
    case "git_status":
      return executeGitStatusTool(workspacePath);
    case "go_to_definition":
      return executeGoToDefinitionTool(args, workspacePath);
    case "run_tests":
      return executeRunTestsTool(args, workspacePath);
    case "workspace_symbols":
      return executeWorkspaceSymbolsTool(args, workspacePath);
    default:
      return null;
  }
};

const executeFindReferencesTool = async (
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  const symbol = readRequiredString(args.symbol, "symbol");
  const target = await resolveSearchTarget(args.path, workspacePath);
  const maxResults = clampNumber(args.max_results, 1, 500, 100);
  const result = await runCodeSearch(
    [`\\b${escapeRegExp(symbol)}\\b`, target.targetPath],
    target.cwd
  );
  const matches = readResultLines(result.stdout, maxResults);
  return { cwd: target.cwd, matches, ok: result.ok || result.exitCode === 1 };
};

const executeGoToDefinitionTool = async (
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  const symbol = readRequiredString(args.symbol, "symbol");
  const target = await resolveSearchTarget(args.path, workspacePath);
  const maxResults = clampNumber(args.max_results, 1, 100, 20);
  const declaration = String.raw`\b(export\s+)?(abstract\s+)?(class|interface|type|enum|function|const|let|var)\s+${escapeRegExp(symbol)}\b`;
  const result = await runCodeSearch(
    [declaration, target.targetPath],
    target.cwd
  );
  const definitions = readResultLines(result.stdout, maxResults);
  return {
    cwd: target.cwd,
    definitions,
    ok: result.ok || result.exitCode === 1,
    semantic: false,
    warning:
      "Best-effort lexical TypeScript navigation; tsserver-backed LSP is not bundled in the GLM runtime yet.",
  };
};

const executeWorkspaceSymbolsTool = async (
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  const query = readRequiredString(args.query, "query");
  const cwd = resolveWorkspacePath(undefined, workspacePath, {
    allowMissing: true,
  });
  const maxResults = clampNumber(args.max_results, 1, 500, 100);
  const declaration = String.raw`\b(export\s+)?(abstract\s+)?(class|interface|type|enum|function|const|let|var)\s+[^=;]*${escapeRegExp(query)}`;
  const result = await runCodeSearch([declaration, "."], cwd);
  const symbols = readResultLines(result.stdout, maxResults);
  return {
    cwd,
    ok: result.ok || result.exitCode === 1,
    semantic: false,
    symbols,
  };
};

const executeBrowserFetchTool = async (
  args: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const url = readRequiredString(args.url, "url");
  const parsed = new URL(url);
  if (!["http:", "https:", "file:"].includes(parsed.protocol)) {
    throw new Error("browser_fetch supports only http, https, and file URLs.");
  }
  const maxChars = clampNumber(args.max_chars, 1000, 100_000, 20_000);
  const timeoutMs = clampNumber(args.timeout_ms, 1000, 60_000, 30_000);
  const browser = await findHeadlessBrowser();
  if (!browser) {
    return {
      error:
        "No Chrome/Chromium/Edge executable found for headless browser fetch.",
      ok: false,
    };
  }
  const result = await runProcess(
    browser,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--dump-dom",
      parsed.href,
    ],
    process.cwd(),
    timeoutMs,
    maxChars * 2
  );
  const text = cleanWebText(result.stdout);
  return {
    browser,
    ok: result.ok,
    status: result.exitCode,
    stderr: result.stderr,
    text: truncateText(text, maxChars),
    textChars: text.length,
    url: parsed.href,
  };
};

const executeGitStatusTool = (
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  const cwd = resolveWorkspacePath(undefined, workspacePath, {
    allowMissing: true,
  });
  return runGit(["status", "--short", "--branch"], cwd, 20_000);
};

const executeGitDiffTool = async (
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  const cwd = resolveWorkspacePath(undefined, workspacePath, {
    allowMissing: true,
  });
  const maxChars = outputCharsFromBudget(args.max_output_tokens);
  const gitArgs = ["diff"];
  if (args.staged === true) {
    gitArgs.push("--staged");
  }
  const filePath = readOptionalPath(args.path);
  if (filePath) {
    gitArgs.push("--", filePath);
  }
  const result = await runProcess("git", gitArgs, cwd, 30_000, maxChars);
  return { cwd, diff: result.stdout, ok: result.ok, stderr: result.stderr };
};

const executeGitLogTool = (
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  const cwd = resolveWorkspacePath(undefined, workspacePath, {
    allowMissing: true,
  });
  const maxCount = clampNumber(args.max_count, 1, 100, 20);
  const gitArgs = ["log", "--oneline", "--decorate", "-n", String(maxCount)];
  const filePath = readOptionalPath(args.path);
  if (filePath) {
    gitArgs.push("--", filePath);
  }
  return runGit(gitArgs, cwd, 30_000);
};

const executeGitBlameTool = (
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  const cwd = resolveWorkspacePath(undefined, workspacePath, {
    allowMissing: true,
  });
  const filePath = readRequiredString(args.path, "path");
  const start = clampNumber(args.start, 1, Number.MAX_SAFE_INTEGER, 1);
  const end = clampNumber(args.end, start, Number.MAX_SAFE_INTEGER, start);
  return runGit(
    ["blame", "-L", `${start},${end}`, "--", filePath],
    cwd,
    30_000
  );
};

const executeRunTestsTool = async (
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  const command = readRequiredString(args.cmd, "cmd");
  const cwd = resolveWorkspacePath(args.workdir, workspacePath, {
    allowMissing: true,
  });
  const timeoutMs = clampNumber(args.timeout_ms, 1000, 300_000, 120_000);
  const maxOutputChars = outputCharsFromBudget(args.max_output_tokens);
  const result = await runShell(command, cwd, timeoutMs, maxOutputChars);
  const combined = `${result.stdout}\n${result.stderr}`;
  return {
    command,
    cwd,
    failures: combined
      .split("\n")
      .filter((line) => TEST_FAILURE_PATTERN.test(line))
      .slice(0, 80),
    ok: result.ok,
    stderr: result.stderr,
    stdout: result.stdout,
    timedOut: result.timedOut,
  };
};

const runCodeSearch = (
  args: readonly string[],
  cwd: string
): Promise<{
  readonly exitCode: number | null;
  readonly ok: boolean;
  readonly stderr: string;
  readonly stdout: string;
}> =>
  runProcess(
    "rg",
    [
      "--no-config",
      "--hidden",
      "--no-messages",
      "--line-number",
      "--column",
      "--glob",
      "!**/.git/**",
      "--glob",
      "**/*.ts",
      "--glob",
      "**/*.tsx",
      "--glob",
      "**/*.js",
      "--glob",
      "**/*.jsx",
      "--",
      ...args,
    ],
    cwd,
    30_000,
    80_000
  );

const runGit = async (
  args: readonly string[],
  cwd: string,
  timeoutMs = 20_000
): Promise<Record<string, unknown>> => {
  const result = await runProcess("git", args, cwd, timeoutMs, 80_000);
  return {
    args,
    cwd,
    ok: result.ok,
    output: result.stdout,
    stderr: result.stderr,
  };
};

const resolveSearchTarget = async (
  value: unknown,
  workspacePath?: string
): Promise<{ readonly cwd: string; readonly targetPath: string }> => {
  const workspaceRoot = resolveWorkspacePath(undefined, workspacePath, {
    allowMissing: true,
  });
  const absolutePath = resolveWorkspacePath(value, workspacePath, {
    allowMissing: true,
  });
  const stats = await stat(absolutePath);
  if (stats.isDirectory()) {
    return { cwd: absolutePath, targetPath: "." };
  }
  if (stats.isFile()) {
    return {
      cwd: workspaceRoot,
      targetPath: path.relative(workspaceRoot, absolutePath) || ".",
    };
  }
  throw new Error("Search path must be a file or directory.");
};

const findHeadlessBrowser = async (): Promise<string | null> => {
  const candidates =
    process.platform === "darwin"
      ? [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
          "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
          "google-chrome",
          "chromium",
          "microsoft-edge",
        ]
      : ["google-chrome", "chromium", "chromium-browser", "microsoft-edge"];
  for (const candidate of candidates) {
    const result = await runProcess(
      candidate,
      ["--version"],
      process.cwd(),
      2000,
      2000
    );
    if (result.ok) {
      return candidate;
    }
  }
  return null;
};

const cleanWebText = (value: string): string =>
  decodeHtml(
    value
      .replace(HTML_SCRIPT_STYLE_PATTERN, " ")
      .replace(HTML_TAG_PATTERN, " ")
      .replace(WHITESPACE_PATTERN, " ")
      .trim()
  );

const decodeHtml = (value: string): string =>
  value
    .replace(/&amp;/gu, "&")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'");

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const readResultLines = (
  value: string,
  maxResults: number
): readonly string[] => value.split("\n").filter(Boolean).slice(0, maxResults);

const readOptionalPath = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().replace(LEADING_DOT_SLASH_PATTERN, "")
    : null;

const readRequiredString = (value: unknown, name: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }
  return value.trim();
};

const resolveWorkspacePath = (
  value: unknown,
  workspacePath?: string,
  options?: { readonly allowMissing?: boolean }
): string => {
  const workspaceRoot = path.resolve(workspacePath ?? process.cwd());
  const rawPath =
    typeof value === "string" && value.trim() ? value.trim() : ".";
  const cleaned = rawPath.replace(LEADING_DOT_SLASH_PATTERN, "");
  const absolutePath = path.isAbsolute(cleaned)
    ? path.resolve(cleaned)
    : path.resolve(workspaceRoot, cleaned);
  if (
    !(
      absolutePath === workspaceRoot ||
      absolutePath.startsWith(`${workspaceRoot}${path.sep}`)
    )
  ) {
    throw new Error("Path escaped the workspace root.");
  }
  if (
    !options?.allowMissing &&
    cleaned.split(PATH_SEGMENT_SEPARATOR_PATTERN).includes("..")
  ) {
    throw new Error("Path must not contain parent segments.");
  }
  return absolutePath;
};

const clampNumber = (
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;

const outputCharsFromBudget = (value: unknown): number =>
  Math.max(4000, clampNumber(value, 1000, 30_000, 10_000) * 4);

const truncateText = (value: string, maxLength: number): string =>
  value.length <= maxLength
    ? value
    : `${value.slice(0, maxLength)}\n...[truncated]`;
