#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_SYSTEM_PROMPT =
  "doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/claude-instruction-analysis/Claude_My_System_Prompt.md";
const DEFAULT_OUT = "doc/tmp/prototypes/translation-model-benchmark-live.md";
const DEFAULT_LMSTUDIO_BASE_URL = "http://127.0.0.1:1234";
const CODE_SPAN_PATTERN = /`[^`]+`/gu;
const LMSTUDIO_PREFIX_PATTERN = /^lmstudio:/u;
const OUTPUT_LABEL_PATTERN =
  /^\s*(translation|translated text|перевод)\s*[:：]/iu;
const SERVER_RUNNING_PATTERN = /\bServer:\s*ON\b|\bserver\b.*\brunning\b/iu;
const TEXT_TAG_PATTERN = /<\/?text>/iu;

const PROTECTED_TERMS = [
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

const BANNED_TRANSLATIONS = [
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
  {
    id: "term-preservation-basic",
    title: "Term Preservation Basic",
    protectedTerms: [
      "Project Manager",
      "shell",
      "Core",
      "workflow",
      "user gate",
    ],
    source:
      "The Project Manager is only a projection. It can show a shell-like command surface, but Core owns the workflow state and the next user gate.",
  },
  {
    id: "runtime-event-order",
    title: "Runtime Event Order",
    protectedTerms: [
      "turn_completed",
      "token_usage",
      "Core",
      "rollover",
      "fallback",
    ],
    source:
      "If turn_completed arrives before token_usage, Core keeps rollover arbitration pending until the trailing usage snapshot or an explicit unavailable signal arrives. A silent fallback here would unlock the session too early.",
  },
  {
    id: "cli-paths-and-files",
    title: "CLI Paths And Files",
    protectedTerms: ["npm", "doc/TODO/todo-plan.md", "git reset --hard"],
    source:
      "Run `npm run plan:status`, then inspect `doc/TODO/todo-plan.md`. Do not call `git reset --hard` unless the user explicitly approved it.",
  },
  {
    id: "lmstudio-warmup-latency",
    title: "LM Studio Warmup Latency",
    protectedTerms: [
      "LM Studio",
      "codeaihub-qwen3-translation",
      "runtime",
      "warmup",
      "preload",
      "lms load",
    ],
    source:
      "If LM Studio already has `codeaihub-qwen3-translation` loaded with enough context, reuse that runtime. Do not include model warmup, preload, or `lms load` time in task latency.",
  },
  {
    id: "fail-closed-vs-fallback",
    title: "Fail Closed Vs Fallback",
    protectedTerms: ["Fallback", "fail-closed", "reasoningEngineId"],
    source:
      "Fallback is acceptable for non-blocking UI rendering, but fail-closed is required when the user explicitly selected an unavailable reasoningEngineId. The engine must not silently switch to google-gtx.",
  },
  {
    id: "markdown-list-reasoning",
    title: "Markdown List Reasoning",
    protectedTerms: [
      "provider",
      "overlay",
      "messageId",
      "sourceHash",
      "localizedContent",
    ],
    source: [
      "The safe path is:",
      "- keep provider output source-first;",
      "- store translated text as an overlay keyed by messageId and sourceHash;",
      "- render localizedContent when it exists;",
      "- leave the native transcript untouched.",
    ].join("\n"),
  },
  {
    id: "long-reasoning-block",
    title: "Long Reasoning Block",
    protectedTerms: ["Project Manager", "Core", "provider", "commit"],
    source: [
      "The bug is not in the Project Manager button. The button only submits a raw review action, while Core decides whether that action belongs to the active gate.",
      "",
      "If the provider turn is still settling, accepting the visible card too early can race against managed commit cleanup. The correct fix is to keep the input locked until Core has persisted messages, classified residue, and opened the next gate.",
    ].join("\n"),
  },
  {
    id: "short-stream-fragment",
    title: "Short Stream Fragment",
    protectedTerms: ["providerSessionId"],
    source:
      "Waiting for providerSessionId rebind before sending the next user message.",
  },
];

const args = parseArgs(process.argv.slice(2));
const live = boolArg("live", false);
const outPath = stringArg("out", DEFAULT_OUT);
const logPath = stringArg("log", outPath.replace(/\.[^.]+$/u, ".log"));
const systemPromptPath = stringArg("system-prompt", DEFAULT_SYSTEM_PROMPT);
const iterations = intArg("iterations", 3);
const caseLimit = intArg("case-limit", CASES.length);
const caseFilter = stringArg("case", "");
const timeoutMs = intArg("timeout-ms", 30_000);
const modelLoadTimeoutMs = intArg("model-load-timeout-ms", 180_000);
const lmstudioContext = intArg("lmstudio-context", 8192);
const lmstudioTtl = intArg("lmstudio-ttl", 600);
const lmstudioBaseUrl = stringArg(
  "lmstudio-base-url",
  process.env.CODEAI_LMSTUDIO_BASE_URL || DEFAULT_LMSTUDIO_BASE_URL
);
const maxTokens = intArg("max-tokens", 2048);
const temperature = numberArg("temperature", 0.1);
const topP = numberArg("top-p", 0.8);
const apiKey = stringArg("api-key", process.env.OPENROUTER_API_KEY || "");
const openRouterModels = listArg("openrouter-model", "openrouter-models");
const localModels = listArg("local-model", "local-models").map((model) =>
  model.replace(LMSTUDIO_PREFIX_PATTERN, "")
);

const selectedCases = (
  caseFilter ? CASES.filter((testCase) => testCase.id === caseFilter) : CASES
).slice(0, caseLimit);

if (selectedCases.length === 0) {
  fail(`No cases matched --case=${caseFilter}`);
}

const systemPrompt = await readFile(systemPromptPath, "utf8");
const systemPromptHash = createHash("sha256")
  .update(systemPrompt)
  .digest("hex")
  .slice(0, 16);

const targets = [
  ...openRouterModels.map((model) => ({
    model,
    provider: "OpenRouter",
    type: "openrouter",
  })),
  ...localModels.map((model) => ({
    model: `lmstudio:${model}`,
    modelKey: model,
    provider: "Local Models",
    type: "lmstudio",
  })),
];

if (live && targets.length === 0) {
  fail("Pass --openrouter-model or --local-model when using --live.");
}

if (live && openRouterModels.length > 0 && !apiKey) {
  fail("Set OPENROUTER_API_KEY or pass --api-key for OpenRouter live runs.");
}

await mkdir(path.dirname(outPath), { recursive: true });
await mkdir(path.dirname(logPath), { recursive: true });
await writeFile(logPath, "");

let results;
if (live) {
  results = await runLive(targets);
} else if (targets.length > 0) {
  results = targets.map(dryTargetResult);
} else {
  results = [
    dryTargetResult({
      model: "TODO_OPENROUTER_MODEL",
      provider: "OpenRouter",
      type: "openrouter",
    }),
    dryTargetResult({
      model: "lmstudio:TODO_LOCAL_MODEL",
      modelKey: "TODO_LOCAL_MODEL",
      provider: "Local Models",
      type: "lmstudio",
    }),
  ];
}

const ranked = results.sort(compareResults);
const markdown = renderMarkdown(ranked);
await writeFile(
  outPath,
  `${markdown}\n\n\`\`\`json\n${JSON.stringify(ranked, null, 2)}\n\`\`\`\n`
);
console.log(markdown);
console.error(`Wrote ${outPath}`);

