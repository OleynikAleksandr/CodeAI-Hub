import path from "node:path";

const NON_ALPHANUMERIC_REGEX = /[^a-zA-Z0-9]/g;
const MULTIPLE_DASHES_REGEX = /-+/g;
const TRAILING_DASH_REGEX = /-$/;

const sanitizeSegment = (input: string): string =>
  input
    .replace(NON_ALPHANUMERIC_REGEX, "-")
    .replace(MULTIPLE_DASHES_REGEX, "-")
    .replace(TRAILING_DASH_REGEX, "")
    .trim() || "unknown";

export type ContinuityReportPathOptions = {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly nodeId: string;
  readonly role: string;
  readonly providerId: string;
  readonly timestamp: string;
};

export type ContinuityReportPaths = {
  readonly reportPath: string;
  readonly tmpReportPath: string;
};

export const buildContinuityReportPaths = (
  options: ContinuityReportPathOptions
): ContinuityReportPaths => {
  const nodeId = sanitizeSegment(options.nodeId);
  const role = sanitizeSegment(options.role);
  const providerId = sanitizeSegment(options.providerId);

  const fileBase = `${options.timestamp}-${role}-${providerId}`;
  const baseDir = path.join(
    options.workspaceRoot,
    ".codeai-hub",
    options.workspaceSlug,
    "flow",
    "nodes",
    nodeId,
    "continuity",
    "reports"
  );

  return {
    reportPath: path.join(baseDir, `${fileBase}.md`),
    tmpReportPath: path.join(baseDir, `${fileBase}.tmp.md`),
  };
};
