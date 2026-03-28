#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CoreOrchestrator } from "./orchestrator/core-orchestrator";

const orchestrator = new CoreOrchestrator();
const fatalLogPath = path.join(
  os.homedir(),
  ".codeai-hub",
  "logs",
  "core",
  "core-fatal.log"
);

const appendFatalLog = (
  event: string,
  payload: Record<string, unknown>
): void => {
  try {
    fs.mkdirSync(path.dirname(fatalLogPath), { recursive: true });
    fs.appendFileSync(
      fatalLogPath,
      `${JSON.stringify({
        timestamp: new Date().toISOString(),
        event,
        ...payload,
      })}\n`,
      "utf8"
    );
  } catch {
    // Ignore fatal log write failures to avoid masking the original crash.
  }
};

const main = async (): Promise<void> => {
  process.on("uncaughtExceptionMonitor", (error, origin) => {
    appendFatalLog("core:uncaughtExceptionMonitor", {
      origin,
      errorName: error.name,
      message: error.message,
      stack: error.stack ?? null,
    });
  });

  await orchestrator.start();

  const handleTermination = async (signal: string): Promise<void> => {
    process.stderr.write(`Received ${signal}, stopping core orchestrator...\n`);
    await orchestrator.stop();
    process.exit(0);
  };

  const registerSignal = (signal: NodeJS.Signals) => {
    process.on(signal, () => {
      handleTermination(signal).catch((error) => {
        process.stderr.write(
          `[ERROR] Failed to handle ${signal}: ${error instanceof Error ? error.message : String(error)}\n`
        );
        process.exit(1);
      });
    });
  };

  registerSignal("SIGINT");
  registerSignal("SIGTERM");
};

main().catch((error) => {
  process.stderr.write(`[ERROR] Core orchestrator failed: ${error}\n`);
  process.exit(1);
});