async function runLive(runTargets) {
  const output = [];
  for (const target of runTargets) {
    console.error(`Benchmarking ${target.provider} ${target.model}...`);
    await appendLog(`target start ${target.provider} ${target.model}`);
    output.push(await runTarget(target));
  }
  return output;
}

async function runTarget(target) {
  const warmup =
    target.type === "lmstudio" ? await warmupLmStudio(target.modelKey) : null;
  const requestModel = warmup?.apiModel ?? target.model;
  const caseResults = [];

  for (let iteration = 1; iteration <= iterations; iteration += 1) {
    for (const testCase of selectedCases) {
      const started = performance.now();
      try {
        const response =
          target.type === "openrouter"
            ? await callOpenRouter(target.model, testCase)
            : await callLmStudio(requestModel, testCase);
        caseResults.push(scoreCase(testCase, response, iteration));
        await appendLog(
          `case done model=${target.model} case=${testCase.id} iteration=${iteration} latency=${Math.round(
            response.fullLatencyMs
          )}`
        );
      } catch (error) {
        caseResults.push({
          autoScore: 0,
          bannedHits: [],
          disciplineScore: 0,
          error: String(error?.message || error),
          firstTokenLatencyMs: null,
          fullLatencyMs: Math.round(performance.now() - started),
          hardFail: true,
          iteration,
          missingTerms: testCase.protectedTerms,
          outputText: "",
          outputTokensApprox: 0,
          protectedScore: 0,
          preservedTerms: [],
          sampleId: testCase.id,
          structureScore: 0,
          tokensPerSecondApprox: 0,
        });
        await appendLog(
          `case error model=${target.model} case=${
            testCase.id
          } iteration=${iteration} error=${String(error?.message || error)}`
        );
      }
    }
  }

  return summarizeTarget(target, caseResults, warmup);
}

