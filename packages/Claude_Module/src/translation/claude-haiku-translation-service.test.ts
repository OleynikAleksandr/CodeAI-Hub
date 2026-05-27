import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { ClaudeStreamMessage } from "../types";
import {
  CLAUDE_HAIKU_TRANSLATION_MODEL_ID,
  CLAUDE_HAIKU_TRANSLATION_PROJECT_SLUG,
  type ClaudeHaikuTranslationQueryFunction,
  ClaudeHaikuTranslationService,
} from "./claude-haiku-translation-service";

interface RecordedQueryCall {
  readonly options: Record<string, unknown>;
  readonly prompt: string;
}

interface FakeAuthCalls {
  authProbe: number;
  authProbeExecutablePath?: string;
  bootstrap: number;
  bootstrapExecutablePath?: string;
  getEnv: number;
}

interface FakeAuthManager {
  readonly calls: FakeAuthCalls;
  ensureProviderHomeSessionBootstrap(payload: {
    readonly executablePath?: string;
    readonly workspacePath: string;
  }): Promise<void>;
  ensureSubscriptionAuth(options?: {
    readonly executablePath?: string;
  }): Promise<void>;
  getAuthEnvironment(): NodeJS.ProcessEnv;
}

interface FakeInstaller {
  readonly calls: { readonly ensureInstalled: number };
  ensureInstalled(): Promise<void>;
  getExecutablePath(): string;
}

const createFakeAuthManager = (): FakeAuthManager => {
  const calls: FakeAuthCalls = { authProbe: 0, bootstrap: 0, getEnv: 0 };
  return {
    calls,
    ensureProviderHomeSessionBootstrap(payload): Promise<void> {
      calls.bootstrap += 1;
      calls.bootstrapExecutablePath = payload.executablePath;
      return Promise.resolve();
    },
    ensureSubscriptionAuth(options): Promise<void> {
      calls.authProbe += 1;
      calls.authProbeExecutablePath = options?.executablePath;
      return Promise.resolve();
    },
    getAuthEnvironment(): NodeJS.ProcessEnv {
      calls.getEnv += 1;
      return { HOME: "/sandbox/provider-home" };
    },
  };
};

const createFakeInstaller = (): FakeInstaller => {
  const calls = { ensureInstalled: 0 };
  return {
    calls,
    ensureInstalled(): Promise<void> {
      calls.ensureInstalled += 1;
      return Promise.resolve();
    },
    getExecutablePath(): string {
      return "/tmp/claude-cli";
    },
  };
};

const createIterator = (
  messages: readonly ClaudeStreamMessage[]
): AsyncIterableIterator<ClaudeStreamMessage> & {
  readonly interrupt?: () => Promise<void>;
} => {
  async function* generate(): AsyncGenerator<ClaudeStreamMessage> {
    for (const message of messages) {
      await Promise.resolve();
      yield message;
    }
  }
  return generate();
};

const buildRecordingQuery = (
  messages: readonly ClaudeStreamMessage[],
  recorded: RecordedQueryCall[]
): ClaudeHaikuTranslationQueryFunction => {
  return ((payload: {
    readonly prompt: string;
    readonly options: Record<string, unknown>;
  }) => {
    recorded.push({ options: payload.options, prompt: payload.prompt });
    return createIterator(messages);
  }) as ClaudeHaikuTranslationQueryFunction;
};

test("ClaudeHaikuTranslationService runs ensure/auth/bootstrap before query and returns translated text", async () => {
  const auth = createFakeAuthManager();
  const installer = createFakeInstaller();
  const recorded: RecordedQueryCall[] = [];
  const service = new ClaudeHaikuTranslationService({
    authManager: auth as never,
    installer: installer as never,
    queryLoader: () =>
      Promise.resolve({
        query: buildRecordingQuery(
          [
            {
              message: { content: [{ text: "Привет мир", type: "text" }] },
              type: "assistant",
            },
            { result: "Привет мир", type: "result" },
          ],
          recorded
        ),
      }),
  });

  const result = await service.translate({
    sourceLanguage: "en",
    targetLanguage: "ru",
    text: "Hello world",
  });

  assert.equal(result.text, "Привет мир");
  assert.equal(result.errorCode, undefined);
  assert.equal(installer.calls.ensureInstalled, 1);
  assert.equal(auth.calls.authProbe, 1);
  assert.equal(auth.calls.authProbeExecutablePath, "/tmp/claude-cli");
  assert.equal(auth.calls.bootstrap, 1);
  assert.equal(auth.calls.bootstrapExecutablePath, "/tmp/claude-cli");
  assert.equal(recorded.length, 1);
  assert.equal(
    recorded[0]?.prompt,
    "Translate the source text into ru.\nReturn only the translation.\n\nSource text:\nHello world"
  );
});

