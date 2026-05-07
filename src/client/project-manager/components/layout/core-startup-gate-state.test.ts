import assert from "node:assert/strict";
import test from "node:test";
import { resolveStartupGateCopy } from "./core-startup-gate-state";

test("resolveStartupGateCopy returns Russian copy for Russian UI settings", () => {
  const copy = resolveStartupGateCopy("ru");

  assert.equal(copy.title, "CodeAI Hub запускается");
  assert.equal(copy.status, "Ожидание готовности Core...");
  assert.equal(
    copy.detail,
    "Core проверяет и обновляет локальные компоненты. Рабочие области и Settings станут доступны после завершения."
  );
});

test("resolveStartupGateCopy returns source English copy by default", () => {
  const copy = resolveStartupGateCopy("source");

  assert.equal(copy.title, "CodeAI Hub is starting");
  assert.equal(copy.status, "Waiting for Core readiness...");
  assert.equal(
    copy.detail,
    "Core is checking and updating local components. Workspaces and Settings will become available when startup completes."
  );
});