function callOpenRouter(model, testCase) {
  return callStreamingChat({
    body: {
      max_tokens: maxTokens,
      messages: [
        { content: systemPrompt, role: "system" },
        { content: buildUserPrompt(testCase), role: "user" },
      ],
      model,
      stream: true,
      temperature,
      top_p: topP,
      usage: { include: true },
    },
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://codeai-hub.local/translation-benchmark",
      "X-Title": "CodeAI Hub Translation Benchmark",
    },
    timeoutMs,
    url: OPENROUTER_CHAT_URL,
  });
}

function callLmStudio(model, testCase) {
  return callStreamingChat({
    body: {
      max_tokens: maxTokens,
      messages: [
        { content: systemPrompt, role: "system" },
        { content: buildUserPrompt(testCase), role: "user" },
      ],
      model,
      stream: true,
      temperature,
      top_p: topP,
    },
    headers: { "Content-Type": "application/json" },
    timeoutMs,
    url: `${lmstudioBaseUrl}/v1/chat/completions`,
  });
}

async function callStreamingChat(options) {
  const started = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(options.url, {
      body: JSON.stringify(options.body),
      headers: options.headers,
      method: "POST",
      signal: controller.signal,
    }).catch((error) => {
      if (error?.name === "AbortError") {
        throw new Error(`request timed out after ${options.timeoutMs}ms`);
      }
      throw error;
    });

    if (!response.ok) {
      throw new Error(
        `${response.status}: ${(await response.text()).slice(0, 800)}`
      );
    }

    const parsed = await readSseContent(response, started);
    return {
      ...parsed,
      fullLatencyMs: performance.now() - started,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function readSseContent(response, started) {
  if (!response.body) {
    return readJsonChatContent(response, started);
  }

  return readSseStream(response.body, started);
}

async function readJsonChatContent(response, started) {
  const payload = await response.json();
  const outputText = payload.choices?.[0]?.message?.content ?? "";
  return {
    firstTokenLatencyMs: performance.now() - started,
    outputText,
    outputTokensApprox: approxTokens(outputText),
    tokensPerSecondApprox: 0,
    usage: payload.usage ?? null,
  };
}

async function readSseStream(body, started) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const state = {
    firstTokenLatencyMs: null,
    outputText: "",
    usage: null,
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";
    applySseChunks(chunks, state, started);
  }

  const outputTokensApprox = approxTokens(state.outputText);
  const activeSeconds = Math.max(
    0.001,
    (performance.now() - started - (state.firstTokenLatencyMs ?? 0)) / 1000
  );
  return {
    firstTokenLatencyMs: state.firstTokenLatencyMs,
    outputText: state.outputText,
    outputTokensApprox,
    tokensPerSecondApprox: outputTokensApprox / activeSeconds,
    usage: state.usage,
  };
}

function applySseChunks(chunks, state, started) {
  for (const chunk of chunks) {
    for (const line of chunk.split("\n")) {
      applySseLine(line, state, started);
    }
  }
}

function applySseLine(line, state, started) {
  if (!line.startsWith("data:")) {
    return;
  }
  const data = line.slice(5).trim();
  if (!data || data === "[DONE]") {
    return;
  }
  const json = JSON.parse(data);
  state.usage = json.usage ?? state.usage;
  const delta = json.choices?.[0]?.delta?.content ?? "";
  if (!delta) {
    return;
  }
  state.firstTokenLatencyMs ??= performance.now() - started;
  state.outputText += delta;
}

async function warmupLmStudio(modelKey) {
  const started = performance.now();
  ensureLmStudioServer();
  const loaded = findLoadedModel(modelKey);
  const apiModel =
    loaded ??
    loadLmStudioModel({
      contextLength: lmstudioContext,
      modelKey,
    });
  await waitForLmStudioModel(apiModel);
  await callLmStudio(apiModel, {
    id: "warmup-health-check",
    protectedTerms: [],
    source: 'Translate "Ready." to Russian.',
  });
  return {
    apiModel,
    reusedExisting: Boolean(loaded),
    warmupMs: Math.round(performance.now() - started),
  };
}

function ensureLmStudioServer() {
  try {
    const status = runLms(["server", "status"], 5000);
    if (SERVER_RUNNING_PATTERN.test(status)) {
      return;
    }
  } catch {
    // Try start below.
  }
  runLms(["server", "start"], 30_000);
}

function findLoadedModel(modelKey) {
  const records = parseJsonArray(runLms(["ps", "--json"], 10_000));
  const match = records.find(
    (record) =>
      record?.type === "llm" &&
      record?.modelKey === modelKey &&
      typeof record?.identifier === "string" &&
      Number(record?.contextLength ?? 0) >= lmstudioContext
  );
  return match?.identifier ?? null;
}

function loadLmStudioModel(input) {
  const identifier = `codeaihub-translation-bench-${slugify(
    input.modelKey
  )}-${input.contextLength}`;
  runLms(
    [
      "load",
      input.modelKey,
      "--yes",
      "--context-length",
      String(input.contextLength),
      "--identifier",
      identifier,
      "--ttl",
      String(lmstudioTtl),
    ],
    modelLoadTimeoutMs
  );
  return identifier;
}

async function waitForLmStudioModel(model) {
  const deadline = performance.now() + modelLoadTimeoutMs;
  while (performance.now() < deadline) {
    try {
      const response = await fetch(`${lmstudioBaseUrl}/v1/models`);
      const payload = response.ok ? await response.json() : null;
      const models = Array.isArray(payload?.data) ? payload.data : [];
      if (models.some((entry) => entry?.id === model)) {
        return;
      }
    } catch {
      // Keep polling until timeout.
    }
    await sleep(1000);
  }
  throw new Error(`LM Studio model did not appear in /v1/models: ${model}`);
}

function runLms(args, timeoutMs) {
  const commands = [
    process.env.LMS_PATH,
    "lms",
    path.join(homedir(), ".lmstudio", "bin", "lms"),
    "/opt/homebrew/bin/lms",
    "/usr/local/bin/lms",
  ].filter(Boolean);
  let lastError = null;
  for (const command of commands) {
    if (command !== "lms" && !existsSync(command)) {
      continue;
    }
    const result = spawnSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
    });
    if (!result.error && result.status === 0) {
      return `${result.stdout ?? ""}${result.stderr ?? ""}`;
    }
    lastError = result.error ?? new Error(result.stderr || result.stdout);
  }
  throw lastError ?? new Error("Unable to execute LM Studio CLI.");
}

