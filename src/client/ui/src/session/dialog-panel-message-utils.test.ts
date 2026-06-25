import assert from "node:assert/strict";
import test from "node:test";
import type { SessionMessage } from "../../../../types/session";
import {
  buildMessageClassNames,
  mergeLiveAssistantMessages,
  mergeThinkingMessages,
  resolveDisplayContent,
} from "./dialog-panel-message-utils";

const ASSISTANT_MESSAGE_CLASS_REGEX = /\bsession-dialog__message--assistant\b/u;
const ASSISTANT_THINKING_CLASS_REGEX =
  /\bsession-dialog__message--assistant-thinking\b/u;
const ASSISTANT_CLAUDE_CLASS_REGEX =
  /\bsession-dialog__message--assistant-claude\b/u;
const ASSISTANT_CODEX_CLASS_REGEX =
  /\bsession-dialog__message--assistant-codex\b/u;

const createMessage = (
  id: string,
  role: SessionMessage["role"],
  content: string,
  options?: {
    readonly tag?: SessionMessage["tag"];
    readonly localizedContent?: string;
    readonly translationState?: SessionMessage["translationState"];
  }
): SessionMessage => ({
  id,
  role,
  content,
  createdAt: Number(id),
  ...(options?.tag ? { tag: options.tag } : {}),
  ...(options?.localizedContent
    ? { localizedContent: options.localizedContent }
    : {}),
  ...(options?.translationState
    ? { translationState: options.translationState }
    : {}),
});

test("mergeLiveAssistantMessages concatenates consecutive live assistant bubbles into one card", () => {
  const source: readonly SessionMessage[] = [
    createMessage("1", "user", "Run the build."),
    createMessage("2", "assistant", "Starting the task. ", { tag: "live" }),
    createMessage("3", "assistant", "Reading the questionnaire. ", {
      tag: "live",
    }),
    createMessage("4", "assistant", "Drafting the description now.", {
      tag: "live",
    }),
  ];

  const merged = mergeLiveAssistantMessages(source);

  assert.equal(merged.length, 2);
  assert.equal(merged[0].role, "user");
  assert.equal(merged[1].role, "assistant");
  assert.equal(merged[1].tag, "live");
  assert.equal(merged[1].id, "2");
  assert.equal(
    merged[1].content,
    "Starting the task. Reading the questionnaire. Drafting the description now."
  );
});

test("mergeLiveAssistantMessages keeps non-live assistant bubbles after a user boundary", () => {
  const source: readonly SessionMessage[] = [
    createMessage("1", "assistant", "Live chunk one. ", { tag: "live" }),
    createMessage("2", "user", "Next turn."),
    createMessage("3", "assistant", "Final untagged reply."),
    createMessage("4", "assistant", "Live chunk two.", { tag: "live" }),
  ];

  const merged = mergeLiveAssistantMessages(source);

  assert.equal(merged.length, 4);
  assert.equal(merged[0].tag, "live");
  assert.equal(merged[0].content, "Live chunk one. ");
  assert.equal(merged[1].role, "user");
  assert.equal(merged[2].tag, undefined);
  assert.equal(merged[2].content, "Final untagged reply.");
  assert.equal(merged[3].tag, "live");
  assert.equal(merged[3].content, "Live chunk two.");
});

test("mergeLiveAssistantMessages skips standalone whitespace-only live bubbles", () => {
  const source: readonly SessionMessage[] = [
    createMessage("1", "assistant", "Planning complete.", {
      tag: "thinking",
    }),
    createMessage("2", "assistant", "\n\n", { tag: "live" }),
    createMessage("3", "assistant", "Live chunk two.", { tag: "live" }),
  ];

  const merged = mergeLiveAssistantMessages(source);

  assert.equal(merged.length, 2);
  assert.equal(merged[0].tag, "thinking");
  assert.equal(merged[1].tag, "live");
  assert.equal(merged[1].content, "Live chunk two.");
});

test("mergeLiveAssistantMessages joins thinking separated only by skipped live whitespace", () => {
  const source: readonly SessionMessage[] = [
    createMessage("1", "assistant", "Pre-tool reasoning.", {
      tag: "thinking",
    }),
    createMessage("2", "assistant", "\n\n", { tag: "live" }),
    createMessage("3", "assistant", "Post-tool reasoning.", {
      tag: "thinking",
    }),
  ];

  const merged = mergeLiveAssistantMessages(source);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].tag, "thinking");
  assert.equal(merged[0].content, "Pre-tool reasoning.\nPost-tool reasoning.");
});

test("mergeLiveAssistantMessages hides a final assistant bubble that visually duplicates live output", () => {
  const source: readonly SessionMessage[] = [
    createMessage(
      "1",
      "assistant",
      "Я подготовил черновик.\n\n**Что сделано:**\n- Создан документ.",
      { tag: "live" }
    ),
    createMessage(
      "2",
      "assistant",
      "Я подготовил черновик.\n\n**Что сделано:**\n\n- Создан документ."
    ),
  ];

  const merged = mergeLiveAssistantMessages(source);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].tag, "live");
  assert.equal(
    merged[0].content,
    "Я подготовил черновик.\n\n**Что сделано:**\n- Создан документ."
  );
});

