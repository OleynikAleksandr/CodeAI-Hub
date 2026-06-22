import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { runProcess, runShell } from "./glm-native-process";
import type { GlmToolCall } from "./glm-native-sse-parser";

const LEADING_DOT_SLASH_PATTERN = /^\.\/+/u;
const PATH_SEGMENT_SEPARATOR_PATTERN = /[\\/]+/u;
const HTML_SCRIPT_STYLE_PATTERN =
  /<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/giu;
const HTML_TAG_PATTERN = /<[^>]+>/gu;
const WHITESPACE_PATTERN = /\s+/gu;
const DUCK_RESULT_PATTERN =
  /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/giu;
const BING_RESULT_PATTERN =
  /<li[^>]+class="b_algo"[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<p[^>]*>([\s\S]*?)<\/p>)?/giu;

export const executeGlmNativeTool = async (
  toolCall: GlmToolCall,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  const args = parseToolArguments(toolCall.function.arguments);
  const result = await dispatchTool(
    toolCall.function.name,
    args,
    workspacePath
  );
  return { ...result, tool_call_id: toolCall.id };
};

const dispatchTool = (
  name: string,
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> | Record<string, unknown> => {
  switch (name) {
    case "apply_patch":
      return executeApplyPatchTool(args, workspacePath);
    case "exec_command":
      return executeCommandTool(args, workspacePath);
    case "glob_files":
      return executeGlobFilesTool(args, workspacePath);
    case "grep_files":
      return executeGrepFilesTool(args, workspacePath);
    case "read_file":
      return executeReadFileTool(args, workspacePath);
    case "web_fetch":
      return executeWebFetchTool(args);
    case "web_search":
      return executeWebSearchTool(args);
    case "write_file":
      return executeWriteFileTool(args, workspacePath);
    case "write_workflow_artifact":
      return executeWorkflowArtifactTool(args, workspacePath);
    default:
      return { error: `Unknown tool: ${name}`, ok: false };
  }
};

const executeCommandTool = async (
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  const command = readRequiredString(args.cmd, "cmd");
  const cwd = resolveWorkspacePath(args.workdir, workspacePath, {
    allowMissing: true,
  });
  const timeoutMs = clampNumber(args.yield_time_ms, 250, 300_000, 30_000);
  const maxOutputChars = outputCharsFromBudget(args.max_output_tokens);
  const shell = typeof args.shell === "string" ? args.shell : undefined;
  const result = await runShell(command, cwd, timeoutMs, maxOutputChars, shell);
  return { command, cwd, ...result };
};

const executeGrepFilesTool = async (
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  const pattern = readRequiredString(args.pattern, "pattern");
  const cwd = resolveWorkspacePath(args.path, workspacePath, {
    allowMissing: true,
  });
  const maxResults = clampNumber(args.max_results, 1, 500, 100);
  const rgArgs = [
    "--no-config",
    "--hidden",
    "--no-messages",
    "--line-number",
    "--column",
    "--glob",
    "!**/.git/**",
  ];
  if (typeof args.include === "string" && args.include.trim()) {
    rgArgs.push("--glob", args.include.trim());
  }
  rgArgs.push("--", pattern, ".");
  const result = await runProcess("rg", rgArgs, cwd, 30_000, 80_000);
  const matches = result.stdout
    .split("\n")
    .filter(Boolean)
    .slice(0, maxResults);
  return {
    cwd,
    matches,
    ok: result.ok || result.exitCode === 1,
    stderr: result.stderr,
    stdout: matches.join("\n"),
  };
};

const executeGlobFilesTool = async (
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  const pattern = readRequiredString(args.pattern, "pattern");
  const cwd = resolveWorkspacePath(args.path, workspacePath, {
    allowMissing: true,
  });
  const maxResults = clampNumber(args.max_results, 1, 1000, 200);
  const result = await runProcess(
    "rg",
    [
      "--no-config",
      "--files",
      "--hidden",
      "--glob",
      "!**/.git/**",
      "--glob",
      pattern,
    ],
    cwd,
    30_000,
    80_000
  );
  const files = result.stdout.split("\n").filter(Boolean).slice(0, maxResults);
  return {
    cwd,
    files,
    ok: result.ok || result.exitCode === 1,
    stderr: result.stderr,
    stdout: files.join("\n"),
  };
};

const executeReadFileTool = async (
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  const absolutePath = resolveWorkspacePath(args.path, workspacePath);
  const content = await readFile(absolutePath, "utf8");
  const offset = clampNumber(args.offset, 1, Number.MAX_SAFE_INTEGER, 1);
  const limit = clampNumber(args.limit, 1, 5000, 2000);
  const lines = content.split("\n").slice(offset - 1, offset - 1 + limit);
  return {
    content: lines.join("\n"),
    ok: true,
    path: absolutePath,
    totalLines: content.split("\n").length,
  };
};

const executeWriteFileTool = async (
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  const absolutePath = resolveWorkspacePath(args.path, workspacePath);
  const content = readRequiredString(args.content, "content", {
    allowEmpty: true,
  });
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
  return {
    bytes: Buffer.byteLength(content, "utf8"),
    ok: true,
    path: absolutePath,
  };
};

const executeApplyPatchTool = async (
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  const patch = readRequiredString(args.patch, "patch");
  const cwd = resolveWorkspacePath(undefined, workspacePath, {
    allowMissing: true,
  });
  const result = await runProcess(
    "apply_patch",
    [],
    cwd,
    30_000,
    80_000,
    patch
  );
  return { cwd, ...result };
};

const executeWorkflowArtifactTool = async (
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  if (!workspacePath) {
    return {
      error: "Workspace root is not available for artifact writes.",
      ok: false,
    };
  }
  const relativePath = readRequiredString(args.relative_path, "relative_path");
  const content = readRequiredString(args.content, "content", {
    allowEmpty: true,
  });
  const resolved = resolveWorkflowArtifactPath(workspacePath, relativePath);
  await mkdir(path.dirname(resolved.absolutePath), { recursive: true });
  await writeFile(resolved.absolutePath, content, "utf8");
  return {
    bytes: Buffer.byteLength(content, "utf8"),
    ok: true,
    relative_path: resolved.relativePath,
  };
};

const executeWebFetchTool = async (
  args: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const url = readRequiredString(args.url, "url");
  const maxChars = clampNumber(args.max_chars, 1000, 100_000, 20_000);
  const response = await fetchWithTimeout(url, 30_000);
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    text: truncateText(cleanWebText(text), maxChars),
    url,
  };
};

