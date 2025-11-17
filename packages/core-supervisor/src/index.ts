#!/usr/bin/env node

type Command = "start" | "stop" | "status" | "help";

type CliOptions = {
  readonly host: string;
  readonly port: number;
};

const DEFAULT_HOST = process.env.CORE_HOST ?? "127.0.0.1";
const DEFAULT_PORT_FALLBACK = 8080;
const DEFAULT_PORT = Number.parseInt(
  process.env.CORE_PORT ?? `${DEFAULT_PORT_FALLBACK}`,
  10
);

const parseCommand = (): { command: Command; options: CliOptions } => {
  const [, , rawCommand] = process.argv;
  const command = (rawCommand ?? "help").toLowerCase() as Command;
  return {
    command: ["start", "stop", "status", "help"].includes(command)
      ? command
      : "help",
    options: {
      host: DEFAULT_HOST,
      port: Number.isFinite(DEFAULT_PORT)
        ? DEFAULT_PORT
        : DEFAULT_PORT_FALLBACK,
    },
  };
};

const printUsage = (): void => {
  process.stdout.write(
    [
      "CodeAI Hub Core Supervisor",
      "",
      "Usage:",
      "  codeai-core start  - launch the autonomous core orchestrator",
      "  codeai-core stop   - request graceful shutdown",
      "  codeai-core status - print current /api/v1/health info",
      "",
    ].join("\n")
  );
};

const notImplemented = (command: Command): void => {
  throw new Error(`Command "${command}" is not implemented yet.`);
};

const main = async (): Promise<void> => {
  const { command } = parseCommand();
  switch (command) {
    case "start":
      await notImplemented(command);
      break;
    case "stop":
      await notImplemented(command);
      break;
    case "status":
      await notImplemented(command);
      break;
    default:
      printUsage();
      break;
  }
};

main().catch((error) => {
  process.stderr.write(
    `[core-supervisor] ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