test("mergeLiveAssistantMessages hides final snapshots after live output across thinking gaps", () => {
  const source: readonly SessionMessage[] = [
    createMessage("1", "assistant", "Создан черновик.\n", { tag: "live" }),
    createMessage("2", "assistant", "Post-tool reasoning.", {
      tag: "thinking",
    }),
    createMessage(
      "3",
      "assistant",
      "Создан черновик.\n\nДополнительное форматирование snapshot."
    ),
  ];

  const merged = mergeLiveAssistantMessages(source);

  assert.equal(merged.length, 2);
  assert.equal(merged[0].tag, "live");
  assert.equal(merged[1].tag, "thinking");
});

test("mergeLiveAssistantMessages breaks the group when a thinking message sits between live bubbles", () => {
  const source: readonly SessionMessage[] = [
    createMessage("1", "assistant", "Live chunk one. ", { tag: "live" }),
    createMessage("2", "assistant", "Some reasoning here.", {
      tag: "thinking",
    }),
    createMessage("3", "assistant", "Live chunk two.", { tag: "live" }),
  ];

  const merged = mergeLiveAssistantMessages(source);

  assert.equal(merged.length, 3);
  assert.equal(merged[0].content, "Live chunk one. ");
  assert.equal(merged[1].tag, "thinking");
  assert.equal(merged[2].content, "Live chunk two.");
});

test("buildMessageClassNames adds dedicated thinking styling hook for assistant-tagged reasoning bubbles", () => {
  const message = createMessage("1", "assistant", "Reasoning block.", {
    tag: "thinking",
  });
  const providerThemes = [
    {
      assistantThemeRegex: ASSISTANT_CLAUDE_CLASS_REGEX,
      providerTheme: "claude" as const,
    },
    {
      assistantThemeRegex: ASSISTANT_CODEX_CLASS_REGEX,
      providerTheme: "codex" as const,
    },
  ];

  for (const { assistantThemeRegex, providerTheme } of providerThemes) {
    const classes = buildMessageClassNames(message, providerTheme);

    assert.match(classes, ASSISTANT_MESSAGE_CLASS_REGEX);
    assert.match(classes, ASSISTANT_THINKING_CLASS_REGEX);
    assert.match(classes, assistantThemeRegex);
  }
});

test("mergeLiveAssistantMessages assembles localizedContent across consecutive live bubbles", () => {
  const source: readonly SessionMessage[] = [
    createMessage("1", "assistant", "Starting the task. ", {
      tag: "live",
      localizedContent: "Начинаю задачу. ",
    }),
    createMessage("2", "assistant", "Drafting now.", {
      tag: "live",
      localizedContent: "Составляю черновик сейчас.",
    }),
  ];

  const merged = mergeLiveAssistantMessages(source);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].content, "Starting the task. Drafting now.");
  assert.equal(
    merged[0].localizedContent,
    "Начинаю задачу. Составляю черновик сейчас."
  );
});

test("mergeLiveAssistantMessages falls back to raw content when localization is only partial", () => {
  const source: readonly SessionMessage[] = [
    createMessage("1", "assistant", "Starting. ", {
      tag: "live",
      localizedContent: "Начинаю. ",
    }),
    createMessage("2", "assistant", "Done.", { tag: "live" }),
  ];

  const merged = mergeLiveAssistantMessages(source);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].content, "Starting. Done.");
  assert.equal(merged[0].localizedContent, "Начинаю. Done.");
});

test("mergeThinkingMessages and mergeLiveAssistantMessages compose so live and thinking do not cross-merge", () => {
  const source: readonly SessionMessage[] = [
    createMessage("1", "assistant", "Live A. ", { tag: "live" }),
    createMessage("2", "assistant", "Thought A.", { tag: "thinking" }),
    createMessage("3", "assistant", "Thought B.", { tag: "thinking" }),
    createMessage("4", "assistant", "Live B.", { tag: "live" }),
  ];

  const merged = mergeLiveAssistantMessages(mergeThinkingMessages(source));

  assert.equal(merged.length, 3);
  assert.equal(merged[0].tag, "live");
  assert.equal(merged[0].content, "Live A. ");
  assert.equal(merged[1].tag, "thinking");
  assert.equal(merged[1].content, "Thought A.\nThought B.");
  assert.equal(merged[2].tag, "live");
  assert.equal(merged[2].content, "Live B.");
});