const executeWebSearchTool = async (
  args: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const query = readRequiredString(args.query, "query");
  const count = readWebSearchCount(args.response_length);
  const duckUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetchWithTimeout(duckUrl, 30_000);
  const html = await response.text();
  const results = parseDuckResults(html).slice(0, count);
  if (results.length > 0) {
    return { ok: true, query, results, source: "duckduckgo_html" };
  }
  const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
  const bing = await fetchWithTimeout(bingUrl, 30_000);
  const bingHtml = await bing.text();
  return {
    ok: bing.ok,
    query,
    results: parseBingResults(bingHtml).slice(0, count),
    source: "bing_html",
  };
};

const fetchWithTimeout = async (
  url: string,
  timeoutMs: number
): Promise<Response> => {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(parsed, {
      headers: { "User-Agent": "codeai-hub-glm-native/1.0" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

const parseDuckResults = (
  html: string
): Array<{ readonly title: string; readonly url: string }> =>
  Array.from(html.matchAll(DUCK_RESULT_PATTERN), (match) => ({
    title: cleanWebText(match[2] ?? ""),
    url: decodeDuckUrl(match[1] ?? ""),
  })).filter((result) => result.title && result.url);

const parseBingResults = (
  html: string
): Array<{
  readonly snippet: string;
  readonly title: string;
  readonly url: string;
}> =>
  Array.from(html.matchAll(BING_RESULT_PATTERN), (match) => ({
    snippet: cleanWebText(match[3] ?? ""),
    title: cleanWebText(match[2] ?? ""),
    url: decodeHtml(match[1] ?? ""),
  })).filter((result) => result.title && result.url);

const decodeDuckUrl = (value: string): string => {
  const decoded = decodeHtml(value);
  try {
    const parsed = new URL(decoded, "https://duckduckgo.com");
    return parsed.searchParams.get("uddg") ?? decoded;
  } catch {
    return decoded;
  }
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

const parseToolArguments = (value: string): Record<string, unknown> => {
  const parsed = JSON.parse(value || "{}") as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Tool arguments must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
};

const readRequiredString = (
  value: unknown,
  name: string,
  options?: { readonly allowEmpty?: boolean }
): string => {
  if (typeof value !== "string") {
    throw new Error(`${name} must be a string.`);
  }
  const result = options?.allowEmpty ? value : value.trim();
  if (!options?.allowEmpty && result.length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }
  return result;
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
  const rootWithSeparator = `${workspaceRoot}${path.sep}`;
  if (
    !(
      absolutePath === workspaceRoot ||
      absolutePath.startsWith(rootWithSeparator)
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

const resolveWorkflowArtifactPath = (
  workspacePath: string,
  rawRelativePath: string
): { readonly absolutePath: string; readonly relativePath: string } => {
  const relativePath = rawRelativePath
    .trim()
    .replace(LEADING_DOT_SLASH_PATTERN, "");
  if (path.isAbsolute(relativePath)) {
    throw new Error("Artifact path must be workspace-relative.");
  }
  if (!relativePath.startsWith(".codeai-hub/")) {
    throw new Error("Artifact path must start with .codeai-hub/.");
  }
  if (relativePath.split(PATH_SEGMENT_SEPARATOR_PATTERN).includes("..")) {
    throw new Error("Artifact path must not contain parent segments.");
  }
  return {
    absolutePath: resolveWorkspacePath(relativePath, workspacePath),
    relativePath,
  };
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

const readWebSearchCount = (value: unknown): number => {
  if (value === "long") {
    return 8;
  }
  if (value === "short") {
    return 3;
  }
  return 5;
};

const truncateText = (value: string, maxLength: number): string =>
  value.length <= maxLength
    ? value
    : `${value.slice(0, maxLength)}\n...[truncated]`;
