export const resolveSelectedInitiativeSlug = (): string | null => {
  const element = document.getElementById("initiative");
  if (!(element instanceof HTMLSelectElement)) {
    return null;
  }
  const value = element.value.trim();
  return value.length > 0 ? value : null;
};

export const resolveWorkspacePath = (): string | null => {
  const globalScope = window as typeof window & {
    __CODEAI_CORE_CONFIG?: { readonly workspacePath?: string };
  };
  const workspacePath = globalScope.__CODEAI_CORE_CONFIG?.workspacePath;
  if (typeof workspacePath !== "string" || workspacePath.length === 0) {
    return null;
  }
  return workspacePath;
};
