import { createHash } from "node:crypto";
import type { CodexResponsePolicy } from "../response-policy/response-policy-types";
import type { CodexTurnOptions } from "../types";
import { AnswerJsonStreamExtractor } from "./answer-json-stream-extractor";

const STRUCTURED_OUTPUT_PROMPT = [
  "You must respond with a JSON object that matches the provided schema.",
  "Populate the field:",
  "- answer: the user-facing answer.",
  "Return only JSON, no extra text.",
  "",
  "User request:",
].join("\n");

type StructuredOutputMode = "default" | "idea_collector" | "passthrough";
type StructuredOutputTurnConfig = {
  readonly mode: StructuredOutputMode;
  readonly fieldKey: "answer" | "suggested_response";
  readonly applyPrompt: boolean;
  readonly promptTemplate?: string;
  readonly defaultOutputSchema?: unknown;
  readonly suppressCommentary: boolean;
  readonly allowedArtifactSlots?: ReadonlySet<string>;
};
type StructuredOutputArtifact = Record<string, unknown>;
type StructuredOutputArtifactUpsert = {
  readonly slot: string;
  readonly markdown: string;
};
type ParsedOutput = {
  readonly assistantText?: string;
  readonly nextAction?: string;
  readonly artifact?: StructuredOutputArtifact;
  readonly artifacts?: readonly StructuredOutputArtifactUpsert[];
};
type StructuredOutputParseOptions = {
  readonly allowedArtifactSlots?: ReadonlySet<string>;
};

