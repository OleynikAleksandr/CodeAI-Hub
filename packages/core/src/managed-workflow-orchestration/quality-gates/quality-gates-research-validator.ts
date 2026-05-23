import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export interface QualityGatesResearchValidationRequest {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

const REQUIRED_RECOMMENDATION_PURPOSES = new Set([
  "architecture",
  "build",
  "ci",
  "dependency-audit",
  "format",
  "hooks",
  "lint",
  "security",
  "test",
  "typecheck",
]);
const REQUIRED_RESEARCH_MARKDOWN_HEADING = "# Quality Gates Research";
const NEWLINE_RE = /\r?\n/u;

const researchPath = (
  workspaceSlug: string,
  fileName: "quality-gates-research.json" | "quality-gates-research.md"
): string => `.codeai-hub/${workspaceSlug}/quality_gates/${fileName}`;

const readRequiredFile = async (
  absolutePath: string
): Promise<string | null> => {
  const fileStat = await stat(absolutePath).catch(() => null);
  return fileStat?.isFile()
    ? readFile(absolutePath, "utf8").catch(() => null)
    : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const readStringArray = (value: unknown): readonly string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => hasString(item))
    : [];

const collectSourceDiagnostics = (sources: unknown): readonly string[] => {
  if (!Array.isArray(sources) || sources.length < 1) {
    return ["research_sources_missing"];
  }
  return sources.flatMap((source, index) => {
    if (!isRecord(source)) {
      return [`research_source_invalid:${index}`];
    }
    const errors: string[] = [];
    for (const key of [
      "title",
      "url",
      "sourceType",
      "retrievedAt",
      "whyRelevant",
    ]) {
      if (!hasString(source[key])) {
        errors.push(`research_source_missing_${key}:${index}`);
      }
    }
    return errors;
  });
};

const collectRecommendationDiagnostics = (
  recommendations: unknown
): readonly string[] => {
  if (!Array.isArray(recommendations) || recommendations.length < 1) {
    return ["research_recommendations_missing"];
  }
  return recommendations.flatMap((recommendation, index) => {
    if (!isRecord(recommendation)) {
      return [`research_recommendation_invalid:${index}`];
    }
    const errors: string[] = [];
    for (const key of ["recommendation", "whyUse", "tradeoff"]) {
      if (!hasString(recommendation[key])) {
        errors.push(`research_recommendation_missing_${key}:${index}`);
      }
    }
    if (!REQUIRED_RECOMMENDATION_PURPOSES.has(String(recommendation.purpose))) {
      errors.push(`research_recommendation_invalid_purpose:${index}`);
    }
    if (readStringArray(recommendation.sourceUrls).length < 1) {
      errors.push(`research_recommendation_missing_sourceUrls:${index}`);
    }
    if (readStringArray(recommendation.requiredChecks).length < 1) {
      errors.push(`research_recommendation_missing_requiredChecks:${index}`);
    }
    if (typeof recommendation.userApprovalRequired !== "boolean") {
      errors.push(
        `research_recommendation_missing_userApprovalRequired:${index}`
      );
    }
    return errors;
  });
};

const parseResearchJson = (
  content: string | null
): {
  readonly diagnostics: readonly string[];
  readonly value: Record<string, unknown> | null;
} => {
  if (!content) {
    return {
      diagnostics: ["missing_quality_gates_research_json"],
      value: null,
    };
  }
  try {
    const parsed = JSON.parse(content) as unknown;
    return isRecord(parsed)
      ? { diagnostics: [], value: parsed }
      : { diagnostics: ["research_json_root_not_object"], value: null };
  } catch (error) {
    return {
      diagnostics: [
        `research_json_parse_error:${error instanceof Error ? error.message : String(error)}`,
      ],
      value: null,
    };
  }
};

const hasRequiredResearchMarkdownHeading = (content: string): boolean =>
  content
    .split(NEWLINE_RE)
    .some((line) => line.trim() === REQUIRED_RESEARCH_MARKDOWN_HEADING);

const collectResearchMarkdownDiagnostics = (
  content: string | null
): readonly string[] => {
  if (!content?.trim()) {
    return ["missing_quality_gates_research_markdown"];
  }
  return hasRequiredResearchMarkdownHeading(content)
    ? []
    : ["research_markdown_missing_required_heading"];
};

export const validateQualityGatesResearchArtifacts = async (
  request: QualityGatesResearchValidationRequest
): Promise<readonly string[]> => {
  const markdown = await readRequiredFile(
    path.join(
      request.workspaceRoot,
      researchPath(request.workspaceSlug, "quality-gates-research.md")
    )
  );
  const parsed = parseResearchJson(
    await readRequiredFile(
      path.join(
        request.workspaceRoot,
        researchPath(request.workspaceSlug, "quality-gates-research.json")
      )
    )
  );
  const errors = [...parsed.diagnostics];
  errors.push(...collectResearchMarkdownDiagnostics(markdown));
  const research = parsed.value;
  if (!research) {
    return errors;
  }
  if (research.schema !== "codeai-quality-gates-research-v1") {
    errors.push("research_schema_invalid");
  }
  if (!hasString(research.stackSummary)) {
    errors.push("research_stackSummary_missing");
  }
  errors.push(...collectSourceDiagnostics(research.sources));
  errors.push(...collectRecommendationDiagnostics(research.recommendations));
  return errors;
};