test("ClaudeHaikuTranslationService discards completed native translation session", async () => {
  const providerHome = await mkdtemp(
    path.join(tmpdir(), "claude-translation-provider-home-")
  );
  const previousHome = process.env.CODEAI_CLAUDE_HOME;
  process.env.CODEAI_CLAUDE_HOME = providerHome;
  const auth = createFakeAuthManager();
  const installer = createFakeInstaller();
  const existingPath = path.join(
    providerHome,
    ".claude/projects",
    CLAUDE_HAIKU_TRANSLATION_PROJECT_SLUG,
    "existing.jsonl"
  );
  const createdPath = path.join(
    providerHome,
    ".claude/projects",
    CLAUDE_HAIKU_TRANSLATION_PROJECT_SLUG,
    "created-translation-session.jsonl"
  );
  const recorded: RecordedQueryCall[] = [];
  const query = ((payload: {
    readonly options: Record<string, unknown>;
    readonly prompt: string;
  }) => {
    recorded.push({ options: payload.options, prompt: payload.prompt });
    async function* generate(): AsyncGenerator<ClaudeStreamMessage> {
      await writeFile(createdPath, "{}\n", "utf8");
      yield { result: "Привет мир", type: "result" };
    }
    return generate();
  }) as ClaudeHaikuTranslationQueryFunction;

  try {
    await mkdir(path.dirname(existingPath), { recursive: true });
    await writeFile(existingPath, "{}\n", "utf8");
    const service = new ClaudeHaikuTranslationService({
      authManager: auth as never,
      installer: installer as never,
      queryLoader: () => Promise.resolve({ query }),
    });

    const result = await service.translate({
      sourceLanguage: "en",
      targetLanguage: "ru",
      text: "Hello world",
    });

    assert.equal(result.text, "Привет мир");
    assert.equal(recorded.length, 1);
    await access(existingPath);
    await assert.rejects(() => access(createdPath));
  } finally {
    if (previousHome === undefined) {
      Reflect.deleteProperty(process.env, "CODEAI_CLAUDE_HOME");
    } else {
      process.env.CODEAI_CLAUDE_HOME = previousHome;
    }
    await rm(providerHome, { force: true, recursive: true });
  }
});

test("ClaudeHaikuTranslationService applies translation-only query profile", async () => {
  const auth = createFakeAuthManager();
  const installer = createFakeInstaller();
  const recorded: RecordedQueryCall[] = [];
  const service = new ClaudeHaikuTranslationService({
    authManager: auth as never,
    installer: installer as never,
    queryLoader: () =>
      Promise.resolve({
        query: buildRecordingQuery(
          [{ result: "Привет", type: "result" }],
          recorded
        ),
      }),
  });

  await service.translate({
    sourceLanguage: "en",
    targetLanguage: "ru",
    text: "Hello",
  });

  const options = recorded[0]?.options;
  assert.ok(options, "query options must be recorded");
  assert.equal(options?.model, CLAUDE_HAIKU_TRANSLATION_MODEL_ID);
  assert.deepEqual(options?.tools, []);
  assert.equal(options?.maxTurns, 1);
  assert.equal(options?.persistSession, true);
  assert.equal(options?.includePartialMessages, false);
  assert.equal(options?.permissionMode, "bypassPermissions");
  assert.equal(options?.allowDangerouslySkipPermissions, true);
  assert.deepEqual(options?.settingSources, []);
  assert.deepEqual(options?.settings, {
    alwaysThinkingEnabled: false,
  });
  assert.deepEqual(options?.thinking, { type: "disabled" });
  assert.equal(typeof options?.systemPrompt, "string");
  assert.equal(
    (options?.systemPrompt as string).includes(
      "You are a precise translation engine."
    ),
    true
  );
  assert.equal(options?.pathToClaudeCodeExecutable, "/tmp/claude-cli");
  assert.equal(typeof options?.cwd, "string");
  assert.equal(
    (options?.cwd as string).endsWith(CLAUDE_HAIKU_TRANSLATION_PROJECT_SLUG),
    true
  );
  assert.deepEqual(options?.additionalDirectories, [options?.cwd]);
  assert.equal(
    (options?.projectPath as string).endsWith(
      CLAUDE_HAIKU_TRANSLATION_PROJECT_SLUG
    ),
    true
  );
  assert.equal("resume" in (options as Record<string, unknown>), false);
  assert.equal(
    "continue" in (options as Record<string, unknown>),
    false,
    "continue must not be passed for translation-only profile"
  );
  assert.equal(
    "outputFormat" in (options as Record<string, unknown>),
    false,
    "outputFormat must not be passed for translation-only profile"
  );
  assert.equal(
    "effort" in (options as Record<string, unknown>),
    false,
    "effort must not be passed when thinking is disabled"
  );
});

