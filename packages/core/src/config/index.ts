import { homedir } from "node:os";
import path from "node:path";

export type CoreConfig = {
	readonly host: string;
	readonly port: number;
	readonly shutdownGracePeriodMs: number;
	readonly idleTtlMinutes: number | null;
	readonly managedMode: string | null;
	readonly claudeWorkspacePath: string;
	readonly claudeProjectSlug: string;
	readonly claudeSettingsPath: string;
	readonly codexWorkspacePath: string;
	readonly codexSandboxMode?:
		| "read-only"
		| "workspace-write"
		| "danger-full-access";
	readonly codexApprovalMode?:
		| "never"
		| "on-request"
		| "on-failure"
		| "untrusted";
	readonly codexSkipGitRepoCheck: boolean;
	readonly codexDefaultModel?: string;
	readonly geminiWorkspacePath: string;
	readonly geminiDefaultModel?: string;
	readonly geminiCredentialsDirectory?: string;
};

const DEFAULT_PORT = 8080;
const DEFAULT_GRACE_MS = 3_600_000;
const MILLISECONDS_IN_MINUTE = 60_000;
const DEFAULT_SETTINGS_PATH = path.join(
	homedir(),
	".codeai-hub",
	"settings",
	"claude.json",
);
const NON_ALPHANUMERIC_REGEX = /[^a-zA-Z0-9]/g;
const MULTIPLE_DASHES_REGEX = /-+/g;
const TRAILING_DASH_REGEX = /-$/;
const BOOLEAN_TRUTHY = new Set(["1", "true", "yes", "on"]);

const toNumber = (value: string | undefined, fallback: number): number => {
	if (!value) {
		return fallback;
	}

	const parsed = Number(value);
	if (Number.isNaN(parsed)) {
		return fallback;
	}

	return parsed;
};

const sanitizeSlug = (input: string): string =>
	input
		.replace(NON_ALPHANUMERIC_REGEX, "-")
		.replace(MULTIPLE_DASHES_REGEX, "-")
		.replace(TRAILING_DASH_REGEX, "")
		.trim() || "default-workspace";

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
	if (!value) {
		return fallback;
	}
	return BOOLEAN_TRUTHY.has(value.trim().toLowerCase());
};

const toSandboxMode = (
	value: string | undefined,
): CoreConfig["codexSandboxMode"] => {
	if (!value) {
		return;
	}
	const normalized = value.trim().toLowerCase();
	if (
		normalized === "read-only" ||
		normalized === "workspace-write" ||
		normalized === "danger-full-access"
	) {
		return normalized;
	}
	return;
};

const toApprovalMode = (
	value: string | undefined,
): CoreConfig["codexApprovalMode"] => {
	if (!value) {
		return;
	}
	const normalized = value.trim().toLowerCase();
	if (
		normalized === "never" ||
		normalized === "on-request" ||
		normalized === "on-failure" ||
		normalized === "untrusted"
	) {
		return normalized;
	}
	return;
};

export const loadConfig = (): CoreConfig => {
	const host = process.env.CORE_HOST ?? "127.0.0.1";
	const port = toNumber(process.env.CORE_PORT, DEFAULT_PORT);
	const shutdownGracePeriodMs = toNumber(
		process.env.CORE_SHUTDOWN_GRACE_MS,
		DEFAULT_GRACE_MS,
	);
	const idleTtlMinutes =
		shutdownGracePeriodMs <= 0
			? null
			: Math.round(shutdownGracePeriodMs / MILLISECONDS_IN_MINUTE);
	const managedMode = process.env.CORE_MANAGED_MODE ?? null;
	const workspacePath =
		process.env.CLAUDE_WORKSPACE_PATH ?? path.resolve(process.cwd());
	const slug =
		process.env.CLAUDE_PROJECT_SLUG ??
		sanitizeSlug(workspacePath.replace(/[^a-zA-Z0-9]/g, "-"));
	const codexWorkspacePath = process.env.CODEX_WORKSPACE_PATH ?? workspacePath;
	const claudeSettingsPath =
		process.env.CLAUDE_SETTINGS_PATH ?? DEFAULT_SETTINGS_PATH;
	const codexSandboxMode = toSandboxMode(process.env.CODEX_SANDBOX_MODE);
	const codexApprovalMode = toApprovalMode(process.env.CODEX_APPROVAL_MODE);
	const codexSkipGitRepoCheck = toBoolean(
		process.env.CODEX_SKIP_GIT_REPO_CHECK,
		false,
	);
	const codexDefaultModel = process.env.CODEX_DEFAULT_MODEL ?? undefined;
	const geminiWorkspacePath =
		process.env.GEMINI_WORKSPACE_PATH ?? workspacePath;
	const geminiDefaultModel = process.env.GEMINI_DEFAULT_MODEL ?? undefined;
	const geminiCredentialsDirectory =
		process.env.GEMINI_CREDENTIALS_DIRECTORY ??
		process.env.GEMINI_CREDENTIALS_DIR ??
		undefined;

	return {
		host,
		port,
		shutdownGracePeriodMs,
		idleTtlMinutes,
		managedMode,
		claudeWorkspacePath: workspacePath,
		claudeProjectSlug: slug,
		claudeSettingsPath,
		codexWorkspacePath,
		codexSandboxMode,
		codexApprovalMode,
		codexSkipGitRepoCheck,
		codexDefaultModel,
		geminiWorkspacePath,
		geminiDefaultModel,
		geminiCredentialsDirectory,
	};
};
