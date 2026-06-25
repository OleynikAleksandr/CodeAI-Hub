#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

const CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const SYSTEM_PROMPT =
  "doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/claude-instruction-analysis/Claude_My_System_Prompt.md";
const OUT = "doc/tmp/prototypes/translation-model-benchmark-live.md";
const BASE_URL = "http://127.0.0.1:1234";
const CODE = /`[^`]+`/gu;
const DATA = /^data:/u;
const LABEL = /^\s*(translation|translated text|перевод)\s*[:：]/iu;
const LM_PREFIX = /^lmstudio:/u;
const OR_ROUTE = "@";
const QWEN = /qwen/iu;
const REQUIRES_REASONING = /^openai\/gpt-oss-/u;
const SERVER_ON = /\bServer:\s*ON\b|\bserver\b.*\brunning\b/iu;
const TEXT_TAG = /<\/?text>/iu;

const OR_DEFAULTS = [
  ["openai/gpt-oss-120b:free"],
  ["nvidia/nemotron-3-super-120b-a12b:free"],
  ["meta-llama/llama-3.1-8b-instruct", "groq"],
  ["google/gemma-4-26b-a4b-it", "parasail"],
  ["google/gemini-2.5-flash-lite-preview-09-2025"],
  ["openai/gpt-oss-20b", "groq"],
];
const LM_DEFAULTS = [
  "llama-3.3-8b-instruct-128k_abliterated-mlx",
  "meta-llama-3-8b-instruct",
  "google/gemma-3-12b",
  "hy-mt2-30b-a3b-oq2-mlx",
  "hy-mt2-1.8b",
  "qwen/qwen3.5-9b",
];
const LM_ALIASES = new Map([
  [
    "Llama-3.3-8B-Instruct-128K_Abliterated-mlx-4Bit",
    "llama-3.3-8b-instruct-128k_abliterated-mlx",
  ],
  ["Meta-Llama-3-8B-Instruct-4bit", "meta-llama-3-8b-instruct"],
  ["gemma-3-12b", "google/gemma-3-12b"],
  ["Hy-MT2-30B-A3B-oQ2-MLX", "hy-mt2-30b-a3b-oq2-mlx"],
  ["Hy-MT2-1.8B-4bit", "hy-mt2-1.8b"],
  ["qwen3.5-9b", "qwen/qwen3.5-9b"],
]);
const PROTECTED = [
  "CodeAI Hub",
  "Project Manager",
  "Session UI",
  "Workflow Tree",
  "Documentation Tree",
  "Development Tree",
  "Local Models",
  "LM Studio",
  "OpenRouter",
  "Core",
  "Core Orchestrator",
  "runtime",
  "workspace",
  "workflow",
  "snapshot",
  "sidecar",
  "overlay",
  "provider",
  "adapter",
  "facade",
  "handoff",
  "rollover",
  "fallback",
  "fail-closed",
  "warmup",
  "preload",
  "stale binding",
  "Claude",
  "Codex",
  "Kimi",
  "GLM",
  "Gemini",
  "OpenAI",
  "Anthropic",
  "Qwen",
  "Mistral",
  "Gemma",
  "thinking",
  "reasoning",
  "streaming",
  "shell",
  "prompt",
  "system prompt",
  "tool",
  "tool call",
  "JSON",
  "Markdown",
  "Git",
  "commit",
  "branch",
  "hook",
  "Husky",
  "npm",
  "build",
  "typecheck",
  "lint",
  "package.json",
  "AGENTS.md",
  "API",
  "WebSocket",
  "CEF",
  "VS Code",
  "turn_completed",
  "token_usage",
  "usage_limits",
  "providerSessionId",
  "reasoningEngineId",
  "uiEngineId",
  "messageId",
  "sourceHash",
  "localizedContent",
];
const BANNED = [
  "менеджер проекта",
  "оболочка",
  "ядро",
  "поставщик",
  "среда выполнения",
  "рабочее пространство",
  "рабочий процесс",
  "резервный вариант",
  "фиксация",
  "крючок",
];
const CASES = [
  [
    "term-preservation-basic",
    ["Project Manager", "shell", "Core", "workflow", "user gate"],
    "The Project Manager is only a projection. It can show a shell-like command surface, but Core owns the workflow state and the next user gate.",
  ],
  [
    "runtime-event-order",
    ["turn_completed", "token_usage", "Core", "rollover", "fallback"],
    "If turn_completed arrives before token_usage, Core keeps rollover arbitration pending until the trailing usage snapshot or an explicit unavailable signal arrives. A silent fallback here would unlock the session too early.",
  ],
  [
    "cli-paths-and-files",
    ["npm", "doc/TODO/todo-plan.md", "git reset --hard"],
    "Run `npm run plan:status`, then inspect `doc/TODO/todo-plan.md`. Do not call `git reset --hard` unless the user explicitly approved it.",
  ],
  [
    "lmstudio-warmup-latency",
    [
      "LM Studio",
      "codeaihub-qwen3-translation",
      "runtime",
      "warmup",
      "preload",
      "lms load",
    ],
    "If LM Studio already has `codeaihub-qwen3-translation` loaded with enough context, reuse that runtime. Do not include model warmup, preload, or `lms load` time in task latency.",
  ],
  [
    "fail-closed-vs-fallback",
    ["Fallback", "fail-closed", "reasoningEngineId"],
    "Fallback is acceptable for non-blocking UI rendering, but fail-closed is required when the user explicitly selected an unavailable reasoningEngineId. The engine must not silently switch to google-gtx.",
  ],
  [
    "markdown-list-reasoning",
    ["provider", "overlay", "messageId", "sourceHash", "localizedContent"],
    "The safe path is:\n- keep provider output source-first;\n- store translated text as an overlay keyed by messageId and sourceHash;\n- render localizedContent when it exists;\n- leave the native transcript untouched.",
  ],
  [
    "long-reasoning-block",
    ["Project Manager", "Core", "provider", "commit"],
    "The bug is not in the Project Manager button. The button only submits a raw review action, while Core decides whether that action belongs to the active gate.\n\nIf the provider turn is still settling, accepting the visible card too early can race against managed commit cleanup. The correct fix is to keep the input locked until Core has persisted messages, classified residue, and opened the next gate.",
  ],
  [
    "short-stream-fragment",
    ["providerSessionId"],
    "Waiting for providerSessionId rebind before sending the next user message.",
  ],
];

const args = parseArgs(process.argv.slice(2));
const live = flag("live", false);
const outPath = opt("out", OUT);
const logPath = opt("log", outPath.replace(/\.[^.]+$/u, ".log"));
const systemPromptPath = opt("system-prompt", SYSTEM_PROMPT);
const iterations = num("iterations", 3);
const caseLimit = num("case-limit", CASES.length);
const timeoutMs = num("timeout-ms", 30_000);
const loadTimeoutMs = num("model-load-timeout-ms", 180_000);
const lmContext = num("lmstudio-context", 8192);
const lmTtl = num("lmstudio-ttl", 600);
const lmBaseUrl = opt(
  "lmstudio-base-url",
  process.env.CODEAI_LMSTUDIO_BASE_URL || BASE_URL
);
const maxTokens = num("max-tokens", 2048);
const temperature = Number(opt("temperature", "0.3"));
const topP = Number(opt("top-p", "0.8"));
const apiKey = opt("api-key", process.env.OPENROUTER_API_KEY || "");
const systemPrompt = await readFile(systemPromptPath, "utf8");
const systemHash = createHash("sha256")
  .update(systemPrompt)
  .digest("hex")
  .slice(0, 16);
const cases = CASES.slice(0, caseLimit);
const targets = [...openRouterTargets(), ...localTargets()];

if (live && targets.some((t) => t.kind === "or") && !apiKey) {
  fail("Set OPENROUTER_API_KEY or pass --api-key for OpenRouter live runs.");
}
await mkdir(path.dirname(outPath), { recursive: true });
await mkdir(path.dirname(logPath), { recursive: true });
await writeFile(logPath, "");

const results = live ? await runLive() : targets.map((target) => dry(target));
const markdown = render(results.sort(sortRows));
await writeFile(
  outPath,
  `${markdown}\n\n\`\`\`json\n${JSON.stringify(results, null, 2)}\n\`\`\`\n`
);
console.log(markdown);
console.error(`Wrote ${outPath}`);

