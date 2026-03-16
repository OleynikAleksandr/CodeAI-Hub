import { computeDiagramRevision as computeRevision } from "./markdown-dsl-shared";

const REVISION_LINE_RE = /^- Revision: .+$/m;

export const DIAGRAM_REVISION_PLACEHOLDER = "00000000";

export const replaceDiagramRevision = (
  content: string,
  revision: string
): string => {
  const revisionLine = `- Revision: ${revision}`;
  return REVISION_LINE_RE.test(content)
    ? content.replace(REVISION_LINE_RE, revisionLine)
    : content;
};

export const materializeDiagramRevision = (
  content: string
): { readonly revision: string; readonly content: string } => {
  const revision = computeRevision(content);
  return {
    revision,
    content: replaceDiagramRevision(content, revision),
  };
};

export {
  computeDiagramRevision,
  normalizeMarkdownDsl,
} from "./markdown-dsl-shared";
