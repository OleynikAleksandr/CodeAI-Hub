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
	"claude",
	"manifest.json",
);

export const ensureClaudeModuleInstalled = (
	context: ExtensionContext,
	progress?: ProgressReporter,
): Promise<string> =>
	ensureProviderModuleInstalled(
		context,
		{
			providerId: "claude",
			manifestRelativePath: MANIFEST_RELATIVE_PATH,
			label: "Claude",
			entryPoints: [path.join("dist", "index.js")],
		},
		progress,
	);
