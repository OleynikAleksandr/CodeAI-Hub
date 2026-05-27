export type ManagedWorkflowHandoffStage =
  | "Application Skeleton"
  | "Description"
  | "Diagram Modules"
  | "Quality Gates"
  | "Virtual Simulation";

export type ApplicationSkeletonHandoffPhase =
  | "draft_contract"
  | "materialized_skeleton";

const stageLabel = (stage: ManagedWorkflowHandoffStage): string => stage;

export const buildManagedUserLedReviewHandoffMessage = (
  stage: ManagedWorkflowHandoffStage
): string =>
  [
    `Core: ${stageLabel(stage)} перешёл в пользовательскую проверку.`,
    "Пожалуйста, ответьте на вопросы агента, задайте свои вопросы или напишите правки.",
    "Если хотите принять текущий результат как есть и продолжить следующий управляемый шаг, нажмите кнопку «Подтверждаю» ниже.",
  ].join("\n");

export const buildManagedPersistentReturnHandoffMessage = (
  stage: ManagedWorkflowHandoffStage
): string =>
  [
    `Core: ${stageLabel(stage)} завершён и зафиксирован.`,
    "Можно переходить к следующему шагу.",
    `Если сейчас или в дальнейшем нужны изменения, напишите их здесь, и агент обновит ${stageLabel(stage)}.`,
  ].join("\n");

export const buildApplicationSkeletonReviewHandoffMessage = (
  phase: ApplicationSkeletonHandoffPhase
): string => {
  if (phase === "draft_contract") {
    return [
      "Core: Application Skeleton draft contract перешёл в пользовательскую проверку.",
      "Проверьте контракт до Core-owned materialization workspace skeleton.",
      "Пожалуйста, ответьте на вопросы агента, задайте свои вопросы или напишите правки.",
      "Если хотите принять контракт и запустить материализацию, нажмите кнопку «Подтверждаю» ниже.",
    ].join("\n");
  }
  return [
    "Core: Application Skeleton materialized filesystem skeleton перешёл в финальную пользовательскую проверку.",
    "Проверьте созданные файлы и структуру workspace перед разблокировкой Quality Gates.",
    "Пожалуйста, ответьте на вопросы агента, задайте свои вопросы или напишите правки.",
    "Если хотите принять materialized skeleton и открыть Quality Gates, нажмите кнопку «Подтверждаю» ниже.",
  ].join("\n");
};