async function runLive() {
  const rows = [];
  for (const target of targets) {
    console.error(`Benchmarking ${target.provider} ${target.model}...`);
    const warmup = target.kind === "lm" ? await warmupLm(target.key) : null;
    const requestModel = warmup?.apiModel ?? target.model;
    const runs = [];
    for (let iteration = 1; iteration <= iterations; iteration += 1) {
      for (const item of cases) {
        runs.push(await runCase(target, requestModel, item, iteration));
      }
    }
    rows.push(summarize(target, runs, warmup));
  }
  return rows;
}

async function runCase(target, requestModel, item, iteration) {
  const [id, terms] = item;
  const started = performance.now();
  try {
    const response =
      target.kind === "or"
        ? await requestOpenRouter(target, item)
        : await requestLm(requestModel, item, target);
    await log(
      `case ok model=${target.model} case=${id} iteration=${iteration}`
    );
    return score(item, response, iteration);
  } catch (error) {
    await log(
      `case error model=${target.model} case=${id} ${String(error?.message || error)}`
    );
    return {
      autoScore: 0,
      error: String(error?.message || error),
      fullLatencyMs: Math.round(performance.now() - started),
      hardFail: true,
      iteration,
      missingTerms: terms,
      outputText: "",
      protectedScore: 0,
      sampleId: id,
      tokensPerSecondApprox: 0,
    };
  }
}

