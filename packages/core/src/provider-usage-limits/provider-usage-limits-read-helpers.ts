import type {
  ProviderUsageLimitsDiagnostics,
  ProviderUsageLimitsSnapshot,
  ReadProviderUsageLimitsParams,
} from "./provider-usage-limits-types";

type ProviderUsageLimitsReader = {
  read(
    params: ReadProviderUsageLimitsParams
  ): Promise<ProviderUsageLimitsSnapshot | null>;
};

export const readProviderUsageLimitsSnapshot = async (params: {
  readonly reader: ProviderUsageLimitsReader;
  readonly readParams: ReadProviderUsageLimitsParams;
  readonly onReadFailed: (message: string) => void;
}): Promise<{
  readonly snapshot: ProviderUsageLimitsSnapshot | null;
  readonly readFailed: boolean;
}> => {
  let readFailed = false;
  const snapshot = await params.reader
    .read(params.readParams)
    .catch((error) => {
      readFailed = true;
      const message = error instanceof Error ? error.message : String(error);
      params.onReadFailed(message);
      return null;
    });

  return { snapshot, readFailed };
};

export const buildProviderUsageLimitsDiagnostics = (params: {
  readonly result: ProviderUsageLimitsDiagnostics["result"];
  readonly source: ProviderUsageLimitsDiagnostics["source"];
  readonly fromCache: boolean;
  readonly readerRegistered: boolean;
  readonly force: boolean;
  readonly fallbackReason?: ProviderUsageLimitsDiagnostics["fallbackReason"];
  readonly changed?: boolean;
}): ProviderUsageLimitsDiagnostics => ({
  result: params.result,
  source: params.source,
  fromCache: params.fromCache,
  readerRegistered: params.readerRegistered,
  force: params.force,
  ...(params.fallbackReason ? { fallbackReason: params.fallbackReason } : {}),
  ...(typeof params.changed === "boolean" ? { changed: params.changed } : {}),
});
