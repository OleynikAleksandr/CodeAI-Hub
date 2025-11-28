import { homedir } from "node:os";
import path from "node:path";

export const STATE_DIR = path.join(homedir(), ".codeai-hub", "state");
export const RUNTIME_REGISTRY_FILE = path.join(
	STATE_DIR,
	"runtime-registry.json",
);
export const CORE_LOCK_FILE = path.join(STATE_DIR, "core-manager.lock");