function scoreCase(testCase, response, iteration) {
  const outputText = response.outputText.trim();
  const missingTerms = testCase.protectedTerms.filter(
    (term) => !outputText.includes(term)
  );
  const preservedTerms = testCase.protectedTerms.filter((term) =>
    outputText.includes(term)
  );
  const bannedHits = BANNED_TRANSLATIONS.filter((term) =>
    outputText.toLowerCase().includes(term)
  );
  const protectedScore = Math.max(
    0,
    Math.round(
      (preservedTerms.length / Math.max(1, testCase.protectedTerms.length)) * 30
    ) -
      bannedHits.length * 5
  );
  const structureScore = scoreStructure(testCase.source, outputText);
  const disciplineScore = scoreDiscipline(testCase.source, outputText);
  const hardFail =
    missingTerms.length > 0 || bannedHits.length > 0 || disciplineScore === 0;

  return {
    autoScore: protectedScore + structureScore + disciplineScore,
    bannedHits,
    disciplineScore,
    firstTokenLatencyMs: roundOrNull(response.firstTokenLatencyMs),
    fullLatencyMs: Math.round(response.fullLatencyMs),
    hardFail,
    iteration,
    missingTerms,
    outputText,
    outputTokensApprox: response.outputTokensApprox,
    protectedScore,
    preservedTerms,
    sampleId: testCase.id,
    structureScore,
    tokensPerSecondApprox: round(response.tokensPerSecondApprox, 1),
    usage: response.usage ?? null,
  };
}