function requestOpenRouter(target, item) {
  const body = chatBody(target.model, item);
  if (!REQUIRES_REASONING.test(target.model)) {
    body.reasoning = { enabled: false, exclude: true };
    body.reasoning_effort = "none";
  }
  if (target.route) {
    body.provider = { allow_fallbacks: false, order: [target.route] };
  }
  return requestChat(CHAT_URL, body, {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://codeai-hub.local/translation-benchmark",
    "X-Title": "CodeAI Hub Translation Benchmark",
  });
}

function requestLm(model, item, target) {
  return requestChat(
    `${lmBaseUrl}/v1/chat/completions`,
    chatBody(model, item, QWEN.test(target.key)),
    { "Content-Type": "application/json" }
  );
}

function chatBody(model, item, noThink = false) {
  return {
    max_tokens: maxTokens,
    messages: [
      { content: systemPrompt, role: "system" },
      { content: prompt(item, noThink), role: "user" },
    ],
    model,
    stream: true,
    temperature,
    top_p: topP,
    usage: { include: true },
  };
}

async function requestChat(url, body, headers) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      body: JSON.stringify(body),
      headers,
      method: "POST",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(
        `${response.status}: ${(await response.text()).slice(0, 800)}`
      );
    }
    return {
      ...(await readResponse(response, started)),
      fullLatencyMs: performance.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function readResponse(response, started) {
  if (!response.body) {
    const payload = await response.json();
    const text = payload.choices?.[0]?.message?.content ?? "";
    return {
      firstTokenLatencyMs: performance.now() - started,
      outputText: text,
      tokensPerSecondApprox: 0,
    };
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let first = null;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseBuffer(buffer);
    buffer = parsed.buffer;
    if (parsed.text) {
      first ??= performance.now() - started;
      text += parsed.text;
    }
  }
  const activeSeconds = Math.max(
    0.001,
    (performance.now() - started - (first ?? 0)) / 1000
  );
  return {
    firstTokenLatencyMs: first,
    outputText: text,
    tokensPerSecondApprox: approxTokens(text) / activeSeconds,
  };
}

function parseSseBuffer(buffer) {
  const chunks = buffer.split("\n\n");
  const tail = chunks.pop() || "";
  let text = "";
  for (const chunk of chunks) {
    for (const line of chunk.split("\n")) {
      if (!DATA.test(line)) {
        continue;
      }
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") {
        continue;
      }
      text += JSON.parse(data).choices?.[0]?.delta?.content ?? "";
    }
  }
  return { buffer: tail, text };
}

