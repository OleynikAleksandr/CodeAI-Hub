#!/usr/bin/env node

import { CoreOrchestrator } from "./orchestrator/core-orchestrator";

const orchestrator = new CoreOrchestrator();

const main = async (): Promise<void> => {
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