function scoreStructure(source, output) {
  const sourceCode = source.match(CODE_SPAN_PATTERN) ?? [];
  const codeScore = scoreCodeSpans(sourceCode, output);
  const sourceBullets = source
    .split("\n")
    .filter((line) => line.startsWith("- "));
  const outputBullets = output
    .split("\n")
    .filter((line) => line.startsWith("- "));
  const bulletScore = scoreBulletShape(sourceBullets, outputBullets);
  const paragraphScore =
    source.includes("\n\n") === output.includes("\n\n") ? 2 : 0;
  return codeScore + bulletScore + paragraphScore;
}

function scoreCodeSpans(sourceCode, output) {
  if (sourceCode.length === 0) {
    return 5;
  }
  return sourceCode.every((token) => output.includes(token)) ? 5 : 0;
}

function scoreBulletShape(sourceBullets, outputBullets) {
  if (sourceBullets.length === 0) {
    return 3;
  }
  return sourceBullets.length === outputBullets.length ? 3 : 0;
}

function scoreDiscipline(source, output) {
  if (!output.trim()) {
    return 0;
  }
  if (OUTPUT_LABEL_PATTERN.test(output)) {
    return 0;
  }
  if (!source.includes("```") && output.includes("```")) {
    return 0;
  }
  if (TEXT_TAG_PATTERN.test(output)) {
    return 0;
  }
  return 10;
}

function summarizeTarget(target, caseResults, warmup) {
  const latencies = caseResults
    .map((item) => item.fullLatencyMs)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  return {
    autoScoreAvg: round(avg(caseResults.map((item) => item.autoScore)), 1),
    caseCount: caseResults.length,
    caseResults,
    hardFails: caseResults.filter((item) => item.hardFail).length,
    model: target.model,
    p50LatencyMs: percentile(latencies, 0.5),
    p95LatencyMs: percentile(latencies, 0.95),
    protectedScoreAvg: round(
      avg(caseResults.map((item) => item.protectedScore)),
      1
    ),
    provider: target.provider,
    tokensPerSecondAvg: round(
      avg(
        caseResults
          .map((item) => item.tokensPerSecondApprox)
          .filter((value) => value > 0)
      ),
      1
    ),
    warmup,
    verdict: resolveVerdict(caseResults, latencies),
  };
}

function resolveVerdict(caseResults, latencies) {
  if (caseResults.some((item) => item.error)) {
    return "error";
  }
  if (caseResults.some((item) => item.hardFail)) {
    return "reject: hard fail";
  }
  const p50 = percentile(latencies, 0.5);
  if (p50 > 8000) {
    return "reject: slow";
  }
  if (p50 > 5000) {
    return "manual review: latency";
  }
  return "manual style review";
}

function dryTargetResult(target) {
  return {
    autoScoreAvg: null,
    caseCount: selectedCases.length * iterations,
    caseResults: [],
    hardFails: null,
    model: target.model,
    p50LatencyMs: null,
    p95LatencyMs: null,
    protectedScoreAvg: null,
    provider: target.provider,
    tokensPerSecondAvg: null,
    warmup: null,
    verdict: live ? "not run" : "dry run",
  };
}

