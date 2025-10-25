export type CoreConfig = {
  readonly host: string;
  readonly port: number;
  readonly shutdownGracePeriodMs: number;
};

const DEFAULT_PORT = 8080;
const DEFAULT_GRACE_MS = 60_000;

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed;
};

export const loadConfig = (): CoreConfig => {
  const host = process.env.CORE_HOST ?? "127.0.0.1";
  const port = toNumber(process.env.CORE_PORT, DEFAULT_PORT);
  const shutdownGracePeriodMs = toNumber(
    process.env.CORE_SHUTDOWN_GRACE_MS,
    DEFAULT_GRACE_MS
  );

  return {
    host,
    port,
    shutdownGracePeriodMs,
  };
};
