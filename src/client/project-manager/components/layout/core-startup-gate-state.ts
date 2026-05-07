export type StartupGateCopy = {
  readonly detail: string;
  readonly status: string;
  readonly title: string;
};

export const resolveStartupGateCopy = (
  configuredLanguage: string
): StartupGateCopy => {
  if (configuredLanguage.toLowerCase().startsWith("ru")) {
    return {
      detail:
        "Core проверяет и обновляет локальные компоненты. Рабочие области и Settings станут доступны после завершения.",
      status: "Ожидание готовности Core...",
      title: "CodeAI Hub запускается",
    };
  }
  return {
    detail:
      "Core is checking and updating local components. Workspaces and Settings will become available when startup completes.",
    status: "Waiting for Core readiness...",
    title: "CodeAI Hub is starting",
  };
};
