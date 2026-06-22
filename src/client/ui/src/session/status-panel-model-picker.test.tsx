import assert from "node:assert/strict";
import test from "node:test";
import {
  createElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import type { ProviderStackId } from "../../../../types/provider";
import {
  StatusPanelModelPicker,
  type StatusPanelPickerMode,
} from "./status-panel-model-picker";

interface ButtonProps {
  readonly children?: ReactNode;
  readonly "data-active"?: string;
  readonly "data-model-id"?: string;
  readonly "data-provider"?: string;
  readonly "data-reasoning"?: string;
  readonly onClick?: () => void;
}

Object.assign(globalThis, { React: { createElement } });

const collectButtons = (node: ReactNode): ReactElement<ButtonProps>[] => {
  if (Array.isArray(node)) {
    return node.flatMap((child) => collectButtons(child));
  }
  if (!isValidElement<ButtonProps>(node)) {
    return [];
  }
  const children = collectButtons(node.props.children);
  return node.type === "button" ? [node, ...children] : children;
};

const renderPickerButtons = (options: {
  readonly currentModelId?: string;
  readonly currentReasoning?: string;
  readonly mode: StatusPanelPickerMode;
  readonly onClose?: () => void;
  readonly onSelectModel?: (modelId: string) => void;
  readonly onSelectReasoning?: (reasoning: string) => void;
  readonly providerId?: ProviderStackId;
}): ReactElement<ButtonProps>[] =>
  collectButtons(
    StatusPanelModelPicker({
      anchorLeft: 16,
      currentModelId: options.currentModelId ?? "gpt-5.3-codex reasoning:xhigh",
      currentReasoning: options.currentReasoning ?? "xhigh",
      mode: options.mode,
      onClose: options.onClose ?? (() => undefined),
      onSelectModel: options.onSelectModel,
      onSelectReasoning: options.onSelectReasoning,
      providerId: options.providerId ?? "codexCli",
    })
  );

test("model picker click reports only modelId without reasoning argument", () => {
  let observed: { readonly modelId: string; readonly extras: number } | null =
    null;
  let closeCount = 0;
  const buttons = renderPickerButtons({
    mode: "model",
    onClose: () => {
      closeCount += 1;
    },
    onSelectModel: (modelId, ...extras) => {
      observed = { modelId, extras: extras.length };
    },
  });
  const sparkButton = buttons.find(
    (button) => button.props["data-model-id"] === "gpt-5.3-codex-spark"
  );

  sparkButton?.props.onClick?.();

  assert.deepEqual(observed, {
    modelId: "gpt-5.3-codex-spark",
    extras: 0,
  });
  assert.equal(closeCount, 1);
});

test("reasoning picker click reports only reasoning value", () => {
  let selected: string | null = null;
  const buttons = renderPickerButtons({
    mode: "reasoning",
    onSelectReasoning: (reasoning) => {
      selected = reasoning;
    },
  });
  const highButton = buttons.find(
    (button) => button.props["data-reasoning"] === "high"
  );

  highButton?.props.onClick?.();

  assert.equal(selected, "high");
});

test("model picker marks the active model with data-active and provider tint", () => {
  const buttons = renderPickerButtons({
    currentModelId: "sonnet reasoning:high",
    currentReasoning: "high",
    mode: "model",
    providerId: "claudeCodeCli",
  });
  const sonnetButton = buttons.find(
    (button) => button.props["data-model-id"] === "sonnet"
  );
  const opusButton = buttons.find(
    (button) => button.props["data-model-id"] === "opus"
  );

  assert.equal(sonnetButton?.props["data-active"], "true");
  assert.equal(sonnetButton?.props["data-provider"], "claudeCodeCli");
  assert.equal(opusButton?.props["data-active"], undefined);
});

test("Kimi model picker exposes High Speed and marks it active", () => {
  const buttons = renderPickerButtons({
    currentModelId: "kimi-k2.7-code-highspeed",
    mode: "model",
    providerId: "kimiCode",
  });
  const defaultButton = buttons.find(
    (button) => button.props["data-model-id"] === "kimi-k2.7-code"
  );
  const highspeedButton = buttons.find(
    (button) => button.props["data-model-id"] === "kimi-k2.7-code-highspeed"
  );

  assert.equal(defaultButton?.props["data-provider"], "kimiCode");
  assert.equal(defaultButton?.props["data-active"], undefined);
  assert.equal(highspeedButton?.props["data-provider"], "kimiCode");
  assert.equal(highspeedButton?.props["data-active"], "true");
});

test("reasoning picker marks the active reasoning option only", () => {
  const buttons = renderPickerButtons({
    currentModelId: "gpt-5.3-codex reasoning:high",
    currentReasoning: "high",
    mode: "reasoning",
  });
  const highButton = buttons.find(
    (button) => button.props["data-reasoning"] === "high"
  );
  const lowButton = buttons.find(
    (button) => button.props["data-reasoning"] === "low"
  );

  assert.equal(highButton?.props["data-active"], "true");
  assert.equal(highButton?.props["data-provider"], "codexCli");
  assert.equal(lowButton?.props["data-active"], undefined);
});