async function warmupLm(modelKey) {
  const started = performance.now();
  ensureServer();
  const loaded = loadedModel(modelKey);
  const apiModel = loaded ?? loadModel(modelKey);
  await waitModel(apiModel);
  await requestLm(apiModel, ["warmup", [], 'Translate "Ready." to Russian.'], {
    key: modelKey,
  });
  return {
    apiModel,
    reusedExisting: Boolean(loaded),
    warmupMs: Math.round(performance.now() - started),
  };
}

function ensureServer() {
  try {
    if (SERVER_ON.test(lms(["server", "status"], 5000))) {
      return;
    }
  } catch {
    // start below
  }
  lms(["server", "start"], 30_000);
}

function loadedModel(modelKey) {
  const models = jsonArray(lms(["ps", "--json"], 10_000));
  const match = models.find(
    (model) =>
      model?.type === "llm" &&
      model?.modelKey === modelKey &&
      Number(model?.contextLength ?? 0) >= lmContext
  );
  return typeof match?.identifier === "string" ? match.identifier : null;
}

function loadModel(modelKey) {
  const identifier = `codeaihub-translation-bench-${modelKey.replace(/[^a-zA-Z0-9._-]+/gu, "-")}-${lmContext}`;
  lms(
    [
      "load",
      modelKey,
      "--yes",
      "--context-length",
      String(lmContext),
      "--identifier",
      identifier,
      "--ttl",
      String(lmTtl),
    ],
    loadTimeoutMs
  );
  return identifier;
}

