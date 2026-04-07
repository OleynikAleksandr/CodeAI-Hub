export interface FileLinkTarget {
  readonly column: number | null;
  readonly filePath: string;
  readonly href: string;
  readonly line: number | null;
}

interface ParsedLocation {
  readonly column: number | null;
  readonly filePath: string;
  readonly line: number | null;
}

const HASH_LOCATION_RE = /#L(\d+)(?:C(\d+))?$/;
const UNIX_COLON_LINE_COLUMN_RE = /^(\/.+):(\d+):(\d+)$/;
const UNIX_COLON_LINE_RE = /^(\/.+):(\d+)$/;
const WINDOWS_COLON_LINE_COLUMN_RE = /^([A-Za-z]:[\\/].+):(\d+):(\d+)$/;
const WINDOWS_COLON_LINE_RE = /^([A-Za-z]:[\\/].+):(\d+)$/;
const WINDOWS_ABSOLUTE_PATH_RE = /^[A-Za-z]:[\\/]/;
const FILE_URI_LOCATION_RE = /^L(\d+)(?:C(\d+))?$/;
const FILE_URI_WINDOWS_PATH_RE = /^\/[A-Za-z]:[\\/]/;
const FILE_URI_PREFIX = "file://";

const toPositiveInteger = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const isAbsoluteFilePath = (value: string): boolean =>
  value.startsWith("/") || WINDOWS_ABSOLUTE_PATH_RE.test(value);

const normalizeFileUriPath = (filePath: string): string =>
  FILE_URI_WINDOWS_PATH_RE.test(filePath) ? filePath.slice(1) : filePath;

const parseFileUriLocation = (uri: URL): ParsedLocation | null => {
  const filePath = normalizeFileUriPath(decodeURIComponent(uri.pathname));
  if (!isAbsoluteFilePath(filePath)) {
    return null;
  }

  const hash = uri.hash.startsWith("#") ? uri.hash.slice(1) : uri.hash;
  const locationMatch = FILE_URI_LOCATION_RE.exec(hash);
  return {
    filePath,
    line: toPositiveInteger(locationMatch?.[1]),
    column: toPositiveInteger(locationMatch?.[2]),
  };
};

const tryDecodeFileUriPath = (href: string): ParsedLocation | null => {
  if (!href.startsWith(FILE_URI_PREFIX)) {
    return null;
  }

  try {
    const uri = new URL(href);
    if (uri.protocol !== "file:") {
      return null;
    }
    return parseFileUriLocation(uri);
  } catch {
    return null;
  }
};

const parseHashLocation = (href: string): ParsedLocation | null => {
  const match = HASH_LOCATION_RE.exec(href);
  if (!match) {
    return null;
  }

  const filePath = href.slice(0, match.index);
  if (!isAbsoluteFilePath(filePath)) {
    return null;
  }

  return {
    filePath,
    line: toPositiveInteger(match[1]),
    column: toPositiveInteger(match[2]),
  };
};

const parseColonLocation = (href: string): ParsedLocation | null => {
  const match =
    WINDOWS_COLON_LINE_COLUMN_RE.exec(href) ??
    UNIX_COLON_LINE_COLUMN_RE.exec(href) ??
    WINDOWS_COLON_LINE_RE.exec(href) ??
    UNIX_COLON_LINE_RE.exec(href);
  if (!match) {
    return null;
  }

  return {
    filePath: match[1],
    line: toPositiveInteger(match[2]),
    column: toPositiveInteger(match[3]),
  };
};

export const resolveFileLinkTarget = (href: string): FileLinkTarget | null => {
  const trimmedHref = href.trim();
  if (!trimmedHref) {
    return null;
  }

  const fileUriPath = tryDecodeFileUriPath(trimmedHref);
  if (fileUriPath) {
    return {
      href: trimmedHref,
      ...fileUriPath,
    };
  }

  const parsedLocation =
    parseHashLocation(trimmedHref) ?? parseColonLocation(trimmedHref);
  if (parsedLocation) {
    return {
      href: trimmedHref,
      ...parsedLocation,
    };
  }

  if (!isAbsoluteFilePath(trimmedHref)) {
    return null;
  }

  return {
    href: trimmedHref,
    filePath: trimmedHref,
    line: null,
    column: null,
  };
};
