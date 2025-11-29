import { homedir } from "node:os";
import path from "node:path";
import {
	buildSessionFilePath,
	readSessionEvents,
	sanitizeWorkspaceSlug,
	UnifiedSessionWriter,
} from "@codeai-hub/unified-session";
import type { Session, SessionMessage } from "../session-manager";
import type { Logger } from "../telemetry/logger";

const SESSION_ROOT = path.join(homedir(), ".codeai-hub", "sessions");
const sanitizeSessionId = (value: string): string =>
	sanitizeWorkspaceSlug(value);

type PendingSession = {
	readonly providerId: string;
	providerSessionId?: string;
	writer?: UnifiedSessionWriter;
	writerSessionId?: string;
	readonly queue: SessionMessage[];
};

export class UnifiedSessionStorage {
	private readonly logger: Logger;

	private readonly workspaceSlug: string;

	private readonly rootDirectory: string;

	private readonly sessions = new Map<string, PendingSession>();

	constructor(options: {
		readonly workspaceSlug?: string;
		readonly rootDirectory?: string;
		readonly logger: Logger;
	}) {
		this.logger = options.logger;
		this.workspaceSlug = options.workspaceSlug
			? sanitizeWorkspaceSlug(options.workspaceSlug)
			: "default-workspace";
		this.rootDirectory = options.rootDirectory ?? SESSION_ROOT;
	}

	register(session: Session): void {
		const entry: PendingSession = {
			providerId: session.providerId,
			providerSessionId: session.providerSessionId,
			queue: [],
		};
		this.sessions.set(session.id, entry);
		if (session.providerSessionId) {
			this.initializeWriter(session.id, entry, session.providerSessionId);
		}
	}

	promote(sessionId: string, providerSessionId: string): void {
		const entry = this.sessions.get(sessionId);
		if (!entry) {
			return;
		}
		if (entry.providerSessionId === providerSessionId && entry.writer) {
			return;
		}
		entry.providerSessionId = providerSessionId;
		this.initializeWriter(sessionId, entry, providerSessionId);
	}

	appendMessage(sessionId: string, message: SessionMessage): void {
		const entry = this.sessions.get(sessionId);
		if (!entry) {
			return;
		}
		if (!entry.writer) {
			entry.queue.push(message);
			return;
		}
		this.writeMessage(entry, message).catch((error: unknown) => {
			this.logger.error(
				"Failed to append unified session record",
				error as Error,
				{
					sessionId,
					providerId: entry.providerId,
				},
			);
		});
	}

	close(sessionId: string, reason?: string): void {
		const entry = this.sessions.get(sessionId);
		if (!entry) {
			return;
		}
		this.sessions.delete(sessionId);
		const writer = entry.writer;
		if (writer) {
			writer.close({ reason }).catch((error: unknown) => {
				this.logger.error(
					"Failed to close unified session writer",
					error as Error,
					{
						sessionId,
						providerId: entry.providerId,
					},
				);
			});
		}
	}

	async readMessages(session: Session): Promise<SessionMessage[]> {
		const entry = this.sessions.get(session.id);
		const providerSessionId =
			entry?.providerSessionId ?? session.providerSessionId;
		if (!providerSessionId) {
			return [];
		}

		if (entry?.writer) {
			await this.flushQueue(entry).catch((error: unknown) => {
				this.logger.error(
					"Failed to flush unified session record",
					error as Error,
					{
						sessionId: session.id,
						providerId: entry.providerId,
					},
				);
			});
		}

		const sanitizedProviderSessionId = sanitizeSessionId(providerSessionId);
		const filePath = buildSessionFilePath({
			rootDirectory: this.rootDirectory,
			workspaceSlug: this.workspaceSlug,
			provider: session.providerId,
			sessionId: sanitizedProviderSessionId,
		});

		const records = await readSessionEvents(filePath);
		const messages: SessionMessage[] = [];
		for (const record of records) {
			if (record.type !== "message") {
				continue;
			}
			messages.push({
				id: record.messageId,
				role: record.role,
				content: record.content,
				sessionId: session.id,
				timestamp: record.timestamp,
			});
		}
		return messages;
	}

	private initializeWriter(
		sessionId: string,
		entry: PendingSession,
		providerSessionId: string,
	): void {
		const sanitizedProviderSessionId = sanitizeSessionId(providerSessionId);
		if (
			entry.writer &&
			entry.writerSessionId === sanitizedProviderSessionId &&
			entry.providerSessionId === providerSessionId
		) {
			this.flushQueue(entry).catch((error: unknown) => {
				this.logger.error(
					"Failed to flush unified session record",
					error as Error,
					{
						sessionId,
						providerId: entry.providerId,
					},
				);
			});
			return;
		}

		if (entry.writer && entry.writerSessionId !== sanitizedProviderSessionId) {
			entry.writer
				.close({ reason: "session-renamed" })
				.catch((error: unknown) => {
					this.logger.error(
						"Failed to close previous unified session writer",
						error as Error,
						{
							sessionId,
							providerId: entry.providerId,
						},
					);
				});
			entry.writer = undefined;
			entry.writerSessionId = undefined;
		}

		entry.writer = new UnifiedSessionWriter({
			rootDirectory: this.rootDirectory,
			workspaceSlug: this.workspaceSlug,
			provider: entry.providerId,
			sessionId: sanitizedProviderSessionId,
		});
		entry.writerSessionId = sanitizedProviderSessionId;
		this.flushQueue(entry).catch((error: unknown) => {
			this.logger.error(
				"Failed to flush unified session record",
				error as Error,
				{
					sessionId,
					providerId: entry.providerId,
				},
			);
		});
	}

	private async flushQueue(entry: PendingSession): Promise<void> {
		if (!entry.writer || entry.queue.length === 0) {
			return;
		}
		const queue = entry.queue.splice(0, entry.queue.length);
		for (const message of queue) {
			try {
				await this.writeMessage(entry, message);
			} catch (error) {
				this.logger.error(
					"Failed to flush unified session record",
					error as Error,
					{
						sessionId: message.sessionId,
						providerId: entry.providerId,
					},
				);
			}
		}
	}

	private async writeMessage(
		entry: PendingSession,
		message: SessionMessage,
	): Promise<void> {
		if (!entry.writer) {
			entry.queue.push(message);
			return;
		}
		await entry.writer.appendMessage({
			messageId: message.id,
			role: message.role,
			content: message.content,
			timestamp: message.timestamp,
		});
	}
}
