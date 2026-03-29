import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import type { ThreadOptions } from "@openai/codex-sdk";

const MODEL_REASONING_KEY = "model_reasoning_effort";
const NOTICE_MODEL_MIGRATIONS_KEY = "notice.model_migrations";
const MIGRATION_SANITIZE_MODEL_ID = "gpt-5.4";
const EMPTY_INLINE_TABLE_TOML = "{}";
const THREAD_PATCHED = Symbol("codex-reasoning-thread-patch");
const EXEC_PATCHED = Symbol("codex-reasoning-exec-run");
const INTERNAL_ORIGINATOR_ENV = "CODEX_INTERNAL_ORIGINATOR_OVERRIDE";
const TYPESCRIPT_SDK_ORIGINATOR = "codex_sdk_ts";

interface ConfigOverride {
  readonly key: string;
  readonly value: string;
}

type PatchedThreadOptions = ThreadOptions & {
  readonly effectiveModelId?: string;
  readonly modelReasoningEffort?: string;
};

interface ThreadTurnOptions {
  readonly outputSchema?: unknown;
}

interface PatchedExecArgs {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  configOverrides?: readonly ConfigOverride[];
  readonly images?: readonly string[];
  readonly input: string;
  readonly model?: string;
  readonly outputSchemaFile?: string;
  readonly sandboxMode?: string;
  readonly skipGitRepoCheck?: boolean;
  readonly threadId?: string | null;
  readonly workingDirectory?: string;
}

type ThreadRunStreamedInternal = (
  this: {
    readonly _exec: {
      readonly run: (
        args: PatchedExecArgs
      ) => AsyncGenerator<string, void, unknown>;
    };
    readonly _options?: {
      readonly baseUrl?: string;
      readonly apiKey?: string;
    };
    readonly _threadOptions?: PatchedThreadOptions;
    _id: string | null;
  },
  input: unknown,
  turnOptions?: ThreadTurnOptions
) => AsyncGenerator<unknown, void, unknown>;

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

interface ThreadConstructor {
  prototype: unknown;
}

const isThreadStartedEvent = (
  value: unknown
): value is { type: "thread.started"; thread_id: string } =>
  typeof value === "object" &&
  value !== null &&
  (value as { type?: unknown }).type === "thread.started" &&
  typeof (value as { thread_id?: unknown }).thread_id === "string";

const createOutputSchemaFile = async (schema?: unknown) => {
  if (schema === undefined) {
    return {
      cleanup: async () => {
        // intentionally empty – no cleanup required for absent schema
      },
    };
  }
  if (!isJsonObject(schema)) {
    throw new Error("outputSchema must be a plain JSON object");
  }
  const schemaDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "codex-output-schema-")
  );
  const schemaPath = path.join(schemaDir, "schema.json");
  const cleanup = async () => {
    try {
      await fs.rm(schemaDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  };
  await fs.writeFile(schemaPath, JSON.stringify(schema), "utf8");
  return { schemaPath, cleanup };
};

const normalizeInput = (
  input: unknown
): { readonly prompt: string; readonly images: string[] } => {
  if (typeof input === "string") {
    return { prompt: input, images: [] };
  }
  const promptParts: string[] = [];
  const images: string[] = [];
  if (Array.isArray(input)) {
    for (const item of input) {
      if (
        typeof item === "object" &&
        item !== null &&
        (item as { readonly type?: string }).type === "text" &&
        typeof (item as { readonly text?: unknown }).text === "string"
      ) {
        promptParts.push((item as { readonly text: string }).text);
      } else if (
        typeof item === "object" &&
        item !== null &&
        (item as { readonly type?: string }).type === "local_image" &&
        typeof (item as { readonly path?: unknown }).path === "string"
      ) {
        images.push((item as { readonly path: string }).path);
      }
    }
  }
  return { prompt: promptParts.join("\n\n"), images };
};

const buildConfigArguments = (
  overrides: readonly ConfigOverride[] | undefined,
  commandArgs: string[]
): void => {
  if (!overrides?.length) {
    return;
  }
  for (const override of overrides) {
    if (
      !override ||
      typeof override.key !== "string" ||
      typeof override.value !== "string"
    ) {
      continue;
    }
    const key = override.key.trim();
    if (!key) {
      continue;
    }
    commandArgs.push("--config", `${key}=${override.value}`);
  }
};

const buildExecCommandArgs = (args: PatchedExecArgs): string[] => {
  const commandArgs: string[] = ["exec", "--experimental-json"];
  if (args.model) {
    commandArgs.push("--model", args.model);
  }
  if (args.sandboxMode) {
    commandArgs.push("--sandbox", args.sandboxMode);
  }
  if (args.workingDirectory) {
    commandArgs.push("--cd", args.workingDirectory);
  }
  if (args.skipGitRepoCheck) {
    commandArgs.push("--skip-git-repo-check");
  }
  if (args.outputSchemaFile) {
    commandArgs.push("--output-schema", args.outputSchemaFile);
  }
  buildConfigArguments(args.configOverrides, commandArgs);
  if (args.images?.length) {
    for (const image of args.images) {
      commandArgs.push("--image", image);
    }
  }
  if (args.threadId) {
    commandArgs.push("resume", args.threadId);
  }
  return commandArgs;
};

const buildExecEnv = (args: PatchedExecArgs): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (!env[INTERNAL_ORIGINATOR_ENV]) {
    env[INTERNAL_ORIGINATOR_ENV] = TYPESCRIPT_SDK_ORIGINATOR;
  }
  if (args.baseUrl) {
    env.OPENAI_BASE_URL = args.baseUrl;
  }
  if (args.apiKey) {
    env.CODEX_API_KEY = args.apiKey;
  }
  return env;
};