async function waitModel(model) {
  const deadline = performance.now() + loadTimeoutMs;
  while (performance.now() < deadline) {
    try {
      const response = await fetch(`${lmBaseUrl}/v1/models`);
      const payload = response.ok ? await response.json() : null;
      if ((payload?.data ?? []).some((entry) => entry?.id === model)) {
        return;
      }
    } catch {
      // poll again
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`LM Studio model did not appear in /v1/models: ${model}`);
}

function score(item, response, iteration) {
  const [id, terms, source] = item;
  const output = response.outputText.trim();
  const missing = terms.filter((term) => !output.includes(term));
  const banned = BANNED.filter((term) => output.toLowerCase().includes(term));
  const protectedScore = Math.max(
    0,
    Math.round(
      ((terms.length - missing.length) / Math.max(1, terms.length)) * 30
    ) -
      banned.length * 5
  );
  const disciplineScore =
    output && !LABEL.test(output) && !TEXT_TAG.test(output) ? 10 : 0;
  const structureScore = structure(source, output);
  return {
    autoScore: protectedScore + structureScore + disciplineScore,
    bannedHits: banned,
    firstTokenLatencyMs: round(response.firstTokenLatencyMs),
    fullLatencyMs: Math.round(response.fullLatencyMs),
    hardFail: missing.length > 0 || banned.length > 0 || disciplineScore === 0,
    iteration,
    missingTerms: missing,
    outputText: output,
    protectedScore,
    sampleId: id,
    structureScore,
    tokensPerSecondApprox: round(response.tokensPerSecondApprox, 1),
  };
}

function structure(source, output) {
  const sourceCode = source.match(CODE) ?? [];
  const code =
    sourceCode.length === 0 ||
    sourceCode.every((token) => output.includes(token))
      ? 5
      : 0;
  const sourceBullets = source
    .split("\n")
    .filter((line) => line.startsWith("- "));
  const outputBullets = output
    .split("\n")
    .filter((line) => line.startsWith("- "));
  const bullets =
    sourceBullets.length === 0 || sourceBullets.length === outputBullets.length
      ? 3
      : 0;
  const paragraphs =
    source.includes("\n\n") === output.includes("\n\n") ? 2 : 0;
  return code + bullets + paragraphs;
}

function summarize(target, runs, warmup) {
  const latencies = runs
    .map((run) => run.fullLatencyMs)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  return {
    autoScoreAvg: round(avg(runs.map((run) => run.autoScore)), 1),
    caseCount: runs.length,
    caseResults: runs,
    hardFails: runs.filter((run) => run.hardFail).length,
    model: target.model,
    p50LatencyMs: pct(latencies, 0.5),
    p95LatencyMs: pct(latencies, 0.95),
    protectedScoreAvg: round(avg(runs.map((run) => run.protectedScore)), 1),
    provider: target.provider,
    route: target.route ?? null,
    tokensPerSecondAvg: round(
      avg(
        runs
          .map((run) => run.tokensPerSecondApprox)
          .filter((value) => value > 0)
      ),
      1
    ),
    warmup,
    verdict: verdict(runs, latencies),
  };
}

function dry(target) {
  return {
    ...summarize(target, [], null),
    caseCount: cases.length * iterations,
    hardFails: null,
    verdict: "dry run",
  };
}

function verdict(runs, latencies) {
  if (runs.some((run) => run.error)) {
    return "error";
  }
  if (runs.some((run) => run.hardFail)) {
    return "reject: hard fail";
  }
  const p50 = pct(latencies, 0.5);
  if (p50 > 8000) {
    return "reject: slow";
  }
  return p50 > 5000 ? "manual review: latency" : "manual style review";
}

function render(rows) {
  const lines = [
    "# Translation model benchmark",
    "",
    `Mode: ${live ? "live" : "dry run"}. System prompt: \`${systemPromptPath}\` (${systemHash}). Cases: ${cases.length}. Iterations: ${iterations}. Temperature: ${temperature}.`,
    "",
    "| rank | provider | model | route | cases | hard fails | auto score /50 | protected /30 | p50 full | p95 full | tok/s | warmup | verdict |",
    "| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
  ];
  for (const [index, row] of rows.entries()) {
    lines.push(
      `| ${index + 1} | ${row.provider} | \`${row.model}\` | ${row.route ?? ""} | ${row.caseCount ?? ""} | ${row.hardFails ?? ""} | ${row.autoScoreAvg ?? ""} | ${row.protectedScoreAvg ?? ""} | ${ms(row.p50LatencyMs)} | ${ms(row.p95LatencyMs)} | ${row.tokensPerSecondAvg ?? ""} | ${row.warmup ? `${row.warmup.warmupMs}ms` : ""} | ${row.verdict} |`
    );
  }
  lines.push(
    "",
    "Automated score covers protected terms, structure, and output discipline only. Meaning and Russian style still require manual review.",
    "",
    "## Case outputs"
  );
  for (const row of rows) {
    if (row.caseResults.length === 0) {
      continue;
    }
    lines.push("", `### ${row.provider} ${row.model}`, "");
    for (const result of row.caseResults) {
      lines.push(
        `- ${result.sampleId} #${result.iteration}: auto ${result.autoScore}/50, latency ${ms(result.fullLatencyMs)}, missing terms: ${result.missingTerms.length ? result.missingTerms.join(", ") : "none"}`,
        "",
        "```text",
        result.outputText,
        "```",
        ""
      );
    }
  }
  return lines.join("\n");
}

function prompt(item, noThink) {
  const terms = [...new Set([...PROTECTED, ...item[1]])].join("\n");
  const text = [
    "Your current task is translation only.",
    "Translate the supplied English visible reasoning text to Russian.",
    "Return only the translated text. Do not add explanations, summaries, notes, quotes, labels, or Markdown fences unless they already exist in the source text.",
    "Do not produce reasoning, thinking, analysis, or hidden chain-of-thought content.",
    "Preserve every protected English term exactly as written. Do not translate, transliterate, inflect, pluralize, or quote protected terms.",
    "Translate only surrounding natural-language explanations.",
    "",
    "Protected terms:",
    terms,
    "",
    "Text to translate:",
    item[2],
  ].join("\n");
  return noThink ? `/no_think\n${text}` : text;
}

function openRouterTargets() {
  const custom = list("openrouter-model", "openrouter-models");
  const specs = custom.length ? custom.map(parseOr) : OR_DEFAULTS;
  return specs.map(([model, route]) => ({
    kind: "or",
    model,
    provider: "OpenRouter",
    route,
  }));
}

function localTargets() {
  const custom = list("local-model", "local-models").map((item) =>
    lmModelKey(item)
  );
  return (custom.length ? custom : LM_DEFAULTS).map((key) => ({
    key,
    kind: "lm",
    model: `lmstudio:${key}`,
    provider: "Local Models",
  }));
}

function lmModelKey(value) {
  const key = value.replace(LM_PREFIX, "");
  return LM_ALIASES.get(key) ?? key;
}

function parseOr(value) {
  const [model, route] = value.split(OR_ROUTE);
  return [model.trim(), route?.trim().toLowerCase()];
}

function lms(parts, timeout) {
  let lastError = null;
  for (const command of [
    process.env.LMS_PATH,
    "lms",
    path.join(homedir(), ".lmstudio", "bin", "lms"),
    "/opt/homebrew/bin/lms",
    "/usr/local/bin/lms",
  ].filter(Boolean)) {
    if (command !== "lms" && !existsSync(command)) {
      continue;
    }
    const result = spawnSync(command, parts, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout,
    });
    if (!result.error && result.status === 0) {
      return `${result.stdout ?? ""}${result.stderr ?? ""}`;
    }
    lastError = result.error ?? new Error(result.stderr || result.stdout);
  }
  throw lastError ?? new Error("Unable to execute LM Studio CLI.");
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const [key, inline] = arg.slice(2).split("=");
    parsed[key] =
      inline ??
      (argv[index + 1]?.startsWith("--") ? true : argv[++index]) ??
      true;
  }
  return parsed;
}

