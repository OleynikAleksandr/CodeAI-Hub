type Command = "start" | "stop" | "status" | "help";

export interface CliOptions {
  host: string;
  port: number;
}

type OptionName = "host" | "port";
interface OptionMatch {
  readonly name: OptionName;
  readonly value: string;
}

const DEFAULT_HOST = process.env.CORE_HOST ?? "127.0.0.1";
const DEFAULT_PORT_FALLBACK = 8080;
const DEFAULT_PORT = Number.parseInt(
  process.env.CORE_PORT ?? `${DEFAULT_PORT_FALLBACK}`,
  10
);

const INLINE_OPTION_REGEX = /^--(?<name>host|port)=(?<value>.+)$/u;
const FLAG_NAME_MAP: Record<string, OptionName> = {
  "--host": "host",
  "-H": "host",
  "--port": "port",
  "-p": "port",
};

const parsePort = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const parseInlineOption = (arg: string): OptionMatch | null => {
  const match = INLINE_OPTION_REGEX.exec(arg);
  if (!(match?.groups?.name && match.groups.value)) {
    return null;
  }
  return {
    name: match.groups.name as OptionName,
    value: match.groups.value,
  };
};

const parseSeparateOption = (
  flag: string,
  value?: string
): { option: OptionMatch; consumed: number } | null => {
  const name = FLAG_NAME_MAP[flag];
  if (!(name && value) || value.startsWith("--")) {
    return null;
  }
  return {
    option: {
      name,
      value,
    },
    consumed: 2,
  };
};

const applyOption = (
  option: OptionMatch,
  host: string,
  port: number
): { host: string; port: number } => {
  if (option.name === "host") {
    return { host: option.value, port };
  }
  return { host, port: parsePort(option.value, port) };
};

const parseOptions = (args: readonly string[]): CliOptions => {
  let host = DEFAULT_HOST;
  let port = Number.isFinite(DEFAULT_PORT)
    ? DEFAULT_PORT
    : DEFAULT_PORT_FALLBACK;
  let index = 0;

  while (index < args.length) {
    const arg = args[index];
    if (!arg) {
      index += 1;
      continue;
    }

    const inlineOption = parseInlineOption(arg);
    if (inlineOption) {
      ({ host, port } = applyOption(inlineOption, host, port));
      index += 1;
      continue;
    }

    const separateOption = parseSeparateOption(arg, args[index + 1]);
    if (separateOption) {
      ({ host, port } = applyOption(separateOption.option, host, port));
      index += separateOption.consumed;
      continue;
    }

    index += 1;
  }

  return { host, port };
};

export const parseCommand = (): { command: Command; options: CliOptions } => {
  const args = process.argv.slice(2);
  const rawCommand = args[0];
  const commandToken =
    rawCommand && !rawCommand.startsWith("--") ? rawCommand : "help";
  const optionArgs =
    rawCommand && !rawCommand.startsWith("--") ? args.slice(1) : args;

  return {
    command: ["start", "stop", "status", "help"].includes(
      commandToken.toLowerCase()
    )
      ? (commandToken.toLowerCase() as Command)
      : "help",
    options: parseOptions(optionArgs),
  };
};

export const printUsage = (): void => {
  process.stdout.write(
    [
      "CodeAI Hub Core Supervisor",
      "",
      "Usage:",
      "  codeai-core start [--host 127.0.0.1] [--port 8080]",
      "  codeai-core stop [--host 127.0.0.1] [--port 8080]",
      "  codeai-core status [--host 127.0.0.1] [--port 8080]",
      "",
    ].join("\n")
  );
};