const streamCodexExec = async function* (
  executablePath: string,
  commandArgs: string[],
  env: NodeJS.ProcessEnv,
  args: PatchedExecArgs
): AsyncGenerator<string, void, unknown> {
  const child = spawn(executablePath, commandArgs, { env });
  let spawnError: Error | null = null;
  child.once("error", (err) => {
    spawnError = err instanceof Error ? err : new Error(String(err));
  });
  if (!child.stdin) {
    child.kill();
    throw new Error("Child process has no stdin");
  }
  child.stdin.write(args.input);
  child.stdin.end();
  if (!child.stdout) {
    child.kill();
    throw new Error("Child process has no stdout");
  }
  const stderrChunks: Buffer[] = [];
  if (child.stderr) {
    child.stderr.on("data", (data) => stderrChunks.push(data));
  }
  const rl = readline.createInterface({
    input: child.stdout,
    crlfDelay: Number.POSITIVE_INFINITY,
  });
  try {
    for await (const line of rl) {
      yield line;
    }
    const exitCode = new Promise<void>((resolve, reject) => {
      child.once("exit", (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        const stderrBuffer = Buffer.concat(stderrChunks);
        reject(
          new Error(
            `Codex Exec exited with code ${code}: ${stderrBuffer.toString("utf8")}`
          )
        );
      });
    });
    if (spawnError) {
      throw spawnError;
    }
    await exitCode;
  } finally {
    rl.close();
    child.removeAllListeners();
    try {
      if (!child.killed) {
        child.kill();
      }
    } catch {
      // ignore kill errors
    }
  }
};

const patchedThreadRunStreamedInternal: ThreadRunStreamedInternal =
  async function* (input, turnOptions = {}) {
    const { schemaPath, cleanup } = await createOutputSchemaFile(
      turnOptions.outputSchema
    );
    const options = this._threadOptions;
    const { prompt, images } = normalizeInput(input);
    const execArgs: PatchedExecArgs = {
      input: prompt,
      baseUrl: this._options?.baseUrl,
      apiKey: this._options?.apiKey,
      threadId: this._id,
      images,
      model: options?.model,
      sandboxMode: options?.sandboxMode,
      workingDirectory: options?.workingDirectory,
      skipGitRepoCheck: options?.skipGitRepoCheck,
      outputSchemaFile: schemaPath,
    };
    const configOverrides: ConfigOverride[] = [];
    if (options?.model === MIGRATION_SANITIZE_MODEL_ID) {
      configOverrides.push({
        key: NOTICE_MODEL_MIGRATIONS_KEY,
        value: EMPTY_INLINE_TABLE_TOML,
      });
    }
    if (options?.modelReasoningEffort) {
      configOverrides.push({
        key: MODEL_REASONING_KEY,
        value: options.modelReasoningEffort,
      });
    }
    if (configOverrides.length > 0) {
      execArgs.configOverrides = configOverrides;
    }
    const generator = this._exec.run(execArgs);
    try {
      for await (const item of generator) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(item);
        } catch (error) {
          const parseError = new Error(`Failed to parse item: ${item}`);
          (parseError as Error & { cause?: unknown }).cause = error;
          throw parseError;
        }
        if (isThreadStartedEvent(parsed) && this._id === null) {
          this._id = parsed.thread_id;
        }
        yield parsed;
      }
    } finally {
      await cleanup();
    }
  };

export const patchCodexThreadPrototype = (
  ThreadCtor: ThreadConstructor
): void => {
  const prototype = ThreadCtor.prototype as unknown as {
    runStreamedInternal: ThreadRunStreamedInternal;
  } & { [THREAD_PATCHED]: boolean };
  if (prototype[THREAD_PATCHED]) {
    return;
  }
  prototype[THREAD_PATCHED] = true;
  prototype.runStreamedInternal = patchedThreadRunStreamedInternal;
};

const patchedExecRun = async function* (
  this: { readonly executablePath: string },
  args: PatchedExecArgs
) {
  const commandArgs = buildExecCommandArgs(args);
  const env = buildExecEnv(args);
  await Promise.resolve();
  yield* streamCodexExec(this.executablePath, commandArgs, env, args);
};

export const patchCodexExecRun = (execInstance: unknown): void => {
  if (!execInstance) {
    return;
  }
  const prototype = Object.getPrototypeOf(execInstance);
  if (!prototype || (prototype as { [EXEC_PATCHED]: boolean })[EXEC_PATCHED]) {
    return;
  }
  (prototype as { [EXEC_PATCHED]: boolean })[EXEC_PATCHED] = true;
  (prototype as { run: typeof patchedExecRun }).run = patchedExecRun;
};