function opt(name, fallback) {
  return args[name] == null ? fallback : String(args[name]);
}
function num(name, fallback) {
  return args[name] == null ? fallback : Number.parseInt(args[name], 10);
}
function flag(name, fallback) {
  return args[name] == null
    ? fallback
    : args[name] === true || args[name] === "true" || args[name] === "1";
}
function list(...names) {
  return names
    .flatMap((name) => String(args[name] ?? "").split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}
function jsonArray(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function pct(values, ratio) {
  return values.length
    ? values[
        Math.min(values.length - 1, Math.floor((values.length - 1) * ratio))
      ]
    : null;
}
function avg(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length
    ? finite.reduce((sum, value) => sum + value, 0) / finite.length
    : Number.NaN;
}
function approxTokens(value) {
  return Math.max(1, Math.ceil(String(value || "").length / 4));
}
function round(value, digits = 0) {
  return Number.isFinite(value)
    ? Math.round(value * 10 ** digits) / 10 ** digits
    : null;
}
function ms(value) {
  return Number.isFinite(value) ? `${Math.round(value)}ms` : "";
}
async function log(message) {
  await writeFile(logPath, `${new Date().toISOString()} ${message}\n`, {
    flag: "a",
  }).catch(() => undefined);
}
function sortRows(a, b) {
  return (
    (a.hardFails ?? 999) - (b.hardFails ?? 999) ||
    (b.autoScoreAvg ?? -1) - (a.autoScoreAvg ?? -1) ||
    (a.p50LatencyMs ?? 999_999) - (b.p50LatencyMs ?? 999_999)
  );
}
function fail(message) {
  console.error(message);
  process.exit(1);
}
