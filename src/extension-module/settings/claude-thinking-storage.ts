import { promises as fs, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { DEFAULT_SETTINGS_SNAPSHOT, type SettingsSnapshot } from "./types";

const SETTINGS_DIR = path.join(homedir(), ".codeai-hub", "settings");
const CLAUDE_SETTINGS_FILE = path.join(SETTINGS_DIR, "claude.json");

type ClaudeSettingsFile = SettingsSnapshot;

export const loadClaudeThinkingSettings = (): SettingsSnapshot => {
	try {
		const raw = readFileSync(CLAUDE_SETTINGS_FILE, "utf8");
		const parsed = JSON.parse(raw) as ClaudeSettingsFile;
		const thinking = parsed?.thinking;
		if (
			thinking &&
			typeof thinking.enabled === "boolean" &&
			typeof thinking.maxTokens === "number"
		) {
			return {
				thinking: {
					enabled: thinking.enabled,
					maxTokens: thinking.maxTokens,
				},
			};
		}
	} catch {
		// ignore missing/invalid files and fall back to defaults
	}
	return {
		thinking: {
			enabled: DEFAULT_SETTINGS_SNAPSHOT.thinking.enabled,
			maxTokens: DEFAULT_SETTINGS_SNAPSHOT.thinking.maxTokens,
		},
	};
};

export const persistClaudeThinkingSettings = async (
	snapshot: SettingsSnapshot,
): Promise<void> => {
	try {
		await fs.mkdir(SETTINGS_DIR, { recursive: true });
		await fs.writeFile(
			CLAUDE_SETTINGS_FILE,
			`${JSON.stringify(snapshot, null, 2)}\n`,
			"utf8",
		);
	} catch {
		// swallow persistence errors; settings UI will continue to function with in-memory state
	}
};

export const getClaudeSettingsPath = (): string => CLAUDE_SETTINGS_FILE;
