const DESCRIPTION_PATH_RE =
  /^\.codeai-hub\/([^/]+)\/description\/description\.md$/;
const DESCRIPTION_RUN_PATH_RE =
  /^\.codeai-hub\/([^/]+)\/description\/runs\/([^/]+)\/description\.md$/;
const LEGACY_IDEA_PATH_RE =
  /^\.codeai-hub\/([^/]+)\/description\/idea\/idea\.md$/;
const LEGACY_IDEA_RUN_PATH_RE =
  /^\.codeai-hub\/([^/]+)\/description\/runs\/([^/]+)\/idea\/idea\.md$/;
const FALLBACK_PATH_SEGMENT_RE = /[^/]+$/;

type QuestionnairePathSet = {
  readonly canonical: string;
  readonly legacyReadPaths: readonly string[];
};

export type QuestionnairePathTargets = {
  readonly primaryPath: string;
  readonly readFallbackPaths: readonly string[];
};

export const buildCanonicalQuestionnairePath = (
  workspaceSlug: string
): string => `.codeai-hub/${workspaceSlug}/description/questionnaire.md`;

const buildLegacyInitiativeQuestionnairePath = (
  workspaceSlug: string
): string => `.codeai-hub/${workspaceSlug}/description/idea/questionnaire.md`;

const buildLegacyRunQuestionnairePath = (
  workspaceSlug: string,
  runSlug: string
): string =>
  `.codeai-hub/${workspaceSlug}/description/runs/${runSlug}/idea/questionnaire.md`;

const resolveQuestionnairePaths = (
  descriptionPath: string
): QuestionnairePathSet | null => {
  const descriptionMatch = DESCRIPTION_PATH_RE.exec(descriptionPath);
  if (descriptionMatch) {
    const workspaceSlug = descriptionMatch[1];
    return {
      canonical: buildCanonicalQuestionnairePath(workspaceSlug),
      legacyReadPaths: [buildLegacyInitiativeQuestionnairePath(workspaceSlug)],
    };
  }

  const runMatch = DESCRIPTION_RUN_PATH_RE.exec(descriptionPath);
  if (runMatch) {
    const workspaceSlug = runMatch[1];
    const runSlug = runMatch[2];
    return {
      canonical: buildCanonicalQuestionnairePath(workspaceSlug),
      legacyReadPaths: [
        buildLegacyRunQuestionnairePath(workspaceSlug, runSlug),
        buildLegacyInitiativeQuestionnairePath(workspaceSlug),
      ],
    };
  }

  const legacyIdeaMatch = LEGACY_IDEA_PATH_RE.exec(descriptionPath);
  if (legacyIdeaMatch) {
    const workspaceSlug = legacyIdeaMatch[1];
    return {
      canonical: buildCanonicalQuestionnairePath(workspaceSlug),
      legacyReadPaths: [buildLegacyInitiativeQuestionnairePath(workspaceSlug)],
    };
  }

  const legacyRunMatch = LEGACY_IDEA_RUN_PATH_RE.exec(descriptionPath);
  if (!legacyRunMatch) {
    return null;
  }
  const workspaceSlug = legacyRunMatch[1];
  const runSlug = legacyRunMatch[2];
  return {
    canonical: buildCanonicalQuestionnairePath(workspaceSlug),
    legacyReadPaths: [
      buildLegacyRunQuestionnairePath(workspaceSlug, runSlug),
      buildLegacyInitiativeQuestionnairePath(workspaceSlug),
    ],
  };
};

const resolveFallbackQuestionnairePath = (descriptionPath: string): string =>
  descriptionPath.replace(FALLBACK_PATH_SEGMENT_RE, "questionnaire.md");

const collectReadFallbackPaths = (
  paths: readonly (string | null | undefined)[],
  primaryPath: string
): readonly string[] => {
  const unique = new Set<string>();
  for (const path of paths) {
    if (!path || path === primaryPath) {
      continue;
    }
    unique.add(path);
  }
  return Array.from(unique);
};

export const resolveQuestionnaireTargets = (
  descriptionPath: string
): QuestionnairePathTargets => {
  const pathSet = resolveQuestionnairePaths(descriptionPath);
  const primaryPath =
    pathSet?.canonical ?? resolveFallbackQuestionnairePath(descriptionPath);
  const readFallbackPaths = collectReadFallbackPaths(
    pathSet?.legacyReadPaths ?? [],
    primaryPath
  );
  return { primaryPath, readFallbackPaths };
};
