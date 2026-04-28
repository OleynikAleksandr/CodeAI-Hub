import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import {
  CODEX_TRANSLATION_PROCESS_PROFILE_KEY,
  CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY,
  resolveCodexAppServerProcessProfile,
} from "../app-server/process/codex-app-server-process-profile";
import { CodexAppServerTranslationService } from "./codex-app-server-translation-service";

interface RequestRecord {
  readonly method: string;
  readonly params: unknown;
}

class FakeCodexProcess {
  readonly requests: RequestRecord[] = [];
  readonly notifications = new Set<
    (notification: {
      readonly method: string;
      readonly params: unknown;
    }) => void
  >();
  started = false;
  stopped = false;
  private readonly options: {
    readonly emitTurnCompletion?: boolean;
  };

  constructor(options: { readonly emitTurnCompletion?: boolean } = {}) {
    this.options = options;
  }

  onNotification(
    listener: (notification: {
      readonly method: string;
      readonly params: unknown;
    }) => void
  ): () => void {
    this.notifications.add(listener);
    return () => {
      this.notifications.delete(listener);
    };
  }

  request<TResult = unknown>(
    method: string,
    params?: unknown
  ): Promise<TResult> {
    this.requests.push({ method, params });
    if (method === "thread/start") {
      return Promise.resolve({
        thread: { id: "translation-thread" },
      } as TResult);
    }
    if (method === "turn/start") {
      if (this.options.emitTurnCompletion === false) {
        return Promise.resolve({ turn: { id: "translation-turn" } } as TResult);
      }
      queueMicrotask(() => {
        this.emit("item/completed", {
          item: {
            id: "agent-message",
            phase: "final_answer",
            text: "Configuracion",
            type: "agentMessage",
          },
          threadId: "translation-thread",
        });
        this.emit("turn/completed", {
          threadId: "translation-thread",
          turn: { status: "completed" },
        });
      });
      return Promise.resolve({ turn: { id: "translation-turn" } } as TResult);
    }
    return Promise.resolve({} as TResult);
  }

  start(): Promise<void> {
    this.started = true;
    return Promise.resolve();
  }

  stop(): Promise<void> {
    this.stopped = true;
    return Promise.resolve();
  }

  private emit(method: string, params: unknown): void {
    for (const listener of this.notifications) {
      listener({ method, params });
    }
  }
}

test("Codex translation process profile owns independent startup args", () => {
  const workflowProfile = resolveCodexAppServerProcessProfile(
    CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY
  );
  const translationProfile = resolveCodexAppServerProcessProfile(
    CODEX_TRANSLATION_PROCESS_PROFILE_KEY
  );

  assert.equal(translationProfile.key, CODEX_TRANSLATION_PROCESS_PROFILE_KEY);
  assert.notEqual(
    translationProfile.appServerArgs,
    workflowProfile.appServerArgs
  );
  assert.deepEqual(
    translationProfile.appServerArgs,
    workflowProfile.appServerArgs
  );
  assert.equal(translationProfile.appServerArgs.includes("tool_search"), true);
});

test("CodexAppServerTranslationService uses strict translation thread profile", async () => {
  const processes: FakeCodexProcess[] = [];
  let capturedProcessProfileKey: string | null = null;
  const service = new CodexAppServerTranslationService({
    modelId: "gpt-5.4-mini",
    processFactory: ({ processProfileKey }) => {
      capturedProcessProfileKey = processProfileKey;
      const process = new FakeCodexProcess();
      processes.push(process);
      return process;
    },
    turnTimeoutMs: 1000,
  });

  const result = await service.translate({
    sourceLanguage: "en",
    targetLanguage: "es",
    text: "Settings",
  });

  assert.equal(
    capturedProcessProfileKey,
    CODEX_TRANSLATION_PROCESS_PROFILE_KEY
  );
  assert.equal(result.status, "translated");
  assert.equal(result.finalText, "Configuracion");
  assert.equal(processes[0]?.started, true);
  assert.equal(processes[0]?.stopped, true);
  const threadStart = processes[0]?.requests[0]?.params as Record<
    string,
    unknown
  >;
  const turnStart = processes[0]?.requests[1]?.params as Record<
    string,
    unknown
  >;
  assert.equal(threadStart.approvalPolicy, "never");
  assert.equal(threadStart.sandbox, "read-only");
  assert.equal(threadStart.persistExtendedHistory, false);
  assert.deepEqual(threadStart.config, { project_doc_max_bytes: 0 });
  assert.equal(turnStart.effort, "low");
  assert.equal(turnStart.summary, "none");
  assert.equal(typeof threadStart.cwd, "string");
  await assert.rejects(() => access(threadStart.cwd as string));
});

test("CodexAppServerTranslationService omits summary for Spark translation turns", async () => {
  const processes: FakeCodexProcess[] = [];
  const service = new CodexAppServerTranslationService({
    modelId: "gpt-5.3-codex-spark",
    processFactory: () => {
      const process = new FakeCodexProcess();
      processes.push(process);
      return process;
    },
    turnTimeoutMs: 1000,
  });

  await service.translate({
    sourceLanguage: "en",
    targetLanguage: "es",
    text: "Retry",
  });

  const turnStart = processes[0]?.requests[1]?.params as Record<
    string,
    unknown
  >;
  assert.equal(turnStart.model, "gpt-5.3-codex-spark");
  assert.equal("summary" in turnStart, false);
});

test("CodexAppServerTranslationService falls back and cleans up when translation turn times out", async () => {
  const processes: FakeCodexProcess[] = [];
  const service = new CodexAppServerTranslationService({
    modelId: "gpt-5.4-mini",
    processFactory: () => {
      const process = new FakeCodexProcess({ emitTurnCompletion: false });
      processes.push(process);
      return process;
    },
    turnTimeoutMs: 1,
  });

  const result = await service.translate({
    sourceLanguage: "en",
    targetLanguage: "es",
    text: "Timeout",
    timeoutMs: 1,
  });

  assert.equal(result.status, "fallback");
  assert.equal(result.errorCode, "request_failed");
  assert.equal(result.finalText, "Timeout");
  assert.equal(processes[0]?.started, true);
  assert.equal(processes[0]?.stopped, true);
  const threadStart = processes[0]?.requests[0]?.params as Record<
    string,
    unknown
  >;
  await assert.rejects(() => access(threadStart.cwd as string));
});
