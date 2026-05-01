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
  readonly "data-model-id"?: string;
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
  readonly onSelectModel?: (modelId: string, reasoning: string) => void;
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

test("StatusPanelModelPicker selects a model with preserved supported reasoning", () => {
  let selected: {
    readonly modelId: string;
    readonly reasoning: string;
  } | null = null;
  let closeCount = 0;
  const buttons = renderPickerButtons({
    mode: "model",
    onClose: () => {
      closeCount += 1;
    },
    onSelectModel: (modelId, reasoning) => {
      selected = { modelId, reasoning };
    },
  });
  const sparkButton = buttons.find(
    (button) => button.props["data-model-id"] === "gpt-5.3-codex-spark"
  );

  sparkButton?.props.onClick?.();

  assert.deepEqual(selected, {
    modelId: "gpt-5.3-codex-spark",
    reasoning: "xhigh",
  });
  assert.equal(closeCount, 1);
});

test("StatusPanelModelPicker selects a reasoning effort", () => {
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

test("StatusPanelModelPicker selects a Claude model with preserved thinking effort", () => {
  let selected: {
    readonly modelId: string;
    readonly reasoning: string;
  } | null = null;
  const buttons = renderPickerButtons({
    currentModelId: "sonnet reasoning:xhigh",
    currentReasoning: "xhigh",
    mode: "model",
    providerId: "claudeCodeCli",
    onSelectModel: (modelId, reasoning) => {
      selected = { modelId, reasoning };
    },
  });
  const opusButton = buttons.find(
    (button) => button.props["data-model-id"] === "opus"
  );

  opusButton?.props.onClick?.();

  assert.deepEqual(selected, {
    modelId: "opus",
    reasoning: "xhigh",
  });
});

test("StatusPanelModelPicker selects Claude thinking off", () => {
  let selected: string | null = null;
  const buttons = renderPickerButtons({
    currentModelId: "haiku thinking:off",
    currentReasoning: "thinking off",
    mode: "reasoning",
    providerId: "claudeCodeCli",
    onSelectReasoning: (reasoning) => {
      selected = reasoning;
    },
  });
  const offButton = buttons.find(
    (button) => button.props["data-reasoning"] === "off"
  );

  offButton?.props.onClick?.();

  assert.equal(selected, "off");
});
