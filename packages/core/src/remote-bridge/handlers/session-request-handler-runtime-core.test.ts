import assert from "node:assert/strict";
import test from "node:test";
import type { ClaudeHaikuTranslationService } from "@codeai-hub/claude-module";
import type { ProviderAdapter } from "../../provider-registry/provider-module-loader.types";
import { resolveClaudeHaikuTranslationServiceForRuntime } from "./session-request-handler-runtime-core";
import type { SessionRequestHandlerRuntimeDependencies } from "./session-request-handler-runtime-types";

const createDependencies = (
  adapter: ProviderAdapter | undefined
): SessionRequestHandlerRuntimeDependencies =>
  ({
    providerRegistry: {
      getAdapter: (providerId: string) =>
        providerId === "claudeCodeCli" ? adapter : undefined,
    },
  }) as SessionRequestHandlerRuntimeDependencies;

test("resolveClaudeHaikuTranslationServiceForRuntime returns provider-owned service", () => {
  const service = {
    translate: async () => ({ text: "ok" }),
  } as unknown as ClaudeHaikuTranslationService;
  const adapter = {
    getHaikuTranslationService: () => service,
  } as unknown as ProviderAdapter;

  const resolved = resolveClaudeHaikuTranslationServiceForRuntime(
    createDependencies(adapter)
  );

  assert.equal(resolved, service);
});

test("resolveClaudeHaikuTranslationServiceForRuntime returns undefined without provider-owned getter", () => {
  const adapter = {} as ProviderAdapter;

  const resolved = resolveClaudeHaikuTranslationServiceForRuntime(
    createDependencies(adapter)
  );

  assert.equal(resolved, undefined);
});