test("mergeThinkingMessages repairs a split marker-only list boundary", () => {
  const source: readonly SessionMessage[] = [
    createMessage(
      "1",
      "assistant",
      "Questions I identified:\n1. Multiple projects management UX\n2.",
      {
        tag: "thinking",
        localizedContent:
          "Вопросы, которые я выделил:\n1. UX управления несколькими проектами\n2.",
      }
    ),
    createMessage("2", "assistant", "First-run experience", {
      tag: "thinking",
      localizedContent: "Первоначальный запуск",
    }),
  ];

  const merged = mergeThinkingMessages(source);

  assert.equal(merged.length, 1);
  assert.equal(
    merged[0].content,
    "Questions I identified:\n1. Multiple projects management UX\n2. First-run experience"
  );
  assert.equal(
    merged[0].localizedContent,
    "Вопросы, которые я выделил:\n1. UX управления несколькими проектами\n2. Первоначальный запуск"
  );
});

test("resolveDisplayContent hides pending reasoning source until translation arrives", () => {
  const message = createMessage("1", "assistant", "I need to inspect inputs.", {
    tag: "thinking",
    translationState: "pending",
  });

  assert.equal(resolveDisplayContent(message), "");
});

test("mergeThinkingMessages does not mix pending English source into localized thinking", () => {
  const source: readonly SessionMessage[] = [
    createMessage("1", "assistant", "I need to inspect inputs.", {
      tag: "thinking",
      translationState: "pending",
    }),
    createMessage("2", "assistant", "Now I can draft the artifact.", {
      tag: "thinking",
      localizedContent: "Теперь я могу подготовить артефакт.",
    }),
  ];

  const merged = mergeThinkingMessages(source);

  assert.equal(merged.length, 1);
  assert.equal(
    merged[0].content,
    "I need to inspect inputs.\nNow I can draft the artifact."
  );
  assert.equal(
    merged[0].localizedContent,
    "Теперь я могу подготовить артефакт."
  );
  assert.equal(merged[0].translationState, "pending");
});

test("mergeThinkingMessages hides raw thinking source when any merged segment is pending translation", () => {
  const source: readonly SessionMessage[] = [
    createMessage("1", "assistant", "Let me inspect the workflow.", {
      tag: "thinking",
    }),
    createMessage("2", "assistant", "Now I can draft the artifact.", {
      tag: "thinking",
      translationState: "pending",
    }),
  ];

  const merged = mergeThinkingMessages(source);

  assert.equal(merged.length, 1);
  assert.equal(
    merged[0].content,
    "Let me inspect the workflow.\nNow I can draft the artifact."
  );
  assert.equal(merged[0].localizedContent, undefined);
  assert.equal(merged[0].translationState, "pending");
  assert.equal(resolveDisplayContent(merged[0]), "");
});

test("mergeThinkingMessages keeps growing translated reasoning prefix-stable while later segments are pending", () => {
  const firstPass = mergeThinkingMessages([
    createMessage("1", "assistant", "Let me inspect the workflow.", {
      tag: "thinking",
      localizedContent: "Позвольте мне проверить workflow.",
    }),
    createMessage("2", "assistant", "Now I can draft the artifact.", {
      tag: "thinking",
      translationState: "pending",
    }),
  ]);
  const secondPass = mergeThinkingMessages([
    createMessage("1", "assistant", "Let me inspect the workflow.", {
      tag: "thinking",
      localizedContent: "Позвольте мне проверить workflow.",
    }),
    createMessage("2", "assistant", "Now I can draft the artifact.", {
      tag: "thinking",
      localizedContent: "Теперь я могу подготовить artifact.",
    }),
    createMessage("3", "assistant", "I should mention boundaries.", {
      tag: "thinking",
      translationState: "pending",
    }),
  ]);

  assert.equal(
    firstPass[0].localizedContent,
    "Позвольте мне проверить workflow."
  );
  assert.equal(
    secondPass[0].localizedContent,
    "Позвольте мне проверить workflow.\nТеперь я могу подготовить artifact."
  );
  assert.equal(
    secondPass[0].localizedContent?.startsWith(
      firstPass[0].localizedContent ?? ""
    ),
    true
  );
});

test("mergeThinkingMessages preserves a blank line before the next standalone bold heading block", () => {
  const source: readonly SessionMessage[] = [
    createMessage(
      "1",
      "assistant",
      "**Creating and reading files**\n\nReviewing the current workspace layout.",
      {
        tag: "thinking",
        localizedContent:
          "**Создание и чтение файлов**\n\nПроверяю текущую структуру workspace.",
      }
    ),
    createMessage(
      "2",
      "assistant",
      "**Checking file existence**\n\nConfirming whether the questionnaire file already exists.",
      {
        tag: "thinking",
        localizedContent:
          "**Проверка существования файла**\n\nПодтверждаю, существует ли уже файл анкеты.",
      }
    ),
  ];

  const merged = mergeThinkingMessages(source);

  assert.equal(merged.length, 1);
  assert.equal(
    merged[0].content,
    "**Creating and reading files**\n\nReviewing the current workspace layout.\n\n**Checking file existence**\n\nConfirming whether the questionnaire file already exists."
  );
  assert.equal(
    merged[0].localizedContent,
    "**Создание и чтение файлов**\n\nПроверяю текущую структуру workspace.\n\n**Проверка существования файла**\n\nПодтверждаю, существует ли уже файл анкеты."
  );
});
