import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DevelopmentTreeDetectedNode } from "./development-tree-node-detector";
import type { DevelopmentTreeDraftFileName } from "./draft-template-registry";
import { DraftTemplateRegistry } from "./draft-template-registry";

export type DevelopmentTreeDraftWriteAction =
  | "created"
  | "unchanged"
  | "updated";

export interface DevelopmentTreeWrittenDraft {
  readonly absolutePath: string;
  readonly action: DevelopmentTreeDraftWriteAction;
  readonly fileName: DevelopmentTreeDraftFileName;
  readonly relativePath: string;
}

export interface DevelopmentTreeDraftWriterRequest {
  readonly derivedHash?: string;
  readonly generatedAt?: Date | string;
  readonly node: DevelopmentTreeDetectedNode;
}

export interface DevelopmentTreeDraftWriterResult {
  readonly drafts: readonly DevelopmentTreeWrittenDraft[];
  readonly node: DevelopmentTreeDetectedNode;
}

const AGENT_FILL_BLOCK_PATTERN =
  /<!-- agent-fill -->[\s\S]*?<!-- \/agent-fill -->/g;

const readExistingFile = async (absolutePath: string): Promise<string | null> =>
  readFile(absolutePath, "utf8").catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  });

const buildNodeDerivedHash = (node: DevelopmentTreeDetectedNode): string => {
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        clusterId: node.clusterId ?? null,
        id: node.id,
        kind: node.kind,
        partId: node.partId,
        relativePath: node.relativePath,
      })
    )
    .digest("hex");
  return `sha256:${digest}`;
};

const preserveAgentFillBlocks = (
  existingContent: string,
  renderedContent: string
): string => {
  const existingBlocks = existingContent.match(AGENT_FILL_BLOCK_PATTERN) ?? [];
  let blockIndex = 0;
  return renderedContent.replace(AGENT_FILL_BLOCK_PATTERN, (renderedBlock) => {
    const existingBlock = existingBlocks[blockIndex];
    blockIndex += 1;
    return existingBlock ?? renderedBlock;
  });
};

const writeDraftContent = async (
  absolutePath: string,
  renderedContent: string
): Promise<DevelopmentTreeDraftWriteAction> => {
  const existingContent = await readExistingFile(absolutePath);
  if (existingContent === null) {
    await writeFile(absolutePath, renderedContent, "utf8");
    return "created";
  }
  const nextContent = preserveAgentFillBlocks(existingContent, renderedContent);
  if (nextContent === existingContent) {
    return "unchanged";
  }
  await writeFile(absolutePath, nextContent, "utf8");
  return "updated";
};

export class DraftWriter {
  private readonly templateRegistry = new DraftTemplateRegistry();

  async writeDrafts(
    request: DevelopmentTreeDraftWriterRequest
  ): Promise<DevelopmentTreeDraftWriterResult> {
    await mkdir(request.node.absolutePath, { recursive: true });
    const renderedDrafts = this.templateRegistry.renderDrafts({
      derivedHash: request.derivedHash ?? buildNodeDerivedHash(request.node),
      generatedAt: request.generatedAt ?? new Date(),
      node: request.node,
    });
    const drafts: DevelopmentTreeWrittenDraft[] = [];
    for (const renderedDraft of renderedDrafts) {
      const absolutePath = path.join(
        request.node.absolutePath,
        renderedDraft.fileName
      );
      drafts.push({
        absolutePath,
        action: await writeDraftContent(absolutePath, renderedDraft.content),
        fileName: renderedDraft.fileName,
        relativePath: path.posix.join(
          request.node.relativePath,
          renderedDraft.fileName
        ),
      });
    }
    return {
      drafts,
      node: request.node,
    };
  }
}