function renderMarkdown(rows) {
  const lines = [
    "# Translation model benchmark",
    "",
    `Mode: ${live ? "live" : "dry run"}. System prompt: \`${systemPromptPath}\` (${systemPromptHash}). Cases: ${selectedCases.length}. Iterations: ${iterations}.`,
    "",
    "| rank | provider | model | cases | hard fails | auto score /50 | protected /30 | p50 full | p95 full | tok/s | warmup | verdict |",
    "| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
  ];
  rows.forEach((row, index) => {
    lines.push(
      `| ${index + 1} | ${escapeCell(row.provider)} | \`${escapeCell(
        row.model
      )}\` | ${row.caseCount ?? ""} | ${row.hardFails ?? ""} | ${
        row.autoScoreAvg ?? ""
      } | ${row.protectedScoreAvg ?? ""} | ${formatMs(
        row.p50LatencyMs
      )} | ${formatMs(row.p95LatencyMs)} | ${row.tokensPerSecondAvg ?? ""} | ${
        row.warmup ? `${row.warmup.warmupMs}ms` : ""
      } | ${escapeCell(row.verdict)} |`
    );
  });

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
        `- ${result.sampleId} #${result.iteration}: auto ${result.autoScore}/50, latency ${formatMs(
          result.fullLatencyMs
        )}, missing terms: ${
          result.missingTerms.length ? result.missingTerms.join(", ") : "none"
        }`
      );
      lines.push("", "```text", result.outputText, "```", "");
    }
  }

  return lines.join("\n");
}

function buildUserPrompt(testCase) {
  const terms = dedupe([...PROTECTED_TERMS, ...testCase.protectedTerms]).join(
    "\n"
  );
  return [
    "Your current task is translation only.",
    "",
    "Translate the supplied English visible reasoning text to Russian.",
    "Return only the translated text. Do not add explanations, summaries, notes, quotes, labels, or Markdown fences unless they already exist in the source text.",
    "",
    "Preserve every protected English term exactly as written. Do not translate, transliterate, inflect, pluralize, or quote protected terms.",
    "Translate only surrounding natural-language explanations.",
    "",
    "Protected terms:",
    terms,
    "",
    "Text to translate:",
    testCase.source,
  ].join("\n");
}

function compareResults(a, b) {
  return (
    (a.hardFails ?? Number.POSITIVE_INFINITY) -
      (b.hardFails ?? Number.POSITIVE_INFINITY) ||
    (b.autoScoreAvg ?? -1) - (a.autoScoreAvg ?? -1) ||
    (a.p50LatencyMs ?? Number.POSITIVE_INFINITY) -
      (b.p50LatencyMs ?? Number.POSITIVE_INFINITY)
  );
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const [key, inlineValue] = arg.slice(2).split("=");
    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
    } else if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
      parsed[key] = argv[++index];
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}

function listArg(...names) {
  return names
    .flatMap((name) => String(args[name] ?? "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function stringArg(name, fallback) {
  return args[name] == null ? fallback : String(args[name]);
}

function intArg(name, fallback) {
  return args[name] == null ? fallback : Number.parseInt(args[name], 10);
}

function numberArg(name, fallback) {
  return args[name] == null ? fallback : Number(args[name]);
}

function boolArg(name, fallback) {
  if (args[name] == null) {
    return fallback;
  }
  return args[name] === true || args[name] === "true" || args[name] === "1";
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function approxTokens(value) {
  return Math.max(1, Math.ceil(String(value || "").length / 4));
}

function percentile(values, ratio) {
  if (values.length === 0) {
    return null;
  }
  return values[
    Math.min(values.length - 1, Math.floor((values.length - 1) * ratio))
  ];
}

function avg(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length
    ? finite.reduce((total, value) => total + value, 0) / finite.length
    : Number.NaN;
}

function round(value, digits = 0) {
  if (!Number.isFinite(value)) {
    return null;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function roundOrNull(value) {
  return Number.isFinite(value) ? Math.round(value) : null;
}

function formatMs(value) {
  return Number.isFinite(value) ? `${Math.round(value)}ms` : "";
}

function escapeCell(value) {
  return String(value ?? "").replace(/\|/gu, "\\|");
}

function slugify(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/gu, "-");
}

function dedupe(values) {
  return Array.from(new Set(values));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function appendLog(message) {
  await writeFile(logPath, `${new Date().toISOString()} ${message}\n`, {
    flag: "a",
  }).catch(() => undefined);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
