import assert from "node:assert/strict";
import test from "node:test";
import {
  DescriptionQuestionnaireService,
  shouldSeedQuestionnaire,
} from "./description-questionnaire-service";

const TEMPLATE = `# Project Name

<!-- field:meta.title -->
<Name>
<!-- /field -->
`;

const FILLED_QUESTIONNAIRE = `# Project Name

<!-- field:meta.title -->
Filled Title
<!-- /field -->
`;

type FetchHandler = (
  url: string,
  init?: RequestInit
) => Promise<{
  readonly json: () => Promise<unknown>;
  readonly ok: boolean;
  readonly status: number;
}>;

const installWindowConfig = (): void => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { codeaiBridgeConfig: { httpUrl: "http://core.test" } },
  });
};

const jsonResponse = (
  payload: unknown,
  status = 200
): Awaited<ReturnType<FetchHandler>> => ({
  json: () => Promise.resolve(payload),
  ok: status >= 200 && status < 300,
  status,
});

test("DescriptionQuestionnaireService refreshes stale cached session before rendering questionnaire", async () => {
  installWindowConfig();
  const calls: Array<{
    readonly body: Record<string, unknown> | null;
    readonly url: string;
  }> = [];
  const handlers: FetchHandler[] = [
    async () => jsonResponse({ sessionId: "stale-session" }),
    async () =>
      jsonResponse({ questionnaire: { templateMarkdown: TEMPLATE } }),
    async () =>
      jsonResponse({
        content: FILLED_QUESTIONNAIRE,
        maxBytes: 300_000,
        path: ".codeai-hub/demo/description/questionnaire.md",
        truncated: false,
      }),
    async () =>
      jsonResponse({ questionnaire: { templateMarkdown: TEMPLATE } }),
    async () => jsonResponse({ error: "Session not found" }, 404),
    async () => jsonResponse({ sessionId: "fresh-session" }),
    async () =>
      jsonResponse({
        content: FILLED_QUESTIONNAIRE,
        maxBytes: 300_000,
        path: ".codeai-hub/demo/description/questionnaire.md",
        truncated: false,
      }),
  ];
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (input: string | URL, init?: RequestInit) => {
      const body =
        typeof init?.body === "string"
          ? (JSON.parse(init.body) as Record<string, unknown>)
          : null;
      calls.push({ body, url: String(input) });
      const handler = handlers.shift();
      assert.ok(handler, `Unexpected fetch call to ${String(input)}`);
      return await handler(String(input), init);
    },
  });

  const service = new DescriptionQuestionnaireService();
  const workspace = {
    name: "Demo",
    path: "/tmp/description-questionnaire-refresh",
    slug: "demo",
  };

  const firstLoad = await service.load(workspace);
  const secondLoad = await service.load(workspace);

  assert.equal(firstLoad.status, "ok");
  assert.equal(secondLoad.status, "ok");
  assert.equal(
    secondLoad.status === "ok" ? secondLoad.value.sessionId : null,
    "fresh-session"
  );
  assert.equal(
    secondLoad.status === "ok" ? secondLoad.value.answers["meta.title"] : null,
    "Filled Title"
  );
  assert.deepEqual(
    calls
      .filter((call) => call.url.endsWith("/api/v1/orchestrator/workspace-file"))
      .map((call) => call.body?.sessionId),
    ["stale-session", "stale-session", "fresh-session"]
  );
});

test("DescriptionQuestionnaireService does not rewrite existing questionnaire on load", async () => {
  installWindowConfig();
  const calls: Array<{
    readonly body: Record<string, unknown> | null;
    readonly url: string;
  }> = [];
  const localizedTemplate = `# Project Name

<small><i>Updated helper copy.</i></small>

<!-- field:meta.title -->
<Name>
<!-- /field -->
`;
  const existingQuestionnaire = `# Project Name

<small><i>Older helper copy.</i></small>

<!-- field:meta.title -->
Filled Title
<!-- /field -->
`;
  const handlers: FetchHandler[] = [
    async () => jsonResponse({ sessionId: "description-session" }),
    async () =>
      jsonResponse({ questionnaire: { templateMarkdown: localizedTemplate } }),
    async () =>
      jsonResponse({
        content: existingQuestionnaire,
        maxBytes: 300_000,
        path: ".codeai-hub/demo-existing/description/questionnaire.md",
        truncated: false,
      }),
  ];
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (input: string | URL, init?: RequestInit) => {
      const body =
        typeof init?.body === "string"
          ? (JSON.parse(init.body) as Record<string, unknown>)
          : null;
      calls.push({ body, url: String(input) });
      const handler = handlers.shift();
      assert.ok(handler, `Unexpected fetch call to ${String(input)}`);
      return await handler(String(input), init);
    },
  });

  const service = new DescriptionQuestionnaireService();
  const result = await service.load({
    name: "Demo Existing",
    path: "/tmp/description-questionnaire-existing",
    slug: "demo-existing",
  });

  assert.equal(result.status, "ok");
  assert.equal(
    result.status === "ok" ? result.value.answers["meta.title"] : null,
    "Filled Title"
  );
  assert.equal(
    calls.some((call) =>
      call.url.endsWith("/api/v1/orchestrator/workspace-file-write")
    ),
    false
  );
});

test("shouldSeedQuestionnaire seeds only on missing, never on read error or ok", () => {
  assert.equal(shouldSeedQuestionnaire("missing"), true);
  assert.equal(shouldSeedQuestionnaire("error"), false);
  assert.equal(shouldSeedQuestionnaire("ok"), false);
});

test("DescriptionQuestionnaireService does not overwrite questionnaire when the read fails", async () => {
  installWindowConfig();
  const calls: Array<{ readonly url: string }> = [];
  const handlers: FetchHandler[] = [
    async () => jsonResponse({ sessionId: "err-session" }),
    async () => jsonResponse({ questionnaire: { templateMarkdown: TEMPLATE } }),
    async () => jsonResponse({ error: "Internal" }, 500),
  ];
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (input: string | URL, init?: RequestInit) => {
      calls.push({ url: String(input) });
      const handler = handlers.shift();
      assert.ok(handler, `Unexpected fetch call to ${String(input)}`);
      return await handler(String(input), init);
    },
  });

  const service = new DescriptionQuestionnaireService();
  const result = await service.load({
    name: "Demo Err",
    path: "/tmp/description-questionnaire-error",
    slug: "demo-err",
  });

  assert.equal(result.status, "ok");
  // A read failure must NOT cause the filled questionnaire to be overwritten.
  assert.equal(
    calls.some((call) =>
      call.url.endsWith("/api/v1/orchestrator/workspace-file-write")
    ),
    false
  );
});
