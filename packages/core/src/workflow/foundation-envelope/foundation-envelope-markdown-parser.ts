import { computeDiagramRevision } from "../diagram-dsl/markdown-dsl-parser";
import type {
  FoundationEnvelopeApplicationRoot,
  FoundationEnvelopeDecisionStatus,
  FoundationEnvelopeDependencyRules,
  FoundationEnvelopeIntegrationSeam,
  FoundationEnvelopeModel,
  FoundationEnvelopeParseResult,
  FoundationEnvelopeProductPart,
  FoundationEnvelopeSharedZone,
} from "./foundation-envelope-model";

const TOP_LEVEL_SECTION_RE = /^##\s+(.+)$/gm;
const EXPLICIT_PRODUCT_PART_RE = /^###\s+Product Part:\s+(.+)$/gm;
const EXPLICIT_SHARED_ZONE_RE = /^###\s+Shared Zone:\s+(.+)$/gm;
const EXPLICIT_INTEGRATION_SEAM_RE = /^###\s+Integration Seam:\s+(.+)$/gm;
const NUMBERED_ENTITY_RE = /^###\s+(?:\d+\.\s+)?(.+)$/gm;
const DOCUMENT_TITLE_RE = /^#\s+(.+)$/m;
const WHY_IT_MATTERS_RE = /^(?:Почему это важно|Why It Matters)\s*:\s+(.+)$/im;
const BACKTICK_VALUE_RE = /`([^`]+)`/g;
const PARAGRAPH_SPLIT_RE = /\n\s*\n/u;
const TABLE_SEPARATOR_RE = /^\|\s*[-:]+\s*\|/u;
const CONNECTS_WITH_RE = /(?:Соединяет|Connects?)\s+`([^`]+)`\s+с\s+`([^`]+)`/u;
const CONNECTS_AND_RE =
  /(?:Соединяет|Connects?)\s+`([^`]+)`\s+and\s+`([^`]+)`/u;

type SectionMap = Map<string, string>;
interface SectionBlock {
  readonly body: string;
  readonly id: string;
  readonly title: string;
}

const stripInlineMarkdown = (value: string): string =>
  value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();

const normalizeSectionTitle = (value: string): string =>
  stripInlineMarkdown(value).toLowerCase();

const slugify = (value: string): string =>
  stripInlineMarkdown(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeId = (value: string, fallback: string): string => {
  const slug = slugify(value);
  return slug.length > 0 ? slug : fallback;
};

const readTopLevelSections = (markdown: string): SectionMap => {
  const sections = new Map<string, string>();
  const matches = [...markdown.matchAll(TOP_LEVEL_SECTION_RE)];
  for (const [index, match] of matches.entries()) {
    const heading = match[1]?.trim();
    if (!heading) {
      continue;
    }
    const start = (match.index ?? 0) + match[0].length;
    const end =
      index + 1 < matches.length
        ? (matches[index + 1]?.index ?? markdown.length)
        : markdown.length;
    sections.set(
      normalizeSectionTitle(heading),
      markdown.slice(start, end).trim()
    );
  }
  return sections;
};

const readField = (block: string, label: string): string | null => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const value = block
    .match(new RegExp(`^\\s*(?:-\\s*)?${escaped}:\\s+(.+)$`, "im"))?.[1]
    ?.trim();
  return value ? stripInlineMarkdown(value) : null;
};

const readFirstParagraph = (block: string): string | null => {
  const paragraphs = block
    .split(PARAGRAPH_SPLIT_RE)
    .map((entry) => entry.trim())
    .filter(
      (entry) =>
        entry.length > 0 &&
        !entry.startsWith("### ") &&
        !entry.startsWith("|") &&
        !entry.startsWith("- ")
    );
  return paragraphs[0] ? stripInlineMarkdown(paragraphs[0]) : null;
};

const readBulletItems = (block: string): string[] =>
  block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => stripInlineMarkdown(line.slice(2)))
    .filter((line) => line.length > 0);

const readTableRows = (block: string): string[][] =>
  block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !TABLE_SEPARATOR_RE.test(line))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => stripInlineMarkdown(cell))
    )
    .filter(
      (cells) =>
        cells.length >= 3 &&
        normalizeSectionTitle(cells[0] ?? "") !== "product part"
    );

const inferDecisionStatus = (
  value: string | null
): FoundationEnvelopeDecisionStatus | null => {
  const normalized = value?.toLowerCase() ?? "";
  if (!normalized) {
    return null;
  }
  if (
    normalized.includes("open") ||
    normalized.includes("открыт") ||
    normalized.includes("не подтвержд")
  ) {
    return "open";
  }
  if (
    normalized.includes("proposed") ||
    normalized.includes("tentative") ||
    normalized.includes("planned") ||
    normalized.includes("предлага")
  ) {
    return "proposed";
  }
  if (
    normalized.includes("fixed") ||
    normalized.includes("confirmed") ||
    normalized.includes("зафиксирован") ||
    normalized.includes("подтвержд")
  ) {
    return "fixed";
  }
  return null;
};

const readSectionBlocks = (
  section: string,
  explicitPattern: RegExp
): readonly SectionBlock[] => {
  const explicitMatches = [...section.matchAll(explicitPattern)];
  const matches =
    explicitMatches.length > 0
      ? explicitMatches
      : [...section.matchAll(NUMBERED_ENTITY_RE)];
  return matches.map((match, index) => {
    const title = stripInlineMarkdown(match[1] ?? "Untitled");
    const start = (match.index ?? 0) + match[0].length;
    const end =
      index + 1 < matches.length
        ? (matches[index + 1]?.index ?? section.length)
        : section.length;
    return {
      id: normalizeId(match[1] ?? "", `entity-${index + 1}`),
      title,
      body: section.slice(start, end).trim(),
    };
  });
};

const readDocumentTitle = (markdown: string): string =>
  stripInlineMarkdown(
    markdown.match(DOCUMENT_TITLE_RE)?.[1] ?? "Foundation Envelope"
  );

const parseApplicationRoot = (
  markdown: string,
  section: string
): FoundationEnvelopeApplicationRoot => ({
  id: "application-root",
  title:
    readField(section, "Title") ??
    stripInlineMarkdown(
      readDocumentTitle(markdown).split(":").at(-1) ?? "Application Root"
    ),
  summary:
    readField(section, "Summary") ??
    readFirstParagraph(section) ??
    "Application root is defined in the envelope artifact.",
  shape: readField(section, "Shape"),
});

const parseProductParts = (
  section: string
): readonly FoundationEnvelopeProductPart[] => {
  const explicitBlocks = readSectionBlocks(section, EXPLICIT_PRODUCT_PART_RE);
  if (explicitBlocks.length > 0) {
    return explicitBlocks.map((block) => {
      const technology = readField(block.body, "Technology");
      return {
        id: block.id,
        title: readField(block.body, "Title") ?? block.title,
        purpose:
          readField(block.body, "Purpose") ??
          readFirstParagraph(block.body) ??
          "Product Part purpose is not specified yet.",
        runtimePlatform: readField(block.body, "Runtime / Platform"),
        technology,
        decisionStatus:
          inferDecisionStatus(readField(block.body, "Decision Status")) ??
          inferDecisionStatus(technology),
      };
    });
  }

  return readTableRows(section).map((row, index) => {
    const title = row[0] ?? `Product Part ${index + 1}`;
    const purpose = row[1] ?? "Product Part purpose is not specified yet.";
    const technology = row[2] ?? null;
    return {
      id: normalizeId(title, `product-part-${index + 1}`),
      title,
      purpose,
      runtimePlatform: null,
      technology,
      decisionStatus: inferDecisionStatus(technology),
    };
  });
};

const parseSharedZones = (
  section: string
): readonly FoundationEnvelopeSharedZone[] =>
  readSectionBlocks(section, EXPLICIT_SHARED_ZONE_RE).map((block, index) => ({
    id: block.id || `shared-zone-${index + 1}`,
    title: readField(block.body, "Title") ?? block.title,
    purpose:
      readField(block.body, "Purpose") ??
      readFirstParagraph(block.body) ??
      "Shared Zone purpose is not specified yet.",
    sharedWith:
      readField(block.body, "Shared With")
        ?.split(",")
        .map((value) => normalizeId(value, ""))
        .filter((value) => value.length > 0) ?? [],
    primaryOwner: readField(block.body, "Primary Owner"),
  }));

const readIntegrationEndpoints = (body: string): readonly string[] => {
  const directMatch =
    body.match(CONNECTS_WITH_RE) ?? body.match(CONNECTS_AND_RE);
  if (directMatch) {
    return [directMatch[1], directMatch[2]].map((value) =>
      normalizeId(value, "application-root")
    );
  }
  return [
    ...new Set([...body.matchAll(BACKTICK_VALUE_RE)].map((match) => match[1])),
  ]
    .slice(0, 2)
    .map((value) => normalizeId(value, "application-root"));
};

const parseIntegrationSeams = (
  section: string
): readonly FoundationEnvelopeIntegrationSeam[] =>
  readSectionBlocks(section, EXPLICIT_INTEGRATION_SEAM_RE).map(
    (block, index) => {
      const endpoints = readIntegrationEndpoints(block.body);
      const whyItMatters =
        readField(block.body, "Why It Matters") ??
        stripInlineMarkdown(block.body.match(WHY_IT_MATTERS_RE)?.[1] ?? "") ??
        readFirstParagraph(block.body) ??
        "Why this seam matters is not specified yet.";
      return {
        id: block.id || `integration-seam-${index + 1}`,
        title: readField(block.body, "Title") ?? block.title,
        from:
          readField(block.body, "From") ?? endpoints[0] ?? "application-root",
        to: readField(block.body, "To") ?? endpoints[1] ?? "application-root",
        kind: readField(block.body, "Kind"),
        whyItMatters,
        decisionStatus: inferDecisionStatus(
          readField(block.body, "Decision Status")
        ),
      };
    }
  );

const parseDependencyRules = (
  section: string
): FoundationEnvelopeDependencyRules => {
  const blocks = readSectionBlocks(section, /^###\s+(.+)$/gm);
  if (blocks.length === 0) {
    return { allowed: readBulletItems(section), forbidden: [] };
  }
  const allowed =
    blocks.find((block) => {
      const title = normalizeSectionTitle(block.title);
      return title.includes("разреш") || title.includes("allowed");
    })?.body ?? "";
  const forbidden =
    blocks.find((block) => {
      const title = normalizeSectionTitle(block.title);
      return title.includes("запрещ") || title.includes("forbidden");
    })?.body ?? "";
  return {
    allowed: readBulletItems(allowed),
    forbidden: readBulletItems(forbidden),
  };
};

export const parseFoundationEnvelopeMarkdown = (
  markdown: string
): FoundationEnvelopeParseResult => {
  if (markdown.trim().length === 0) {
    return {
      ok: false,
      error: {
        code: "empty-file",
        line: 1,
        message: "Foundation envelope markdown is empty.",
      },
      warnings: [],
    };
  }

  const sections = readTopLevelSections(markdown);
  const applicationRootSection = sections.get("application root");
  if (!applicationRootSection) {
    return {
      ok: false,
      error: {
        code: "missing-section",
        line: 1,
        message: "Missing 'Application Root' section.",
      },
      warnings: [],
    };
  }
  const productPartsSection = sections.get("product parts");
  if (!productPartsSection) {
    return {
      ok: false,
      error: {
        code: "missing-section",
        line: 1,
        message: "Missing 'Product Parts' section.",
      },
      warnings: [],
    };
  }

  const model: FoundationEnvelopeModel = {
    version: 1,
    stage: "foundation_envelope",
    title: readDocumentTitle(markdown),
    updated: readField(markdown, "Updated"),
    revision: computeDiagramRevision(markdown),
    applicationRoot: parseApplicationRoot(markdown, applicationRootSection),
    productParts: parseProductParts(productPartsSection),
    sharedZones: parseSharedZones(sections.get("shared zones") ?? ""),
    integrationSeams: parseIntegrationSeams(
      sections.get("integration seams") ?? ""
    ),
    placementRules: readBulletItems(sections.get("placement rules") ?? ""),
    dependencyRules: parseDependencyRules(
      sections.get("dependency rules") ?? ""
    ),
    openDecisions: readBulletItems(sections.get("open decisions") ?? ""),
  };

  return {
    ok: true,
    value: model,
    warnings:
      model.productParts.length > 0
        ? []
        : ["No Product Parts were parsed from the artifact."],
  };
};
