const DEFAULT_CORE_HOST = "127.0.0.1";
export const DEFAULT_CORE_PORT = 8080;
export const CORE_HOST = process.env.CODEAI_CORE_HOST ?? DEFAULT_CORE_HOST;
export const ENV_CORE_PORT = Number(
  process.env.CODEAI_CORE_PORT ?? DEFAULT_CORE_PORT
);
const createConnectionUrls = (port: number, host = CORE_HOST) => ({
  httpUrl: `http://${host}:${port}`,
  wsUrl: `ws://${host}:${port}/api/v1/stream`,
});
export type CoreConnectionInfo = ReturnType<typeof createConnectionUrls>;
export const getDefaultCoreConnectionInfo = (): CoreConnectionInfo =>
  createConnectionUrls(ENV_CORE_PORT);
export { createConnectionUrls };
