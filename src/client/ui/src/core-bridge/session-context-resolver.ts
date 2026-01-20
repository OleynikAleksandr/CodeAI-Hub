export const resolveSelectedInitiativeSlug = (): string | null => {
  if (typeof document === "undefined") {
    return null;
  }
  const element = document.getElementById("initiative");
  if (!(element instanceof HTMLSelectElement)) {
    return null;
  }
  const value = element.value.trim();
  return value.length > 0 ? value : null;
};

export const resolveSelectedProviderSessionId = (): string | null => {
  if (typeof document === "undefined") {
    return null;
  }
  const element = document.getElementById("providerSessionId");
  if (!(element instanceof HTMLInputElement)) {
    return null;
  }
  const value = element.value.trim();
  return value.length > 0 ? value : null;
};
