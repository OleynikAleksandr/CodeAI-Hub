import type { CodexTurnOptions } from "../types";
import { AnswerJsonStreamExtractor } from "./answer-json-stream-extractor";

const CODEX_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: {
      type: "string",
      description: "Final answer for the user. Markdown allowed.",
    },
  },
  required: ["answer"],
} as const;

const STRUCTURED_OUTPUT_PROMPT = [
  "You must respond with a JSON object that matches the provided schema.",
  "Populate the field:",
  "- answer: the user-facing answer.",
  "Return only JSON, no extra text.",
  "",
  "User request:",
].join("\n");

type StructuredOutputMode = "default" | "idea_collector";
type StructuredOutputTurnConfig = {
  readonly mode: StructuredOutputMode;
  readonly fieldKey: "answer" | "suggested_response";
  readonly applyPrompt: boolean;
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
type AnswerStreamState = {
  extractor: AnswerJsonStreamExtractor;
  itemId: string | null;
  assistantText: string;
  mode: StructuredOutputMode;
};
export type StructuredOutputResult = {
  readonly streamDelta?: string;
  readonly assistantText?: string;
  readonly nextAction?: string;
  readonly artifact?: StructuredOutputArtifact;
  readonly artifacts?: readonly StructuredOutputArtifactUpsert[];
};
const DEFAULT_TURN_CONFIG: StructuredOutputTurnConfig = {
  mode: "default",
  fieldKey: "answer",
  applyPrompt: true,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const resolveTurnConfig = (
  turnOptions: CodexTurnOptions
): StructuredOutputTurnConfig => {
  const schema = turnOptions.outputSchema;
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
    };
  }
  return DEFAULT_TURN_CONFIG;
};

export class StructuredOutputStreamController {
  private readonly streams = new Map<string, AnswerStreamState>();
  private readonly turnConfigs = new Map<string, StructuredOutputTurnConfig>();

  prepareTurn(
    sessionId: string,
    turnOptions: CodexTurnOptions
  ): StructuredOutputTurnConfig {
    const config = resolveTurnConfig(turnOptions);
    this.turnConfigs.set(sessionId, config);
    return config;
  }

  applyPrompt(prompt: string, config: StructuredOutputTurnConfig): string {
    if (!config.applyPrompt) {
      return prompt;
    }
    return `${STRUCTURED_OUTPUT_PROMPT}\n${prompt}`;
  }

  applyOutputSchema(turnOptions: CodexTurnOptions): CodexTurnOptions {
    if (turnOptions.outputSchema) {
      return turnOptions;
    }
    return { ...turnOptions, outputSchema: CODEX_OUTPUT_SCHEMA };
  }

  startTurn(sessionId: string): void {
    const config = this.turnConfigs.get(sessionId) ?? DEFAULT_TURN_CONFIG;
    this.streams.set(sessionId, {
      extractor: new AnswerJsonStreamExtractor(config.fieldKey),
      itemId: null,
      assistantText: "",
      mode: config.mode,
    });
  }

  appendChunk(sessionId: string, itemId: string, text: string): string | null {
    const state = this.ensureState(sessionId, itemId);
    const delta = state.extractor.append(text);
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
    const streamDelta = state.extractor.append(text) ?? null;
    if (streamDelta) {
      state.assistantText += streamDelta;
    }
    const parsed = parseStructuredOutput(text, state.mode);
    let assistantText =
      state.assistantText.trim().length > 0
        ? state.assistantText
        : parsed.assistantText;
    if (state.mode === "idea_collector" && parsed.assistantText?.trim()) {
      assistantText = parsed.assistantText;
    }
    this.streams.delete(sessionId);
    this.turnConfigs.delete(sessionId);
    return {
      streamDelta: streamDelta ?? undefined,
      assistantText: assistantText ?? undefined,
      nextAction: parsed.nextAction ?? undefined,
      artifact: parsed.artifact ?? undefined,
      artifacts: parsed.artifacts ?? undefined,
    };
  }

  clear(sessionId: string): void {
    this.streams.delete(sessionId);
    this.turnConfigs.delete(sessionId);
  }

  private ensureState(sessionId: string, itemId: string): AnswerStreamState {
    const existing = this.streams.get(sessionId);
    const config = this.turnConfigs.get(sessionId) ?? DEFAULT_TURN_CONFIG;
    if (!existing || (existing.itemId && existing.itemId !== itemId)) {
      const fresh = {
        extractor: new AnswerJsonStreamExtractor(config.fieldKey),
        itemId,
        assistantText: "",
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
}
const parseStructuredOutput = (
  text: string,
  mode: StructuredOutputMode
): ParsedOutput => {
  if (!text) {
    return {};
  }
  try {
    const parsed = JSON.parse(text) as Record<string, unknown> | null;
    if (!isRecord(parsed)) {
      return {};
    }
    if (hasIdeaCollectorSignature(parsed)) {
      return parseIdeaCollectorOutput(parsed);
    }
    return mode === "idea_collector"
      ? parseIdeaCollectorOutput(parsed)
      : parseDefaultOutput(parsed);
  } catch {
    return {};
  }
};
const parseDefaultOutput = (parsed: Record<string, unknown>): ParsedOutput => {
  const assistantText =
    typeof parsed.answer === "string" ? parsed.answer : undefined;
  return {
    assistantText: assistantText?.trim().length ? assistantText : undefined,
  };
};
const parseIdeaCollectorOutput = (
  parsed: Record<string, unknown>
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
  if (assistantText?.trim().length && questions.length > 0) {
    assistantText = `${assistantText}\n\nВопросы:\n${questions.map((question, index) => `${index + 1}. ${question}`).join("\n")}`;
  }
  let nextAction: string | undefined;
  if (typeof parsed.next_action === "string") {
    nextAction = parsed.next_action;
  } else if (typeof parsed.nextAction === "string") {
    nextAction = parsed.nextAction;
  }
  const artifacts = parseIdeaCollectorArtifacts(parsed);
  const artifact = parseIdeaCollectorArtifact(parsed.artifact, nextAction);
  return {
    assistantText: assistantText?.trim().length ? assistantText : undefined,
    nextAction,
    artifact,
    artifacts,
  };
};

const parseIdeaCollectorArtifacts = (
  parsed: Record<string, unknown>
): readonly StructuredOutputArtifactUpsert[] | undefined => {
  if (!Array.isArray(parsed.artifacts)) {
    return;
  }

  const artifacts: StructuredOutputArtifactUpsert[] = [];
  for (const entry of parsed.artifacts) {
    if (!isRecord(entry)) {
      return;
    }

    const slot = entry.slot;
    const markdown = entry.markdown;
    if (typeof slot !== "string" || typeof markdown !== "string") {
      return;
    }

    if (!(slot.trim() && markdown.trim())) {
      continue;
    }

    artifacts.push({ slot, markdown });
  }

  return artifacts;
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
