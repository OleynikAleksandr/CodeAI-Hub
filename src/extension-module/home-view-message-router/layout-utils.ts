export const validateLayoutPayload = (payload: unknown): void => {
  if (!payload || typeof payload !== "object") {
    return;
  }

  const candidate = payload as Record<string, unknown>;
  const keys: Array<keyof typeof candidate> = [
    "x",
    "y",
    "width",
    "height",
    "absoluteX",
    "absoluteY",
  ];

  for (const key of keys) {
    if (typeof candidate[key] !== "number") {
      return;
    }
  }
};
