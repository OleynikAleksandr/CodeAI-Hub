import assert from "node:assert/strict";
import test from "node:test";
import { resolveStandaloneChatProviders } from "./provider-snapshot";

test("resolveStandaloneChatProviders returns each fallback provider once", () => {
  const providers = resolveStandaloneChatProviders([]);
  const providerIds = providers.map((provider) => provider.id);

  assert.equal(
    providerIds.length,
    new Set(providerIds).size,
    "new chat provider picker must not render duplicate providers"
  );
  assert.equal(
    providerIds.filter((providerId) => providerId === "openRouter").length,
    1
  );
});
