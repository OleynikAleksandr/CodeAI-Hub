declare module "@google/gemini-cli/dist/src/config/extension-manager" {
  import type { GeminiCLIExtension } from "@google/gemini-cli-core/dist/src/config/config";

  export class ExtensionManager {
    constructor(options: Record<string, unknown>);
    loadExtensions(): Promise<readonly GeminiCLIExtension[]>;
    getExtensions(): readonly GeminiCLIExtension[];
  }
}
