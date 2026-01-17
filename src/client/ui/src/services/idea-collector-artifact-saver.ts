import { persistIdeaArtifacts } from "./idea-artifact-persistence";
import type { IdeaCollectorArtifact } from "./idea-collector-artifact";
import { postSystemNotice, resolveCoreHttpUrl } from "./idea-collector-support";

export const saveIdeaCollectorArtifacts = async (
  sessionId: string,
  artifact: IdeaCollectorArtifact
): Promise<void> => {
  const httpUrl = resolveCoreHttpUrl();
  if (!httpUrl) {
    postSystemNotice(
      sessionId,
      "Не могу сохранить артефакты: Core HTTP URL не определён."
    );
    return;
  }

  try {
    if (artifact.artifacts.length === 0) {
      return;
    }
    const result = await persistIdeaArtifacts({
      httpUrl,
      sessionId,
      artifact,
    });
    if (!result.ok) {
      postSystemNotice(
        sessionId,
        `Не удалось сохранить артефакты (${result.error}).`
      );
      return;
    }

    const savedSummary =
      result.saved.length > 0
        ? result.saved.map((entry) => entry.path).join(", ")
        : artifact.artifacts.map((entry) => entry.slot).join(", ");
    postSystemNotice(
      sessionId,
      `Артефакты сохранены в workspace: ${savedSummary}`
    );
  } catch {
    postSystemNotice(sessionId, "Не удалось сохранить артефакты: ошибка сети.");
  }
};
