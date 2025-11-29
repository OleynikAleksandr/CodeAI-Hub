import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

const levelPriority: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
};

const normalizeLevel = (value?: string): LogLevel => {
	if (!value) {
		return "info";
	}

	const normalized = value.toLowerCase() as LogLevel;
	if (LOG_LEVELS.includes(normalized)) {
		return normalized;
	}

	return "info";
};

export class Logger {
	private readonly minLevel: LogLevel;
	private static logFilePath: string | null =
		process.env.CODEAI_CORE_LOG_FILE ?? null;
	private static logFileInitialized = false;

	constructor(level?: string) {
		this.minLevel = normalizeLevel(level ?? process.env.CORE_LOG_LEVEL);
	}

	debug(message: string, context?: Record<string, unknown>): void {
		this.log("debug", message, context);
	}

	info(message: string, context?: Record<string, unknown>): void {
		this.log("info", message, context);
	}

	warn(message: string, context?: Record<string, unknown>): void {
		this.log("warn", message, context);
	}

	error(
		message: string,
		error?: Error,
		context?: Record<string, unknown>,
	): void {
		const payload = {
			...(context ?? {}),
			error: error
				? { name: error.name, message: error.message, stack: error.stack }
				: undefined,
		};

		this.log("error", message, payload);
	}

	private log(
		level: LogLevel,
		message: string,
		context?: Record<string, unknown>,
	): void {
		if (levelPriority[level] < levelPriority[this.minLevel]) {
			return;
		}

		const timestamp = new Date().toISOString();
		const entry = JSON.stringify({
			timestamp,
			level,
			message,
			...context,
		});
		process.stdout.write(`${entry}\n`);
		Logger.appendToFile(entry);
	}

	private static appendToFile(entry: string): void {
		if (!Logger.logFilePath) {
			return;
		}

		if (!Logger.logFileInitialized) {
			try {
				mkdirSync(path.dirname(Logger.logFilePath), { recursive: true });
				Logger.logFileInitialized = true;
			} catch {
				Logger.logFilePath = null;
				return;
			}
		}

		try {
			appendFileSync(Logger.logFilePath, `${entry}\n`, "utf8");
		} catch {
			Logger.logFilePath = null;
		}
	}
}
