const isGoogleResponseSegment = (
  segment: unknown
): segment is readonly unknown[] =>
  Array.isArray(segment) && segment.length > 0;

export const parseGoogleTranslateResponse = (data: unknown): string | null => {
  if (!Array.isArray(data)) {
    return null;
  }

  const segments = data[0];
  if (!Array.isArray(segments)) {
    return null;
  }

  const translated = segments
    .filter(isGoogleResponseSegment)
    .map((segment) => {
      const candidate = segment[0];
      return typeof candidate === "string" ? candidate : "";
    })
    .join("")
    .trim();

  return translated.length > 0 ? translated : null;
};
