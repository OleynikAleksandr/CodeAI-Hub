import type { CodexResponsePolicy } from "../response-policy/response-policy-types";
import type { CodexTurnOptions } from "../types";

const STRUCTURED_OUTPUT_PROMPT = [
  "You must respond with a JSON object that matches the provided schema.",
  "Populate the field:",
  "- answer: the user-facing answer.",
  "Return only JSON, no extra text.",
  "",
  "User request:",
].join("\n");

const QUESTION_SLOT_PATTERN = /^question\d*$/i;

export type StructuredOutputMode = "default" | "idea_collector" | "passthrough";
export type StructuredOutputArtifact = Record<string, unknown>;

export interface StructuredOutputArtifactUpsert {
  readonly markdown: string;
  readonly slot: string;
}

interface ParsedOutput {
  readonly artifact?: StructuredOutputArtifact;
  readonly artifacts?: readonly StructuredOutputArtifactUpsert[];
  readonly assistantText?: string;
  readonly nextAction?: string;
}

interface StructuredOutputParseOptions {
  readonly allowedArtifactSlots?: ReadonlySet<string>;
}

export interface StructuredOutputResult {
  readonly artifact?: StructuredOutputArtifact;
  readonly artifacts?: readonly StructuredOutputArtifactUpsert[];
  readonly assistantText?: string;
  readonly nextAction?: string;
  readonly outputHash?: string;
  readonly streamDelta?: string;
}

export interface StructuredOutputTurnConfig {
  readonly allowedArtifactSlots?: ReadonlySet<string>;
  readonly applyPrompt: boolean;
  readonly defaultOutputSchema?: unknown;
  readonly fieldKey: "answer" | "suggested_response";
  readonly mode: StructuredOutputMode;
  readonly promptTemplate?: string;
  readonly suppressCommentary: boolean;
}

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

export const resolveTurnConfig = (
  turnOptions: CodexTurnOptions,
  responsePolicy: CodexResponsePolicy
): StructuredOutputTurnConfig => {
  const schema = turnOptions.outputSchema;
  const allowedArtifactSlots = resolveAllowedArtifactSlots(schema);
  if (
    isRecord(schema) &&
    ((isRecord(schema.properties) &&
      // biome-ignore lint/suspicious/noPrototypeBuiltins: TS lib target lacks Object.hasOwn.
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

export const applyStructuredOutputPrompt = (
  prompt: string,
  config: StructuredOutputTurnConfig
): string =>
  config.applyPrompt
    ? `${config.promptTemplate ?? STRUCTURED_OUTPUT_PROMPT}\n${prompt}`
    : prompt;

export const applyStructuredOutputSchema = (
  turnOptions: CodexTurnOptions,
  config: StructuredOutputTurnConfig
): CodexTurnOptions =>
  turnOptions.outputSchema || !config.defaultOutputSchema
    ? turnOptions
    : { ...turnOptions, outputSchema: config.defaultOutputSchema };

export const parseStructuredOutput = (
  text: string,
  mode: StructuredOutputMode,
  options: StructuredOutputParseOptions
): ParsedOutput => {
  if (!text) {
    return {};
  }
  if (mode === "passthrough") {
    return { assistantText: text.trim().length > 0 ? text : undefined };
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

export const getDefaultStructuredOutputTurnConfig =
  (): StructuredOutputTurnConfig => DEFAULT_TURN_CONFIG;

const resolveAllowedArtifactSlots = (
  schema: unknown
): ReadonlySet<string> | undefined => {
  if (!isRecord(schema)) {
    return;
  }
  const properties = isRecord(schema.properties) ? schema.properties : null;
  const artifacts = isRecord(properties?.artifacts)
    ? properties.artifacts
    : null;
  const items = isRecord(artifacts?.items) ? artifacts.items : null;
  const itemProperties = isRecord(items?.properties) ? items.properties : null;
  const slot = isRecord(itemProperties?.slot) ? itemProperties.slot : null;
  const enumValues = Array.isArray(slot?.enum)
    ? slot.enum.filter((value): value is string => typeof value === "string")
    : [];
  return enumValues.length > 0 ? new Set(enumValues) : undefined;
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

  return {
    assistantText: assistantText?.trim().length ? assistantText : undefined,
    nextAction,
    artifact: parseIdeaCollectorArtifact(parsed.artifact, nextAction),
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
  const trimmedSlot = typeof entry.slot === "string" ? entry.slot.trim() : "";
  const trimmedMarkdown =
    typeof entry.markdown === "string" ? entry.markdown.trim() : "";
  return trimmedSlot && trimmedMarkdown
    ? { slot: trimmedSlot, markdown: trimmedMarkdown }
    : null;
};

const parseIdeaCollectorArtifact = (
  value: unknown,
  nextAction: string | undefined
): StructuredOutputArtifact | undefined =>
  isRecord(value) &&
  (nextAction === "finalize" || nextAction === "revise_artifacts") &&
  ((typeof value.idea_markdown === "string" &&
    value.idea_markdown.trim().length > 0) ||
    (typeof value.ideaMarkdown === "string" &&
      value.ideaMarkdown.trim().length > 0) ||
    (typeof value.virtual_simulation_markdown === "string" &&
      value.virtual_simulation_markdown.trim().length > 0) ||
    (typeof value.virtualSimulationMarkdown === "string" &&
      value.virtualSimulationMarkdown.trim().length > 0))
    ? value
    : undefined;

const hasIdeaCollectorSignature = (parsed: Record<string, unknown>): boolean =>
  typeof parsed.suggested_response === "string" ||
  typeof parsed.suggestedResponse === "string";
