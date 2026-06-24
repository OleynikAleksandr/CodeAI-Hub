import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import StatusPanel, { formatContextWindowUsage } from "./status-panel";

const buildStatus = (overrides: Record<string, unknown> = {}) => ({
  connectionState: "idle" as const,
  continuityLock: { active: false, updatedAt: Date.now() },
  models: [
    {
      modelDisplayName: "Sonnet",
      modelId: "sonnet",
      providerId: "claudeCodeCli" as const,
      providerName: "Claude",
      reasoning: "high",
    },
  ],
  providerSummary: "Claude",
  tokenUsage: { used: 22_328, limit: 200_000 },
  updatedAt: Date.now(),
  ...overrides,
});

test("StatusPanel renders four chips for a Claude session", () => {
  Object.assign(globalThis, { React: { createElement } });

  const html = renderToStaticMarkup(
    createElement(StatusPanel, {
      connectionStatus: "ready",
      status: buildStatus(),
    })
  );

  assert.equal(html.includes("Model:"), true);
  assert.equal(html.includes("Sonnet"), true);
  assert.equal(html.includes("(high)"), true);
  assert.equal(html.includes("Tokens:"), true);
  assert.equal(html.includes("22,328"), true);
  assert.equal(html.includes("(89%)"), true);
  assert.equal(
    html.includes("Context window: 22,328 used, 200,000 limit, 89% remaining"),
    true
  );
  assert.equal(html.includes("session-status-button--claude"), true);
  assert.equal(html.includes("session-status-chip--limits"), true);
});

test("formatContextWindowUsage returns remaining percentage", () => {
  assert.deepEqual(formatContextWindowUsage({ used: 27_433, limit: 262_144 }), {
    title: "Context window: 27,433 used, 262,144 limit, 90% remaining",
    value: "27,433 (90%)",
  });
});

test("formatContextWindowUsage handles unknown context limit", () => {
  assert.deepEqual(formatContextWindowUsage({ used: 27_433, limit: 0 }), {
    title: "Context window: 27,433 used, unknown limit, 0% remaining",
    value: "27,433 (0%)",
  });
});

test("StatusPanel applies the Codex provider class", () => {
  Object.assign(globalThis, { React: { createElement } });

  const html = renderToStaticMarkup(
    createElement(StatusPanel, {
      connectionStatus: "ready",
      status: buildStatus({
        models: [
          {
            modelDisplayName: "Gpt 5.5 Codex Spark",
            modelId: "gpt-5.3-codex-spark reasoning:xhigh",
            providerId: "codexCli" as const,
            providerName: "Codex",
            reasoning: "xhigh",
          },
        ],
      }),
    })
  );

  assert.equal(html.includes("session-status-button--codex"), true);
  assert.equal(html.includes("Gpt 5.5 Codex Spark"), true);
  assert.equal(html.includes("(xhigh)"), true);
});

test("StatusPanel applies the Kimi provider class", () => {
  Object.assign(globalThis, { React: { createElement } });

  const html = renderToStaticMarkup(
    createElement(StatusPanel, {
      connectionStatus: "ready",
      status: buildStatus({
        models: [
          {
            modelDisplayName: "Kimi K2.7 Code",
            modelId: "kimi-k2.7-code",
            providerId: "kimiCode" as const,
            providerName: "Kimi",
          },
        ],
      }),
    })
  );

  assert.equal(html.includes("session-status-button--kimi"), true);
  assert.equal(html.includes("Kimi K2.7 Code"), true);
});

test("StatusPanel renders the Local Models selected model identity", () => {
  Object.assign(globalThis, { React: { createElement } });

  const html = renderToStaticMarkup(
    createElement(StatusPanel, {
      connectionStatus: "ready",
      status: buildStatus({
        models: [
          {
            modelDisplayName: "Gemma 4 E4b Qat",
            modelId: "gemma-4-e4b-qat",
            providerId: "localModels" as const,
            providerName: "Local Models",
          },
        ],
      }),
    })
  );

  assert.equal(html.includes("session-status-button--violet"), true);
  assert.equal(html.includes("Gemma 4 E4b Qat"), true);
});

test("StatusPanel hides the reasoning chip when reasoning is missing", () => {
  Object.assign(globalThis, { React: { createElement } });

  const html = renderToStaticMarkup(
    createElement(StatusPanel, {
      connectionStatus: "ready",
      status: buildStatus({
        models: [
          {
            modelDisplayName: "Sonnet",
            modelId: "sonnet",
            providerId: "claudeCodeCli" as const,
            providerName: "Claude",
          },
        ],
      }),
    })
  );

  assert.equal(html.includes("Sonnet"), true);
  // Only the model-name button should be present, not a second reasoning button.
  const buttonOpenings = html.split("<button").length - 1;
  assert.equal(buttonOpenings, 1);
});

test("StatusPanel returns nothing when Core is not ready", () => {
  Object.assign(globalThis, { React: { createElement } });

  const html = renderToStaticMarkup(
    createElement(StatusPanel, {
      connectionStatus: "connecting",
      status: buildStatus(),
    })
  );

  assert.equal(html, "");
});

test("StatusPanel returns nothing when models[0] is missing", () => {
  Object.assign(globalThis, { React: { createElement } });

  const html = renderToStaticMarkup(
    createElement(StatusPanel, {
      connectionStatus: "ready",
      status: buildStatus({ models: [] }),
    })
  );

  assert.equal(html, "");
});

test("StatusPanel renders an optional debug strip when provided", () => {
  Object.assign(globalThis, { React: { createElement } });

  const html = renderToStaticMarkup(
    createElement(StatusPanel, {
      connectionStatus: "ready",
      status: buildStatus(),
      tokenDebugSummary: "#1 chain=abc",
    })
  );

  assert.equal(html.includes("session-status__debug-strip"), true);
  assert.equal(html.includes("#1 chain=abc"), true);
});
