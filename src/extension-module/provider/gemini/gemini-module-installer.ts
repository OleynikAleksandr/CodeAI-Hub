import path from "node:path";
import type { ExtensionContext, Progress } from "vscode";
import { ensureProviderModuleInstalled } from "../shared/install-provider-module";

type ProgressReporter = Progress<{
  message?: string;
  increment?: number;
}>;

const MANIFEST_RELATIVE_PATH = path.join(
  "assets",
  "providers",
  "gemini",
  "manifest.json"
);

export const ensureGeminiModuleInstalled = (
  context: ExtensionContext,
  progress?: ProgressReporter
): Promise<string> =>
  ensureProviderModuleInstalled(
    context,
    {
      providerId: "gemini",
      manifestRelativePath: MANIFEST_RELATIVE_PATH,
      label: "Gemini",
      entryPoints: [path.join("dist", "index.js")],
    },
    progress
  );
