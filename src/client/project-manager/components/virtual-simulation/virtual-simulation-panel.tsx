import type React from "react";
import { useCallback, useMemo } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { useStageArtifactLoader } from "../shared/use-stage-artifact-loader";
import { StageArtifactContentView } from "../shared/stage-artifact-content-view";

const VIRTUAL_SIMULATION_TITLE_RE = /^#\s+Virtual Simulation:/m;
const VIRTUAL_SIMULATION_SCENARIO_RE =
  /^##\s+(?:Сценарий|Scenario)\s+\d+\b/gm;

const validateVirtualSimulationMarkdown = (content: string): string | null => {
  if (content.trim().length === 0) {
    return "Файл пустой.";
  }
  if (!VIRTUAL_SIMULATION_TITLE_RE.test(content)) {
    return "Нет заголовка `# Virtual Simulation:`.";
  }
  const scenarioMatches = content.match(VIRTUAL_SIMULATION_SCENARIO_RE);
  const scenarioCount = scenarioMatches?.length ?? 0;
  if (scenarioCount < 2) {
    return "Нужно минимум 2 сценария: `## Сценарий N`.";
  }
  if (scenarioCount > 4) {
    return "Нужно максимум 4 сценария: `## Сценарий N`.";
  }
  return null;
};

const startService = new WorkflowStepStartService();

export const VirtualSimulationPanel: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}> = (props) => {
  const artifactPath = useMemo(
    () => `.codeai-hub/${props.workspaceSlug}/virtual_simulation/virtual-simulation.md`,
    [props.workspaceSlug]
  );
  const { status, content, error } = useStageArtifactLoader({
    workspacePath: props.workspacePath,
    workspaceSlug: props.workspaceSlug,
    artifactPath,
    stageLabel: "Virtual Simulation",
  });

  const validationError = useMemo(
    () => (content ? validateVirtualSimulationMarkdown(content) : null),
    [content]
  );

  const handleFixStart = useCallback(
    async (p: {
      readonly workspacePath: string;
      readonly workspaceSlug: string;
      readonly providerId: string;
    }): Promise<void> => {
      await startService.startVirtualSimulation({
        workspacePath: p.workspacePath,
        workspaceSlug: p.workspaceSlug,
        providerId: p.providerId as ProviderStackId,
      });
    },
    []
  );

  if (status === "ready" && content !== null) {
    return (
      <StageArtifactContentView
        artifactPath={artifactPath}
        content={content}
        displayFileName="virtual-simulation.md"
        onFixStart={handleFixStart}
        validationError={validationError}
        workspacePath={props.workspacePath}
        workspaceSlug={props.workspaceSlug}
      />
    );
  }

  if (status === "error") {
    return <div className="pm-placeholder">{error ?? "Не удалось загрузить Virtual Simulation."}</div>;
  }

  return (
    <div className="pm-details">
      <div style={{ marginBottom: 12 }}>
        <strong>Virtual Simulation</strong>
      </div>
      <div className="pm-placeholder" style={{ marginBottom: 12 }}>
        Ожидаем артефакт: <code>{artifactPath}</code>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          Здесь мы фиксируем 2–4 сценария: действие → реакция UI → что должно произойти в системе → как проверить.
        </div>
        <div>
          Вы можете править <code>virtual-simulation.md</code> вручную в редакторе или через агента (он задаст до 3 уточнений и обновит файл после вашего "ОК").
        </div>
        <div>
          Вы также можете прямо в диалоге:
          <ul style={{ marginTop: 6 }}>
            <li>задать вопросы;</li>
            <li>приложить любые заранее подготовленные документы (или вставить текст), чтобы агент учёл их в следующей версии.</li>
          </ul>
        </div>
        <div>Любые изменения пометят следующие шаги как требующие синхронизации.</div>
      </div>
    </div>
  );
};
