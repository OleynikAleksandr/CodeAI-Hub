import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type { GeminiCliModules } from "../runtime/cli-types";
import type { ActiveSession } from "../session/types";
import { GeminiMessageProcessor } from "./message-processor";

const createModules = (): GeminiCliModules =>
  ({
    turn: {
      GeminiEventType: {
        Content: "content",
        Citation: "citation",
        ToolCallRequest: "tool_call_request",
        ToolCallResponse: "tool_call_response",
        ToolCallConfirmation: "tool_call_confirmation",
        ChatCompressed: "chat_compressed",
        ContextWindowWillOverflow: "context_window_will_overflow",
        Retry: "retry",
        Thought: "thought",
        MaxSessionTurns: "max_session_turns",
        LoopDetected: "loop_detected",
        InvalidStream: "invalid_stream",
        Finished: "finished",
        Error: "error",
        UserCancelled: "user_cancelled",
      },
    },
  }) as GeminiCliModules;

const createSession = (): ActiveSession =>
  ({
    sessionId: "gemini-test-session",
    createdAt: Date.now(),
    eventEmitter: new EventEmitter(),
    config: {},
    client: {},
    workspacePath: "/tmp/gemini-test-workspace",
    contextWindowTokenLimit: 300_000,
    runtimeTurnConfig: {},
    status: "idle",
    abortController: null,
    logger: {
      logRawEvent: () => {
        // noop
      },
      logEvent: () => {
        // noop
      },
    },
  }) as unknown as ActiveSession;

interface ThoughtLike {
  readonly description: string;
  readonly subject: string;
}

type ThoughtTranslatorMock = ConstructorParameters<
  typeof GeminiMessageProcessor
>[0]["thoughtTranslator"];

const createTranslator = (
  translations: Map<string, string>,
  calls: ThoughtLike[]
): ThoughtTranslatorMock =>
  ({
    translateThought: (thought: ThoughtLike, _targetLanguage?: string) => {
      calls.push(thought);
      return Promise.resolve(translations.get(thought.description) ?? null);
    },
  }) as unknown as ThoughtTranslatorMock;

interface CapturedMessage {
  readonly content: string;
  readonly role: string;
  readonly tag?: string;
}

const captureMessages = (session: ActiveSession): CapturedMessage[] => {
  const messages: CapturedMessage[] = [];
  session.eventEmitter.on("message", (payload) => {
    messages.push({
      content: (payload as { content: string }).content,
      role: (payload as { role: string }).role,
      tag: (payload as { tag?: string }).tag,
    });
  });
  return messages;
};

test("Gemini [Thought: true] marker splits into thinking + assistant bubbles", async () => {
  const translations = new Map<string, string>([
    [
      "Finalizing step: updated the doc.",
      "Финализация шага: документ обновлён.",
    ],
  ]);
  const translatorCalls: ThoughtLike[] = [];
  const processor = new GeminiMessageProcessor({
    modules: createModules(),
    thoughtTranslator: createTranslator(translations, translatorCalls),
  });
  const session = createSession();
  session.runtimeTurnConfig.messagesForTheUserLanguage = "ru";
  const accumulator = processor.createAccumulator("prompt-inline-a");
  const messages = captureMessages(session);

  processor.handleEvent(
    session,
    {
      type: "content",
      value:
        "Finalizing step: updated the doc.[Thought: true]Я обновил документ.",
    } as never,
    accumulator
  );
  processor.handleEvent(
    session,
    { type: "finished", value: {} } as never,
    accumulator
  );
  await processor.drain(accumulator);

  assert.equal(translatorCalls.length, 1);
  assert.equal(
    translatorCalls[0]?.description,
    "Finalizing step: updated the doc."
  );
  assert.equal(messages.length, 2);
  const thinking = messages.find((m) => m.tag === "thinking");
  const finalAssistant = messages.find((m) => m.tag === undefined);
  assert.equal(thinking?.content, "Финализация шага: документ обновлён.");
  assert.equal(thinking?.role, "assistant");
  assert.equal(finalAssistant?.content, "Я обновил документ.");
  assert.equal(finalAssistant?.role, "assistant");
});

test("Gemini content without [Thought:] marker emits one assistant bubble", async () => {
  const processor = new GeminiMessageProcessor({
    modules: createModules(),
    thoughtTranslator: createTranslator(new Map(), []),
  });
  const session = createSession();
  session.runtimeTurnConfig.messagesForTheUserLanguage = "ru";
  const accumulator = processor.createAccumulator("prompt-inline-b");
  const messages = captureMessages(session);

  processor.handleEvent(
    session,
    { type: "content", value: "Полный ответ без маркера." } as never,
    accumulator
  );
  processor.handleEvent(
    session,
    { type: "finished", value: {} } as never,
    accumulator
  );
  await processor.drain(accumulator);

  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.content, "Полный ответ без маркера.");
  assert.equal(messages[0]?.tag, undefined);
});

