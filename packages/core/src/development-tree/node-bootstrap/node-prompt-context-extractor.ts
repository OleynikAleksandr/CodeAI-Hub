import type { DevelopmentTreeDetectedNode } from "./development-tree-node-detector";

export interface NodePromptSourceArtifact {
  readonly content: string;
  readonly label: string;
  readonly relativePath: string;
}

export interface NodePromptContextEntry {
  readonly anchors?: readonly string[];
  readonly content: string;
  readonly label: string;
  readonly relativePath: string;
  readonly score?: number;
  readonly truncated: boolean;
}

export interface NodePromptContextExtractorRequest {
  readonly artifacts: readonly NodePromptSourceArtifact[];
  readonly node: DevelopmentTreeDetectedNode;
}

interface AnchorSpec {
  readonly label: string;
  readonly normalized: string;
  readonly weight: number;
}

interface ScoredBlock {
  readonly anchors: readonly string[];
  readonly content: string;
  readonly label: string;
  readonly relativePath: string;
  readonly score: number;
  readonly sourceIndex: number;
  readonly truncated: boolean;
}

interface ProtectedContextEntry {
  readonly content: string;
  readonly label: string;
  readonly relativePath: string;
  readonly sourceIndex: number;
  readonly truncated: false;
}

const BLOCK_START_RE =
  /^(#{1,6}\s+.+|(Product Part|Cluster|Module|Standalone Module):\s+.+)$/i;
const NON_WORD_RE = /[^a-z0-9]+/gi;
const WHITESPACE_RE = /\s+/g;
const LINE_BREAK_RE = /\r?\n/;
const MAX_CONTEXT_ENTRIES = 8;
const MAX_CONTEXT_CHARS = 2200;
const MAX_CONTEXT_BLOCKS_PER_ARTIFACT = 3;
const MIN_ANCHOR_LENGTH = 3;

const normalizeForMatch = (value: string): string =>
  ` ${value.toLowerCase().replace(NON_WORD_RE, " ").replace(WHITESPACE_RE, " ").trim()} `;

const humanizeId = (value: string): string =>
  value.replace(NON_WORD_RE, " ").replace(WHITESPACE_RE, " ").trim();

const addAnchor = (
  anchors: AnchorSpec[],
  seen: Set<string>,
  value: string | undefined,
  label: string,
  weight: number
): void => {
  const normalized = normalizeForMatch(value ?? "");
  if (normalized.trim().length < MIN_ANCHOR_LENGTH || seen.has(normalized)) {
    return;
  }
  seen.add(normalized);
  anchors.push({ label, normalized, weight });
};

const createAnchorSpecs = (node: DevelopmentTreeDetectedNode): AnchorSpec[] => {
  const anchors: AnchorSpec[] = [];
  const seen = new Set<string>();
  const nodeWeight = node.kind === "product_part" ? 90 : 80;
  const clusterWeight = node.kind === "cluster" ? 85 : 45;
  addAnchor(anchors, seen, node.id, "node id", nodeWeight);
  addAnchor(anchors, seen, humanizeId(node.id), "node title", nodeWeight);
  addAnchor(anchors, seen, node.partId, "product part id", 35);
  addAnchor(anchors, seen, humanizeId(node.partId), "product part title", 35);
  if (node.clusterId) {
    addAnchor(anchors, seen, node.clusterId, "cluster id", clusterWeight);
    addAnchor(
      anchors,
      seen,
      humanizeId(node.clusterId),
      "cluster title",
      clusterWeight
    );
  }
  return anchors;
};

const splitMarkdownBlocks = (content: string): readonly string[] => {
  const blocks: string[] = [];
  let current: string[] = [];
  for (const line of content.split(LINE_BREAK_RE)) {
    if (BLOCK_START_RE.test(line) && current.length > 0) {
      blocks.push(current.join("\n").trim());
      current = [];
    }
    current.push(line);
  }
  const tail = current.join("\n").trim();
  if (tail) {
    blocks.push(tail);
  }
  return blocks.length > 0 ? blocks : [content.trim()];
};

const scoreBlock = (
  block: string,
  anchors: readonly AnchorSpec[]
): { readonly anchors: readonly string[]; readonly score: number } => {
  const normalizedBlock = normalizeForMatch(block);
  const matchedAnchors: string[] = [];
  let score = 0;
  for (const anchor of anchors) {
    if (normalizedBlock.includes(anchor.normalized)) {
      score += anchor.weight;
      matchedAnchors.push(anchor.label);
    }
  }
  return { anchors: matchedAnchors, score };
};

const createEntry = (
  artifact: NodePromptSourceArtifact,
  block: string,
  sourceIndex: number,
  score: number,
  anchors: readonly string[]
): ScoredBlock => {
  const normalizedContent = block.trim();
  const truncated = normalizedContent.length > MAX_CONTEXT_CHARS;
  const content = truncated
    ? normalizedContent.slice(0, MAX_CONTEXT_CHARS).trimEnd()
    : normalizedContent;
  return {
    anchors,
    content,
    label: artifact.label,
    relativePath: artifact.relativePath,
    score,
    sourceIndex,
    truncated,
  };
};

const byScoreThenSource = (left: ScoredBlock, right: ScoredBlock): number => {
  if (right.score !== left.score) {
    return right.score - left.score;
  }
  return left.sourceIndex - right.sourceIndex;
};

const isExactProductPartMarkdown = (
  artifact: NodePromptSourceArtifact,
  node: DevelopmentTreeDetectedNode
): boolean =>
  node.kind === "product_part" &&
  artifact.relativePath.endsWith(
    `/diagram_modules/product-parts/${node.partId}.md`
  );

const isProtectedTechnicalRootArtifact = (
  artifact: NodePromptSourceArtifact
): boolean =>
  artifact.relativePath.endsWith(
    "/application_skeleton/application-skeleton-map.json"
  ) || artifact.relativePath.endsWith("/quality_gates/quality-gates.json");

export class NodePromptContextExtractor {
  extract(
    request: NodePromptContextExtractorRequest
  ): readonly NodePromptContextEntry[] {
    const anchors = createAnchorSpecs(request.node);
    const protectedEntries: ProtectedContextEntry[] = [];
    const scoredBlocks: ScoredBlock[] = [];
    for (const [sourceIndex, artifact] of request.artifacts.entries()) {
      if (
        isExactProductPartMarkdown(artifact, request.node) ||
        isProtectedTechnicalRootArtifact(artifact)
      ) {
        protectedEntries.push({
          content: artifact.content.trim(),
          label: artifact.label,
          relativePath: artifact.relativePath,
          sourceIndex,
          truncated: false,
        });
        continue;
      }
      const artifactBlocks: ScoredBlock[] = [];
      for (const block of splitMarkdownBlocks(artifact.content)) {
        const scored = scoreBlock(block, anchors);
        if (scored.score <= 0) {
          continue;
        }
        artifactBlocks.push(
          createEntry(
            artifact,
            block,
            sourceIndex,
            scored.score,
            scored.anchors
          )
        );
      }
      artifactBlocks.sort(byScoreThenSource);
      scoredBlocks.push(
        ...artifactBlocks.slice(0, MAX_CONTEXT_BLOCKS_PER_ARTIFACT)
      );
    }
    scoredBlocks.sort(byScoreThenSource);
    const remainingEntryCount = Math.max(
      0,
      MAX_CONTEXT_ENTRIES - protectedEntries.length
    );
    return [
      ...protectedEntries
        .sort((left, right) => left.sourceIndex - right.sourceIndex)
        .map((entry) => ({
          content: entry.content,
          label: entry.label,
          relativePath: entry.relativePath,
          truncated: entry.truncated,
        })),
      ...scoredBlocks.slice(0, remainingEntryCount).map((block) => ({
        anchors: block.anchors,
        content: block.content,
        label: block.label,
        relativePath: block.relativePath,
        score: block.score,
        truncated: block.truncated,
      })),
    ];
  }
}