test("ClaudeHaikuTranslationService includes marker-safe prompt rules for localization bundles", async () => {
  const auth = createFakeAuthManager();
  const installer = createFakeInstaller();
  const recorded: RecordedQueryCall[] = [];
  const service = new ClaudeHaikuTranslationService({
    authManager: auth as never,
    installer: installer as never,
    queryLoader: () =>
      Promise.resolve({
        query: buildRecordingQuery(
          [
            {
              result: "__CODEAI_HUB_LOCALIZATION_ENTRY__0__START__",
              type: "result",
            },
          ],
          recorded
        ),
      }),
  });

  await service.translate({
    category: "localization_bundle",
    sourceLanguage: "en",
    targetLanguage: "ru",
    text: "__CODEAI_HUB_LOCALIZATION_ENTRY__0__START__\nHello\n__CODEAI_HUB_LOCALIZATION_ENTRY__0__END__",
  });

  assert.equal(
    recorded[0]?.prompt.includes(
      "Preserve all __CODEAI_HUB_LOCALIZATION_ENTRY__ marker lines exactly and keep the same order."
    ),
    true
  );
});

test("ClaudeHaikuTranslationService masks Ultrathink trigger literals in prompts and restores translated output", async () => {
  const auth = createFakeAuthManager();
  const installer = createFakeInstaller();
  const recorded: RecordedQueryCall[] = [];
  const service = new ClaudeHaikuTranslationService({
    authManager: auth as never,
    installer: installer as never,
    queryLoader: () =>
      Promise.resolve({
        query: buildRecordingQuery(
          [
            {
              result:
                'Используйте "__CODEAI_HUB_LITERAL_ULTRATHINK__" в сообщении.',
              type: "result",
            },
          ],
          recorded
        ),
      }),
  });

  const result = await service.translate({
    sourceLanguage: "en",
    targetLanguage: "ru",
    text: 'Use "Ultrathink" anywhere in your message.',
  });

  assert.equal(
    recorded[0]?.prompt.includes("Ultrathink"),
    false,
    "raw Ultrathink literal must not be sent to the Claude translation prompt"
  );
  assert.equal(
    recorded[0]?.prompt.includes("__CODEAI_HUB_LITERAL_ULTRATHINK__"),
    true
  );
  assert.equal(result.text, 'Используйте "Ultrathink" в сообщении.');
});

test("ClaudeHaikuTranslationService prefers result payload over partial assistant blocks", async () => {
  const auth = createFakeAuthManager();
  const installer = createFakeInstaller();
  const service = new ClaudeHaikuTranslationService({
    authManager: auth as never,
    installer: installer as never,
    queryLoader: () =>
      Promise.resolve({
        query: buildRecordingQuery(
          [
            {
              message: { content: [{ text: "partial", type: "text" }] },
              type: "assistant",
            },
            { result: "final", type: "result" },
          ],
          []
        ),
      }),
  });

  const result = await service.translate({
    sourceLanguage: "en",
    targetLanguage: "de",
    text: "hi",
  });

  assert.equal(result.text, "final");
});

test("ClaudeHaikuTranslationService returns empty_translation when stream yields no text", async () => {
  const auth = createFakeAuthManager();
  const installer = createFakeInstaller();
  const service = new ClaudeHaikuTranslationService({
    authManager: auth as never,
    installer: installer as never,
    queryLoader: () =>
      Promise.resolve({
        query: buildRecordingQuery([{ type: "result", result: "" }], []),
      }),
  });

  const result = await service.translate({
    sourceLanguage: "en",
    targetLanguage: "ru",
    text: "Hello",
  });

  assert.equal(result.text, null);
  assert.equal(result.errorCode, "empty_translation");
});

test("ClaudeHaikuTranslationService surfaces request_failed when query throws", async () => {
  const auth = createFakeAuthManager();
  const installer = createFakeInstaller();
  const service = new ClaudeHaikuTranslationService({
    authManager: auth as never,
    installer: installer as never,
    queryLoader: () =>
      Promise.resolve({
        query: (() => {
          throw new Error("boom");
        }) as ClaudeHaikuTranslationQueryFunction,
      }),
  });

  const result = await service.translate({
    sourceLanguage: "en",
    targetLanguage: "ru",
    text: "Hello",
  });

  assert.equal(result.text, null);
  assert.equal(result.errorCode, "request_failed");
});
