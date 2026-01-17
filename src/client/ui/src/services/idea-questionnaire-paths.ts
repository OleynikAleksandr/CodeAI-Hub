const DESCRIPTION_RUN_PATH_RE =
  /^\.codeai-hub\/([^/]+)\/description\/runs\/([^/]+)\/description\.md$/;
const LEGACY_IDEA_RUN_PATH_RE =
  /^\.codeai-hub\/([^/]+)\/description\/runs\/([^/]+)\/idea\/idea\.md$/;
const FALLBACK_PATH_SEGMENT_RE = /[^/]+$/;

type QuestionnairePathSet = {
  readonly canonical: string;
  readonly legacyRun: string;
  readonly legacyInitiative: string;
};

export type QuestionnairePathTargets = {
  readonly primaryPath: string;
  readonly legacyPaths: readonly string[];
};

const buildCanonicalQuestionnairePath = (workspaceSlug: string): string =>
  `.codeai-hub/${workspaceSlug}/description/questionnaire.md`;

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
  const match =
    DESCRIPTION_RUN_PATH_RE.exec(descriptionPath) ??
    LEGACY_IDEA_RUN_PATH_RE.exec(descriptionPath);
  if (!match) {
    return null;
  }
  const workspaceSlug = match[1];
  const runSlug = match[2];
  return {
    canonical: buildCanonicalQuestionnairePath(workspaceSlug),
    legacyRun: buildLegacyRunQuestionnairePath(workspaceSlug, runSlug),
    legacyInitiative: buildLegacyInitiativeQuestionnairePath(workspaceSlug),
  };
};

const resolveFallbackQuestionnairePath = (descriptionPath: string): string =>
  descriptionPath.replace(FALLBACK_PATH_SEGMENT_RE, "questionnaire.md");

const collectLegacyPaths = (
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
  const legacyPaths = collectLegacyPaths(
    [pathSet?.legacyRun, pathSet?.legacyInitiative],
    primaryPath
  );
  return { primaryPath, legacyPaths };
};
