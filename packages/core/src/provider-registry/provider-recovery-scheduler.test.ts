import assert from "node:assert/strict";
import test from "node:test";
import { Logger } from "../telemetry/logger";
import { ProviderRecoveryScheduler } from "./provider-recovery-scheduler";

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

test("ProviderRecoveryScheduler dispose clears pending retry timers", async () => {
  let retries = 0;
  const scheduler = new ProviderRecoveryScheduler({
    intervalMs: 5,
    logger: new Logger("error"),
    retry: () => {
      retries += 1;
      return Promise.resolve();
    },
  });

  scheduler.scheduleRetry("codexCli");
  scheduler.dispose();

  await wait(20);

  assert.equal(retries, 0);
});

test("ProviderRecoveryScheduler ignores schedules after dispose", async () => {
  let retries = 0;
  const scheduler = new ProviderRecoveryScheduler({
    intervalMs: 5,
    logger: new Logger("error"),
    retry: () => {
      retries += 1;
      return Promise.resolve();
    },
  });

  scheduler.dispose();
  scheduler.scheduleRetry("codexCli");

  await wait(20);

  assert.equal(retries, 0);
});