const QUESTION_SLOT_PATTERN = /^question\d*$/i;
type AnswerStreamState = {
  extractor?: AnswerJsonStreamExtractor;
  itemId: string | null;
  assistantText: string;
  sourceText: string;
  mode: StructuredOutputMode;
};
export type StructuredOutputResult = {
  readonly streamDelta?: string;
  readonly assistantText?: string;
  readonly nextAction?: string;
  readonly artifact?: StructuredOutputArtifact;
  readonly artifacts?: readonly StructuredOutputArtifactUpsert[];
  readonly outputHash?: string;
};
const DEFAULT_TURN_CONFIG: StructuredOutputTurnConfig = {
  mode: "default",
  fieldKey: "answer",
  applyPrompt: true,
  promptTemplate: STRUCTURED_OUTPUT_PROMPT,
  suppressCommentary: true,
};
const PASSTHROUGH_TURN_CONFIG: StructuredOutputTurnConfig = {
  mode: "passthrough",
  fieldKey: "answer",
  applyPrompt: false,
  suppressCommentary: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const resolveTurnConfig = (
  turnOptions: CodexTurnOptions,
  responsePolicy: CodexResponsePolicy
): StructuredOutputTurnConfig => {
  const schema = turnOptions.outputSchema;
  const allowedArtifactSlots = resolveAllowedArtifactSlots(schema);
  if (
    isRecord(schema) &&
    ((isRecord(schema.properties) &&
      // biome-ignore lint/suspicious/noPrototypeBuiltins: TS lib lacks Object.hasOwn.
      Object.prototype.hasOwnProperty.call(
        schema.properties,
        "suggested_response"
      )) ||
      (Array.isArray(schema.required) &&
        schema.required.includes("suggested_response")))
  ) {
    return {
      mode: "idea_collector",
      fieldKey: "suggested_response",
      applyPrompt: false,
      suppressCommentary: true,
      allowedArtifactSlots,
    };
  }
  if (turnOptions.outputSchema) {
    return DEFAULT_TURN_CONFIG;
  }
  if (responsePolicy.mode !== "strict") {
    return PASSTHROUGH_TURN_CONFIG;
  }
  return {
    ...DEFAULT_TURN_CONFIG,
    promptTemplate: responsePolicy.strictOutput.instructionText,
    defaultOutputSchema: responsePolicy.strictOutput.schemaObject,
  };
};

const resolveAllowedArtifactSlots = (
  schema: unknown
): ReadonlySet<string> | undefined => {
  if (!isRecord(schema)) {
    return;
  }
  const properties = isRecord(schema.properties) ? schema.properties : null;
  if (!properties) {
    return;
  }
  const artifacts = isRecord(properties.artifacts)
    ? properties.artifacts
    : null;
  if (!artifacts) {
    return;
  }
  const items = isRecord(artifacts.items) ? artifacts.items : null;
  if (!items) {
    return;
  }
  const itemProperties = isRecord(items.properties) ? items.properties : null;
  if (!itemProperties) {
    return;
  }
  const slot = isRecord(itemProperties.slot) ? itemProperties.slot : null;
  if (!slot) {
    return;
  }
  const enumValues = Array.isArray(slot.enum)
    ? slot.enum.filter((value): value is string => typeof value === "string")
    : [];
  if (enumValues.length === 0) {
    return;
  }
  return new Set(enumValues);
};

export class StructuredOutputStreamController {
  private readonly streams = new Map<string, AnswerStreamState>();
  private readonly turnConfigs = new Map<string, StructuredOutputTurnConfig>();

  prepareTurn(
    sessionId: string,
    turnOptions: CodexTurnOptions,
    responsePolicy: CodexResponsePolicy
  ): StructuredOutputTurnConfig {
    const config = resolveTurnConfig(turnOptions, responsePolicy);
    this.turnConfigs.set(sessionId, config);
    return config;
  }

  applyPrompt(prompt: string, config: StructuredOutputTurnConfig): string {
    if (!config.applyPrompt) {
      return prompt;
    }
    return `${config.promptTemplate ?? STRUCTURED_OUTPUT_PROMPT}\n${prompt}`;
  }

  applyOutputSchema(
    turnOptions: CodexTurnOptions,
    config: StructuredOutputTurnConfig
  ): CodexTurnOptions {
    if (turnOptions.outputSchema) {
      return turnOptions;
    }
    if (!config.defaultOutputSchema) {
      return turnOptions;
    }
    return { ...turnOptions, outputSchema: config.defaultOutputSchema };
  }

  shouldSuppressCommentary(sessionId: string): boolean {
    return (this.turnConfigs.get(sessionId) ?? DEFAULT_TURN_CONFIG)
      .suppressCommentary;
  }

  startTurn(sessionId: string): void {
    const config = this.turnConfigs.get(sessionId) ?? DEFAULT_TURN_CONFIG;
    this.streams.set(sessionId, {
      extractor:
        config.mode === "passthrough"
          ? undefined
          : new AnswerJsonStreamExtractor(config.fieldKey),
      itemId: null,
      assistantText: "",
      sourceText: "",
      mode: config.mode,
    });
  }

  appendChunk(sessionId: string, itemId: string, text: string): string | null {
    const state = this.ensureState(sessionId, itemId);
    if (state.mode === "passthrough") {
      const delta = resolvePassthroughDelta(state.sourceText, text);
      state.sourceText = text;
      state.assistantText = text;
      return delta;
    }
    const extractor = state.extractor;
    if (!extractor) {
      return null;
    }
    const delta = extractor.append(text);
    if (delta) {
      state.assistantText += delta;
    }
    return delta ?? null;
  }

  complete(
    sessionId: string,
    itemId: string,
    text: string
  ): StructuredOutputResult {
    const state = this.ensureState(sessionId, itemId);
    if (state.mode === "passthrough") {
      return this.completePassthroughTurn(sessionId, state, text);
    }
    return this.completeStructuredTurn(sessionId, state, text);
  }

  clear(sessionId: string): void {
    this.streams.delete(sessionId);
    this.turnConfigs.delete(sessionId);
  }

  promoteSession(oldSessionId: string, newSessionId: string): void {
    if (oldSessionId === newSessionId) {
      return;
    }

    const config = this.turnConfigs.get(oldSessionId);
    if (config) {
      this.turnConfigs.set(newSessionId, config);
      this.turnConfigs.delete(oldSessionId);
    }

    const state = this.streams.get(oldSessionId);
    if (state) {
      this.streams.set(newSessionId, state);
      this.streams.delete(oldSessionId);
    }
  }

  private ensureState(sessionId: string, itemId: string): AnswerStreamState {
    const existing = this.streams.get(sessionId);
    const config = this.turnConfigs.get(sessionId) ?? DEFAULT_TURN_CONFIG;
    if (!existing || (existing.itemId && existing.itemId !== itemId)) {
      const fresh = {
        extractor:
          config.mode === "passthrough"
            ? undefined
            : new AnswerJsonStreamExtractor(config.fieldKey),
        itemId,
        assistantText: "",
        sourceText: "",
        mode: config.mode,
      };
      this.streams.set(sessionId, fresh);
      return fresh;
    }
    if (!existing.itemId) {
      existing.itemId = itemId;
    }
    return existing;
  }

  private completePassthroughTurn(
    sessionId: string,
    state: AnswerStreamState,
    text: string
  ): StructuredOutputResult {
    const streamDelta = resolvePassthroughDelta(state.sourceText, text);
    const assistantText = text.trim().length ? text : state.assistantText;
    this.streams.delete(sessionId);
    return {
      streamDelta: streamDelta ?? undefined,
      assistantText: assistantText.trim().length ? assistantText : undefined,
      outputHash: buildOutputHash(text),
    };
  }

  private completeStructuredTurn(
    sessionId: string,
    state: AnswerStreamState,
    text: string
  ): StructuredOutputResult {
    const streamDelta = state.extractor?.append(text) ?? null;
    if (streamDelta) {
      state.assistantText += streamDelta;
    }
    const config = this.turnConfigs.get(sessionId) ?? DEFAULT_TURN_CONFIG;
    const parsed = parseStructuredOutput(text, state.mode, {
      allowedArtifactSlots: config.allowedArtifactSlots,
    });
    let assistantText =
      state.assistantText.trim().length > 0
        ? state.assistantText
        : parsed.assistantText;
    if (state.mode === "idea_collector" && parsed.assistantText?.trim()) {
      assistantText = parsed.assistantText;
    }
    this.streams.delete(sessionId);
    return {
      streamDelta: streamDelta ?? undefined,
      assistantText: assistantText ?? undefined,
      nextAction: parsed.nextAction ?? undefined,
      artifact: parsed.artifact ?? undefined,
      artifacts: parsed.artifacts ?? undefined,
      outputHash: buildOutputHash(text),
    };
  }
}
const parseStructuredOutput = (
  text: string,
  mode: StructuredOutputMode,
  options: StructuredOutputParseOptions
): ParsedOutput => {
  if (!text) {
    return {};
  }
  if (mode === "passthrough") {
    return { assistantText: text.trim().length ? text : undefined };
  }
  try {
    const parsed = JSON.parse(text) as Record<string, unknown> | null;
    if (!isRecord(parsed)) {
      return {};
    }
    if (hasIdeaCollectorSignature(parsed)) {
      return parseIdeaCollectorOutput(parsed, options);
    }
    return mode === "idea_collector"
      ? parseIdeaCollectorOutput(parsed, options)
      : parseDefaultOutput(parsed);
  } catch {
    return {};
  }
};

const resolvePassthroughDelta = (
  previousText: string,
  nextText: string
): string | null => {
  if (!nextText) {
    return null;
  }
  if (!previousText) {
    return nextText;
  }
  if (nextText.startsWith(previousText)) {
    const delta = nextText.slice(previousText.length);
    return delta.length > 0 ? delta : null;
  }
  return nextText;
};

const buildOutputHash = (text: string): string | undefined => {
  const trimmedText = text.trim();
  return trimmedText.length
    ? createHash("sha256").update(trimmedText).digest("hex")
    : undefined;
};
const parseDefaultOutput = (parsed: Record<string, unknown>): ParsedOutput => {
  const assistantText =
    typeof parsed.answer === "string" ? parsed.answer : undefined;
  return {
    assistantText: assistantText?.trim().length ? assistantText : undefined,
  };
};
const parseIdeaCollectorOutput = (
  parsed: Record<string, unknown>,
  options: StructuredOutputParseOptions
): ParsedOutput => {
  let assistantText: string | undefined;
  if (typeof parsed.suggested_response === "string") {
    assistantText = parsed.suggested_response;
  } else if (typeof parsed.suggestedResponse === "string") {
    assistantText = parsed.suggestedResponse;
  }
  const questions = Array.isArray(parsed.questions)
    ? parsed.questions.filter(
        (question): question is string =>
          typeof question === "string" && question.trim().length > 0
      )
    : [];
  let nextAction: string | undefined;
  if (typeof parsed.next_action === "string") {
    nextAction = parsed.next_action;
  } else if (typeof parsed.nextAction === "string") {
    nextAction = parsed.nextAction;
  }
  const { artifacts, questionArtifacts } = parseIdeaCollectorArtifacts(
    parsed,
    options.allowedArtifactSlots
  );
  const allQuestions = [...questions, ...questionArtifacts];
  if (assistantText?.trim().length && allQuestions.length > 0) {
    assistantText = `${assistantText}\n\nВопросы:\n${allQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n")}`;
  }
  const artifact = parseIdeaCollectorArtifact(parsed.artifact, nextAction);
  return {
    assistantText: assistantText?.trim().length ? assistantText : undefined,
    nextAction,
    artifact,
    artifacts,
  };
};

const parseIdeaCollectorArtifacts = (
  parsed: Record<string, unknown>,
  allowedArtifactSlots: ReadonlySet<string> | undefined
): {
  readonly artifacts?: StructuredOutputArtifactUpsert[];
  readonly questionArtifacts: string[];
} => {
  if (!Array.isArray(parsed.artifacts)) {
    return { questionArtifacts: [] };
  }

  const artifacts: StructuredOutputArtifactUpsert[] = [];
  const questionArtifacts: string[] = [];
  for (const entry of parsed.artifacts) {
    const normalized = normalizeArtifactEntry(entry);
    if (!normalized) {
      continue;
    }

    if (QUESTION_SLOT_PATTERN.test(normalized.slot)) {
      questionArtifacts.push(normalized.markdown);
      continue;
    }

    if (allowedArtifactSlots && !allowedArtifactSlots.has(normalized.slot)) {
      continue;
    }

    artifacts.push(normalized);
  }

  return {
    artifacts: artifacts.length > 0 ? artifacts : undefined,
    questionArtifacts,
  };
};

const normalizeArtifactEntry = (
  entry: unknown
): StructuredOutputArtifactUpsert | null => {
  if (!isRecord(entry)) {
    return null;
  }
  const slot = entry.slot;
  const markdown = entry.markdown;
  if (typeof slot !== "string" || typeof markdown !== "string") {
    return null;
  }
  const trimmedSlot = slot.trim();
  const trimmedMarkdown = markdown.trim();
  if (!(trimmedSlot && trimmedMarkdown)) {
    return null;
  }
  return { slot: trimmedSlot, markdown: trimmedMarkdown };
};

const parseIdeaCollectorArtifact = (
  value: unknown,
  nextAction: string | undefined
): StructuredOutputArtifact | undefined => {
  if (!isRecord(value)) {
    return;
  }
  if (!(nextAction === "finalize" || nextAction === "revise_artifacts")) {
    return;
  }
  let ideaMarkdown: string | undefined;
  if (typeof value.idea_markdown === "string") {
    ideaMarkdown = value.idea_markdown;
  } else if (typeof value.ideaMarkdown === "string") {
    ideaMarkdown = value.ideaMarkdown;
  }

  let virtualSimulationMarkdown: string | undefined;
  if (typeof value.virtual_simulation_markdown === "string") {
    virtualSimulationMarkdown = value.virtual_simulation_markdown;
  } else if (typeof value.virtualSimulationMarkdown === "string") {
    virtualSimulationMarkdown = value.virtualSimulationMarkdown;
  }

  if (!(ideaMarkdown?.trim() || virtualSimulationMarkdown?.trim())) {
    return;
  }
  return value;
};
const hasIdeaCollectorSignature = (parsed: Record<string, unknown>): boolean =>
  typeof parsed.suggested_response === "string" ||
  typeof parsed.suggestedResponse === "string";
