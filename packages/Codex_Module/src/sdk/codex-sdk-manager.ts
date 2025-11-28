import type {
	Codex as CodexCtor,
	Thread,
	ThreadOptions,
} from "@openai/codex-sdk";
import type { CodexAuthManager } from "../auth/sdk-auth-manager";
import type { CodexInstaller } from "../installer/codex-installer";
import { CodexSessionLogger } from "../logging/session-logger";
import type { CodexMessageProcessor } from "../messaging/message-processor";
import type { CodexSessionManager } from "../session/session-manager";
import type { ActiveSession } from "../session/types";
import type { CodexWorkspaceOptions, ModuleReporter } from "../types";

type CodexManagerDependencies = {
	readonly installer: CodexInstaller;
	readonly authManager: CodexAuthManager;
	readonly sessions: CodexSessionManager;
	readonly processor: CodexMessageProcessor;
	readonly workspace: CodexWorkspaceOptions;
	readonly reporter?: ModuleReporter;
};

export class CodexSDKManager {
	private codexInstance: CodexCtor | null = null;
	private initialized = false;
	private readonly deps: CodexManagerDependencies;

	constructor(deps: CodexManagerDependencies) {
		this.deps = deps;
	}

	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}
		await this.deps.installer.ensureInstalled();
		await this.deps.authManager.ensureAuthenticated();
		this.applyAuthEnvironment();
		const loaded = await this.deps.installer.loadModule<{
			readonly Codex: typeof CodexCtor;
		}>();
		if (!loaded?.Codex) {
			throw new Error("Codex SDK module missing Codex export");
		}
		this.codexInstance = new loaded.Codex();
		this.initialized = true;
	}

	async createSession(): Promise<string> {
		await this.initialize();
		const logger = new CodexSessionLogger();
		const { tempId, session } = this.deps.sessions.createSession(logger);
		const thread = this.createThread();
		session.thread = thread;
		this.deps.processor.initializeSession(session, thread);
		return tempId;
	}

	async closeSession(sessionId: string): Promise<void> {
		await this.deps.sessions.closeSession(sessionId);
	}

	getSession(sessionId: string): ActiveSession | undefined {
		return this.deps.sessions.getSession(sessionId);
	}

	async sendMessage(
		sessionId: string,
		content: string,
		options?: { readonly internal?: boolean },
	): Promise<void> {
		await this.initialize();
		this.deps.processor.enqueueMessage(sessionId, content, undefined, options);
	}

	private createThread(): Thread {
		if (!this.codexInstance) {
			throw new Error("Codex SDK not initialized");
		}
		const options = this.resolveThreadOptions();
		return this.codexInstance.startThread(options);
	}

	private resolveThreadOptions(): ThreadOptions {
		return {
			model: this.deps.workspace.defaultModel,
			sandboxMode: this.deps.workspace.defaultSandboxMode,
			workingDirectory: this.deps.workspace.workspacePath,
			skipGitRepoCheck: this.deps.workspace.skipGitRepoCheck,
		};
	}

	private applyAuthEnvironment(): void {
		const authEnv = this.deps.authManager.getAuthEnvironment();
		for (const [key, value] of Object.entries(authEnv)) {
			if (value !== undefined) {
				process.env[key] = value;
			}
		}
	}
}