test("Gemini [Thought:] marker with empty post-marker emits only thinking bubble", async () => {
  const translations = new Map<string, string>([
    ["Finalizing step: all done.", "Финализация шага: всё готово."],
  ]);
  const processor = new GeminiMessageProcessor({
    modules: createModules(),
    thoughtTranslator: createTranslator(translations, []),
  });
  const session = createSession();
  session.runtimeTurnConfig.messagesForTheUserLanguage = "ru";
  const accumulator = processor.createAccumulator("prompt-inline-c");
  const messages = captureMessages(session);

  processor.handleEvent(
    session,
    {
      type: "content",
      value: "Finalizing step: all done.[Thought: true]",
    } as never,
    accumulator
  );
  processor.handleEvent(
    session,
    { type: "finished", value: {} } as never,
    accumulator
  );
  await processor.drain(accumulator);

  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.tag, "thinking");
  assert.equal(messages[0]?.content, "Финализация шага: всё готово.");
});

const TOOL_CALL_EVENT = {
  type: "tool_call_request",
  value: {
    callId: "call-1",
    name: "read_file",
    args: { path: "questionnaire.md" },
  },
} as const;

test("Gemini pre-tool English text with ru target routes through thinking overlay", async () => {
  const preToolText =
    "I will read the questionnaire and the template to understand the product idea.";
  const translations = new Map<string, string>([
    [preToolText, "Я прочитаю анкету и шаблон, чтобы понять идею продукта."],
  ]);
  const translatorCalls: ThoughtLike[] = [];
  const processor = new GeminiMessageProcessor({
    modules: createModules(),
    thoughtTranslator: createTranslator(translations, translatorCalls),
  });
  const session = createSession();
  session.runtimeTurnConfig.messagesForTheUserLanguage = "ru";
  const accumulator = processor.createAccumulator("prompt-pre-tool-a");
  const messages = captureMessages(session);

  processor.handleEvent(
    session,
    { type: "content", value: preToolText } as never,
    accumulator
  );
  processor.handleEvent(session, TOOL_CALL_EVENT as never, accumulator);
  processor.handleEvent(
    session,
    { type: "finished", value: {} } as never,
    accumulator
  );
  await processor.drain(accumulator);

  assert.equal(translatorCalls.length, 1);
  assert.equal(translatorCalls[0]?.description, preToolText);
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.tag, "thinking");
  assert.equal(
    messages[0]?.content,
    "Я прочитаю анкету и шаблон, чтобы понять идею продукта."
  );
});

test("Gemini pre-tool Russian text with ru target stays as assistant bubble", async () => {
  const translatorCalls: ThoughtLike[] = [];
  const processor = new GeminiMessageProcessor({
    modules: createModules(),
    thoughtTranslator: createTranslator(new Map(), translatorCalls),
  });
  const session = createSession();
  session.runtimeTurnConfig.messagesForTheUserLanguage = "ru";
  const accumulator = processor.createAccumulator("prompt-pre-tool-b");
  const messages = captureMessages(session);

  processor.handleEvent(
    session,
    { type: "content", value: "Прочитаю анкету и шаблон." } as never,
    accumulator
  );
  processor.handleEvent(session, TOOL_CALL_EVENT as never, accumulator);
  processor.handleEvent(
    session,
    { type: "finished", value: {} } as never,
    accumulator
  );
  await processor.drain(accumulator);

  assert.equal(translatorCalls.length, 0);
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.tag, undefined);
  assert.equal(messages[0]?.role, "assistant");
  assert.equal(messages[0]?.content, "Прочитаю анкету и шаблон.");
});

test("Gemini pre-tool English text with en target keeps assistant bubble (heuristic off)", async () => {
  const translatorCalls: ThoughtLike[] = [];
  const processor = new GeminiMessageProcessor({
    modules: createModules(),
    thoughtTranslator: createTranslator(new Map(), translatorCalls),
  });
  const session = createSession();
  session.runtimeTurnConfig.messagesForTheUserLanguage = "en";
  const accumulator = processor.createAccumulator("prompt-pre-tool-c");
  const messages = captureMessages(session);

  processor.handleEvent(
    session,
    {
      type: "content",
      value: "I will read the questionnaire.",
    } as never,
    accumulator
  );
  processor.handleEvent(session, TOOL_CALL_EVENT as never, accumulator);
  processor.handleEvent(
    session,
    { type: "finished", value: {} } as never,
    accumulator
  );
  await processor.drain(accumulator);

  assert.equal(translatorCalls.length, 0);
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.tag, undefined);
  assert.equal(messages[0]?.role, "assistant");
  assert.equal(messages[0]?.content, "I will read the questionnaire.");
});
