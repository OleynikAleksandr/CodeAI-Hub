export type ManagedWorkflowHandoffStage =
  | "Application Skeleton"
  | "Diagram Modules"
  | "Quality Gates";

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
