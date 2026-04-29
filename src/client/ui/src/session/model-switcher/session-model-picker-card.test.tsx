import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  SessionModelPickerCard,
  SessionReasoningPickerCard,
} from "./session-model-picker-card";

test("SessionModelPickerCard renders selectable model rows", () => {
  Object.assign(globalThis, { React: { createElement } });

  const html = renderToStaticMarkup(
    createElement(SessionModelPickerCard, {
      onSelectModel: () => undefined,
      options: [
        {
          id: "gpt-5.3-codex",
          label: "GPT-5.3-Codex",
          description: "Most advanced agentic coding model",
          selected: true,
        },
        {
          id: "gpt-5.4-mini",
          label: "GPT-5.4 Mini",
          description: "Smaller GPT-5.4 variant",
          selected: false,
        },
      ],
    })
  );

  assert.equal(html.includes("session-model-switch-card"), true);
  assert.equal(html.includes("GPT-5.3-Codex"), true);
  assert.equal(html.includes('aria-pressed="true"'), true);
});

test("SessionReasoningPickerCard renders compact reasoning rows", () => {
  Object.assign(globalThis, { React: { createElement } });

  const html = renderToStaticMarkup(
    createElement(SessionReasoningPickerCard, {
      onSelectReasoning: () => undefined,
      options: [
        {
          id: "medium",
          label: "medium",
          description: "Balanced reasoning depth",
          selected: true,
        },
      ],
    })
  );

  assert.equal(html.includes("session-model-switch-card--compact"), true);
  assert.equal(html.includes("medium"), true);
});
