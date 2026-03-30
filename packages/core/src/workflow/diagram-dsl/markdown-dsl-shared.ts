import type {
  MarkdownDslParseError,
  MarkdownDslParseResult,
  MarkdownDslParseWarning,
} from "./diagram-dsl-types";

const SECTION_RE = /^## (.+)$/;
const KEY_VALUE_RE = /^- ([^:]+):\s*(.*)$/;
const LIST_ITEM_RE = /^ {2}- (.+)$/;
const REVISION_FIELD_RE = /^- Revision:\s*([a-f0-9]{8})$/m;
const KNOWN_SECTIONS = new Set([
  "Metadata",
  "Modules",
  "Relations",
  "Facades",
  "Facade Relations",
]);

type NodeRequireLike = (specifier: string) => {
  readonly createHash: (algorithm: string) => {
    update(input: string): { digest(format: "hex"): string };
  };
};

const resolveNodeRequire = (): NodeRequireLike | null => {
  try {
    const candidate = Function(
      "return typeof require === 'function' ? require : null;"
    )() as unknown;
    return typeof candidate === "function"
      ? (candidate as NodeRequireLike)
      : null;
  } catch {
    return null;
  }
};

export interface Line {
  readonly number: number;
  readonly text: string;
}
export interface Block {
  readonly id: string;
  readonly line: number;
  readonly lines: readonly Line[];
}
export interface Fields {
  readonly lists: ReadonlyMap<string, readonly string[]>;
  readonly notes?: string;
  readonly rationale?: string;
  readonly scalars: ReadonlyMap<string, string>;
}

const stripUtf8Bom = (content: string): string =>
  content.startsWith("\uFEFF") ? content.slice(1) : content;

export const toLines = (content: string): readonly Line[] =>
  stripUtf8Bom(content)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((text, index) => ({ number: index + 1, text }));

const normalizeMarkdownDsl = (content: string): string => {
  const out: string[] = [];
  let lastBlank = false;

  for (const line of stripUtf8Bom(content)
    .replace(/\r\n?/g, "\n")
    .split("\n")) {
    const trimmed = line.trimEnd();
    const blank = trimmed.trim().length === 0;
    if (blank) {
      if (!lastBlank) {
        out.push("");
      }
      lastBlank = true;
      continue;
    }
    lastBlank = false;
    out.push(trimmed);
  }

  return out.join("\n").trim();
};

export const computeDiagramRevision = (content: string): string =>
  (() => {
    const normalized = normalizeMarkdownDsl(
      content
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("- Revision:"))
        .join("\n")
    );

    const nodeRequire = resolveNodeRequire();
    if (nodeRequire) {
      return nodeRequire("node:crypto")
        .createHash("sha256")
        .update(normalized)
        .digest("hex")
        .slice(0, 8);
    }

    return REVISION_FIELD_RE.exec(content)?.[1] ?? "00000000";
  })();

export const buildParseFailure = (
  code: MarkdownDslParseError["code"],
  line: number,
  message: string,
  warnings: readonly MarkdownDslParseWarning[] = []
): MarkdownDslParseResult => ({
  ok: false,
  error: { code, line, message },
  warnings,
});

export const isOneOf = <T extends string>(
  value: string,
  allowed: readonly T[]
): value is T => allowed.includes(value as T);

export const collectSections = (
  lines: readonly Line[],
  warnings: MarkdownDslParseWarning[]
): ReadonlyMap<string, readonly Line[]> => {
  const sections = new Map<string, readonly Line[]>();
  let current: string | null = null;
  let start = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const name = SECTION_RE.exec(lines[index]?.text.trim() ?? "")?.[1]?.trim();
    if (!name) {
      continue;
    }
    if (current && start >= 0) {
      sections.set(current, lines.slice(start, index));
    }
    if (!KNOWN_SECTIONS.has(name)) {
      warnings.push({
        code: "unknown-section",
        line: lines[index]?.number ?? index + 1,
        message: `Unknown section: ${name}`,
      });
      current = null;
      start = -1;
      continue;
    }
    current = name;
    start = index + 1;
  }

  if (current && start >= 0) {
    sections.set(current, lines.slice(start));
  }
  return sections;
};

