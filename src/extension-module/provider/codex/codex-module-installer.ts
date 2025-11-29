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
  "codex",
  "manifest.json"
);

export const ensureCodexModuleInstalled = (
  context: ExtensionContext,
  progress?: ProgressReporter
): Promise<string> =>
  ensureProviderModuleInstalled(
    context,
    {
      providerId: "codex",
      manifestRelativePath: MANIFEST_RELATIVE_PATH,
      label: "Codex",
      entryPoints: [path.join("dist", "index.js")],
    },
    progress
  );
