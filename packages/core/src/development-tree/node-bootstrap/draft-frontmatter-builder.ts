import type { DevelopmentTreeDetectedNode } from "./development-tree-node-detector";

export interface DraftFrontmatterBuildRequest {
  readonly derivedHash: string;
  readonly generatedAt: Date | string;
  readonly node: DevelopmentTreeDetectedNode;
}

const formatYamlString = (value: string): string => JSON.stringify(value);

const formatGeneratedAt = (generatedAt: Date | string): string =>
  generatedAt instanceof Date ? generatedAt.toISOString() : generatedAt;

export class DraftFrontmatterBuilder {
  build(request: DraftFrontmatterBuildRequest): string {
    const lines = [
      "---",
      "status: draft",
      `derivedFrom: ${formatYamlString(request.node.relativePath)}`,
      `derivedHash: ${formatYamlString(request.derivedHash)}`,
      `generatedAt: ${formatYamlString(formatGeneratedAt(request.generatedAt))}`,
      "agentTouched: false",
      "outdated: false",
      "orphaned: false",
      "---",
    ];
    return `${lines.join("\n")}\n`;
  }
}
