interface DecodedFragment {
  readonly complete: boolean;
  readonly decoded: string;
}

const UNICODE_ESCAPE_REGEX = /^[0-9a-fA-F]{4}$/;

const isWhitespace = (value: string): boolean =>
  value === " " || value === "\n" || value === "\t" || value === "\r";

const findFieldValueStart = (
  source: string,
  fieldToken: string
): number | null => {
  let index = source.indexOf(fieldToken);
  while (index !== -1) {
    let cursor = index + fieldToken.length;
    while (cursor < source.length && isWhitespace(source[cursor])) {
      cursor += 1;
    }
    if (source[cursor] !== ":") {
      index = source.indexOf(fieldToken, cursor);
      continue;
    }
    cursor += 1;
    while (cursor < source.length && isWhitespace(source[cursor])) {
      cursor += 1;
    }
    if (source[cursor] !== '"') {
      index = source.indexOf(fieldToken, cursor);
      continue;
    }
    return cursor + 1;
  }
  return null;
};

const decodeJsonStringFragment = (
  source: string,
  startIndex: number
): DecodedFragment => {
  let decoded = "";
  let cursor = startIndex;
  while (cursor < source.length) {
    const char = source[cursor];
    if (char === '"') {
      return { decoded, complete: true };
    }
    if (char !== "\\") {
      decoded += char;
      cursor += 1;
      continue;
    }
    if (cursor + 1 >= source.length) {
      return { decoded, complete: false };
    }
    const escapeChar = source[cursor + 1];
    switch (escapeChar) {
      case '"':
        decoded += '"';
        cursor += 2;
        break;
      case "\\":
        decoded += "\\";
        cursor += 2;
        break;
      case "/":
        decoded += "/";
        cursor += 2;
        break;
      case "b":
        decoded += "\b";
        cursor += 2;
        break;
      case "f":
        decoded += "\f";
        cursor += 2;
        break;
      case "n":
        decoded += "\n";
        cursor += 2;
        break;
      case "r":
        decoded += "\r";
        cursor += 2;
        break;
      case "t":
        decoded += "\t";
        cursor += 2;
        break;
      case "u": {
        const slice = source.slice(cursor + 2, cursor + 6);
        if (slice.length < 4 || !UNICODE_ESCAPE_REGEX.test(slice)) {
          return { decoded, complete: false };
        }
        decoded += String.fromCharCode(Number.parseInt(slice, 16));
        cursor += 6;
        break;
      }
      default:
        return { decoded, complete: false };
    }
  }
  return { decoded, complete: false };
};

export class AnswerJsonStreamExtractor {
  private buffer = "";
  private answerValueStartIndex: number | null = null;
  private emittedLength = 0;
  private answerComplete = false;
  private readonly fieldToken: string;

  constructor(fieldName = "answer") {
    this.fieldToken = `"${fieldName}"`;
  }

  append(nextText: string): string | null {
    if (!nextText) {
      return null;
    }
    let chunk = nextText;
    if (this.buffer && nextText.startsWith(this.buffer)) {
      chunk = nextText.slice(this.buffer.length);
    } else if (this.buffer?.startsWith(nextText)) {
      return null;
    }
    if (!chunk) {
      return null;
    }
    this.buffer += chunk;
    return this.extractDelta();
  }

  private extractDelta(): string | null {
    if (this.answerComplete) {
      return null;
    }
    if (this.answerValueStartIndex === null) {
      this.answerValueStartIndex = findFieldValueStart(
        this.buffer,
        this.fieldToken
      );
    }
    if (this.answerValueStartIndex === null) {
      return null;
    }
    const { decoded, complete } = decodeJsonStringFragment(
      this.buffer,
      this.answerValueStartIndex
    );
    if (complete) {
      this.answerComplete = true;
    }
    if (decoded.length <= this.emittedLength) {
      return null;
    }
    const delta = decoded.slice(this.emittedLength);
    this.emittedLength = decoded.length;
    return delta || null;
  }
}
