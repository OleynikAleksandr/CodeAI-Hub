const DESCRIPTION_PATH_RE =
  /^\.codeai-hub\/([^/]+)\/description\/description\.md$/;
const DESCRIPTION_RUN_PATH_RE =
  /^\.codeai-hub\/([^/]+)\/description\/runs\/([^/]+)\/description\.md$/;
const LEGACY_IDEA_PATH_RE =
  /^\.codeai-hub\/([^/]+)\/description\/idea\/idea\.md$/;
const LEGACY_IDEA_RUN_PATH_RE =
  /^\.codeai-hub\/([^/]+)\/description\/runs\/([^/]+)\/idea\/idea\.md$/;
const FALLBACK_PATH_SEGMENT_RE = /[^/]+$/;

export type QuestionnairePathTargets = {
  readonly primaryPath: string;
  readonly readFallbackPaths: readonly string[];
};

export const buildCanonicalQuestionnairePath = (
  workspaceSlug: string
): string => `.codeai-hub/${workspaceSlug}/description/questionnaire.md`;

const resolveCanonicalQuestionnairePath = (
  descriptionPath: string
): string | null => {
  const descriptionMatch = DESCRIPTION_PATH_RE.exec(descriptionPath);
  if (descriptionMatch) {
    return buildCanonicalQuestionnairePath(descriptionMatch[1]);
  }

  const runMatch = DESCRIPTION_RUN_PATH_RE.exec(descriptionPath);
  if (runMatch) {
    return buildCanonicalQuestionnairePath(runMatch[1]);
  }

  const legacyIdeaMatch = LEGACY_IDEA_PATH_RE.exec(descriptionPath);
  if (legacyIdeaMatch) {
    return buildCanonicalQuestionnairePath(legacyIdeaMatch[1]);
  }

  const legacyRunMatch = LEGACY_IDEA_RUN_PATH_RE.exec(descriptionPath);
  if (!legacyRunMatch) {
    return null;
  }
  return buildCanonicalQuestionnairePath(legacyRunMatch[1]);
};

const resolveFallbackQuestionnairePath = (descriptionPath: string): string =>
  descriptionPath.replace(FALLBACK_PATH_SEGMENT_RE, "questionnaire.md");

export const resolveQuestionnaireTargets = (
  descriptionPath: string
): QuestionnairePathTargets => {
  const primaryPath =
    resolveCanonicalQuestionnairePath(descriptionPath) ??
    resolveFallbackQuestionnairePath(descriptionPath);
  return { primaryPath, readFallbackPaths: [] };
};
