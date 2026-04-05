import { readFile } from "node:fs/promises";
import {
  type RolloutResolverOptions,
  resolveRolloutFilePath,
} from "../token-usage/codex-token-usage-resolver";

const JSONL_LINE_RE = /^\s*\{/;

const parseJsonlLines = (content: string): string[] =>
  content.split(/\r?\n/gu).filter((line) => JSONL_LINE_RE.test(line));

const parseEntries = (
  lines: readonly string[],
  sinceLine: number
): unknown[] => {
  const entries: unknown[] = [];
  const startIndex = Math.max(0, Math.min(sinceLine, lines.length));
  for (const line of lines.slice(startIndex)) {
    try {
      entries.push(JSON.parse(line) as unknown);
    } catch {
      // Ignore malformed lines; the rollout file may still be mid-write.
    }
  }
  return entries;
};

export interface CodexRolloutReadParams {
  readonly providerSessionId: string;
  readonly sinceLine?: number;
}

export interface CodexRolloutReadResult {
  readonly entries: readonly unknown[];
  readonly filePath: string;
  readonly nextLine: number;
}

export class CodexRolloutReader {
  private readonly options: RolloutResolverOptions;

  constructor(options?: RolloutResolverOptions) {
    this.options = options ?? {};
  }

  async readAppendedEntries(
    params: CodexRolloutReadParams
  ): Promise<CodexRolloutReadResult | null> {
    const filePath = await resolveRolloutFilePath(params.providerSessionId, {
      codexHome: this.options.codexHome,
    });
    if (!filePath) {
      return null;
    }

    const content = await this.readRolloutFile(filePath);
    const lines = parseJsonlLines(content);
    return {
      entries: parseEntries(lines, params.sinceLine ?? 0),
      filePath,
      nextLine: lines.length,
    };
  }

  private async readRolloutFile(filePath: string): Promise<string> {
    try {
      return await readFile(filePath, "utf8");
    } catch {
      return "";
    }
  }
}
