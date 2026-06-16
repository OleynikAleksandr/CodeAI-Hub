type OpenCodeSdkModule = typeof import("@opencode-ai/sdk/v2");

let sdkPromise: Promise<OpenCodeSdkModule> | null = null;
const nativeImport = new Function("specifier", "return import(specifier);") as (
  specifier: string
) => Promise<OpenCodeSdkModule>;

export const loadOpenCodeSdk = (): Promise<OpenCodeSdkModule> => {
  if (!sdkPromise) {
    sdkPromise = nativeImport("@opencode-ai/sdk/v2");
  }
  return sdkPromise;
};

export type { OpencodeClient } from "@opencode-ai/sdk/v2";
