import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export const resolveCoreLogFilePath = (): string => {
	const logDir = path.join(homedir(), ".codeai-hub", "logs", "core");
	try {
		mkdirSync(logDir, { recursive: true });
	} catch {
		// ignore directory creation failures; logging will fall back to stdout
	}
	return path.join(logDir, "core.log");
};