export const collectBlocks = (
  lines: readonly Line[],
  pattern: RegExp,
  warnings: MarkdownDslParseWarning[]
): readonly Block[] => {
  const blocks: { id: string; line: number; lines: Line[] }[] = [];
  let current: { id: string; line: number; lines: Line[] } | null = null;

  for (const line of lines) {
    const trimmed = line.text.trim();
    const headerId = pattern.exec(trimmed)?.[1]?.trim();
    if (headerId) {
      if (current) {
        blocks.push(current);
      }
      current = { id: headerId, line: line.number, lines: [] };
      continue;
    }
    if (trimmed.startsWith("### ")) {
      warnings.push({
        code: "unknown-entity-header",
        line: line.number,
        message: `Unknown entity header: ${trimmed}`,
      });
      current = null;
      continue;
    }
    if (current) {
      current.lines.push(line);
    }
  }

  if (current) {
    blocks.push(current);
  }
  return blocks;
};

const readTextBlock = (
  lines: readonly Line[],
  startIndex: number
): { readonly nextIndex: number; readonly value?: string } => {
  const values: string[] = [];
  let cursor = startIndex + 1;

  while (cursor < lines.length) {
    const next = lines[cursor]?.text.trim() ?? "";
    if (KEY_VALUE_RE.test(next) || next === "Notes:" || next === "Rationale:") {
      break;
    }
    values.push(lines[cursor]?.text.trimEnd() ?? "");
    cursor += 1;
  }

  const value = values.join("\n").trim() || undefined;
  return { nextIndex: cursor - 1, value };
};

const readListItems = (
  lines: readonly Line[],
  startIndex: number
): { readonly nextIndex: number; readonly items: readonly string[] } => {
  const items: string[] = [];
  let cursor = startIndex + 1;

  while (cursor < lines.length) {
    const item = LIST_ITEM_RE.exec(lines[cursor]?.text ?? "")?.[1]?.trim();
    if (!item) {
      break;
    }
    items.push(item);
    cursor += 1;
  }

  return { nextIndex: cursor - 1, items };
};

export const parseFields = (
  block: Block,
  warnings: MarkdownDslParseWarning[]
): Fields => {
  const scalars = new Map<string, string>();
  const lists = new Map<string, readonly string[]>();
  let notes: string | undefined;
  let rationale: string | undefined;

  for (let index = 0; index < block.lines.length; index += 1) {
    const line = block.lines[index];
    const trimmed = line?.text.trim() ?? "";
    if (!trimmed) {
      continue;
    }
    if (trimmed === "Notes:") {
      const textBlock = readTextBlock(block.lines, index);
      notes = textBlock.value;
      index = textBlock.nextIndex;
      continue;
    }
    if (trimmed === "Rationale:") {
      const textBlock = readTextBlock(block.lines, index);
      rationale = textBlock.value;
      index = textBlock.nextIndex;
      continue;
    }

    const match = KEY_VALUE_RE.exec(trimmed);
    if (!match) {
      warnings.push({
        code: "malformed-line",
        line: line?.number ?? block.line,
        message: `Malformed entity line: ${trimmed}`,
      });
      continue;
    }

    const key = match[1]?.trim() ?? "";
    const scalarValue = match[2]?.trim() ?? "";
    const listItems = readListItems(block.lines, index);
    if (listItems.items.length > 0) {
      lists.set(key, listItems.items);
      index = listItems.nextIndex;
      continue;
    }
    scalars.set(key, scalarValue);
  }

  return { scalars, lists, notes, rationale };
};

export const parseEntityCollection = <T extends { readonly id: string }>(
  blocks: readonly Block[],
  warnings: MarkdownDslParseWarning[],
  parser: (
    block: Block,
    blockWarnings: MarkdownDslParseWarning[]
  ) => T | MarkdownDslParseError,
  duplicateLabel: string
): readonly T[] | MarkdownDslParseResult => {
  const ids = new Set<string>();
  const values: T[] = [];

  for (const block of blocks) {
    const parsed = parser(block, warnings);
    if ("code" in parsed) {
      return { ok: false, error: parsed, warnings };
    }
    if (ids.has(parsed.id)) {
      return buildParseFailure(
        "duplicate-entity-id",
        block.line,
        `Duplicate ${duplicateLabel} id: ${parsed.id}`,
        warnings
      );
    }
    ids.add(parsed.id);
    values.push(parsed);
  }

  return values;
};
