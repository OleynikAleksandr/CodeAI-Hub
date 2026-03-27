interface ResetFormatOptions {
  readonly locale?: string;
  readonly timeZone?: string;
}

const TIMEZONE_SUFFIX_PATTERN = /^(.*)\s+\([^)]+\)\s*$/u;
const UTC_RESET_PATTERN =
  /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?\s*\((UTC|GMT)\)$/iu;

const stripTimeZoneSuffix = (value: string): string => {
  const trimmed = value.trim();
  const match = TIMEZONE_SUFFIX_PATTERN.exec(trimmed);
  return match?.[1]?.trim() ? match[1].trim() : trimmed;
};

const parseDate = (value: string): Date | null => {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  return new Date(timestamp);
};

const parseResetDate = (value: string): Date | null => {
  const utcMatch = UTC_RESET_PATTERN.exec(value);
  if (utcMatch) {
    const [, datePart, hhmmPart, secondsPart] = utcMatch;
    const normalizedSeconds = secondsPart ?? "00";
    return parseDate(`${datePart}T${hhmmPart}:${normalizedSeconds}Z`);
  }

  const direct = parseDate(value);
  if (direct) {
    return direct;
  }

  const stripped = stripTimeZoneSuffix(value);
  if (stripped !== value) {
    return parseDate(stripped);
  }

  return null;
};

const resolveLocale = (options: ResetFormatOptions): string =>
  options.locale ?? "en-US";

const resolveTimeZone = (options: ResetFormatOptions): string | undefined =>
  options.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

const formatMonthDay = (date: Date, options: ResetFormatOptions): string =>
  new Intl.DateTimeFormat(resolveLocale(options), {
    month: "short",
    day: "numeric",
    timeZone: resolveTimeZone(options),
  }).format(date);

const readNumericPart = (
  parts: Intl.DateTimeFormatPart[],
  partType: "hour" | "minute"
): number => {
  const value = parts.find((part) => part.type === partType)?.value ?? "0";
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatClock = (date: Date, options: ResetFormatOptions): string => {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: resolveTimeZone(options),
  }).formatToParts(date);
  const hour24 = readNumericPart(parts, "hour");
  const minute = readNumericPart(parts, "minute");
  const meridiem = hour24 >= 12 ? "pm" : "am";
  const hour12 = hour24 % 12 || 12;
  if (minute === 0) {
    return `${hour12}${meridiem}`;
  }
  return `${hour12}:${String(minute).padStart(2, "0")}${meridiem}`;
};

export const buildResetLabel = (
  rawValue: string,
  options: ResetFormatOptions = {}
): string => {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return "Resets";
  }
  const parsed = parseResetDate(trimmed);
  if (!parsed) {
    return `Resets ${stripTimeZoneSuffix(trimmed)}`;
  }
  return `Resets ${formatMonthDay(parsed, options)} at ${formatClock(
    parsed,
    options
  )}`;
};
