import assert from "node:assert/strict";
import test from "node:test";
import {
  collectProtectedRanges,
  resolveChunkBoundary,
} from "./translation-chunk-boundary-resolver";

test("collectProtectedRanges tracks inline code, links, and placeholders", () => {
  const text =
    "Intro with `inline_code` and [a link](https://example.com) plus {placeholder}.";

  const protectedRanges = collectProtectedRanges(text);

  assert.ok(
    protectedRanges.some(
      (range) => text.slice(range.start, range.end) === "`inline_code`"
    )
  );
  assert.ok(
    protectedRanges.some(
      (range) =>
        text.slice(range.start, range.end) === "[a link](https://example.com)"
    )
  );
  assert.ok(
    protectedRanges.some(
      (range) => text.slice(range.start, range.end) === "{placeholder}"
    )
  );
});

test("resolveChunkBoundary prefers paragraph breaks before hard splitting", () => {
  const text =
    "Paragraph one stays readable and should fit before the break.\n\nParagraph two starts after the preferred boundary.";

  const boundary = resolveChunkBoundary(
    text,
    0,
    70,
    90,
    collectProtectedRanges(text)
  );

  assert.equal(boundary, text.indexOf("\n\n") + 2);
});

test("resolveChunkBoundary does not split inside protected inline code", () => {
  const text =
    "Short intro `inline code fragment that must stay intact` trailing sentence.";
  const protectedRanges = collectProtectedRanges(text);
  const boundary = resolveChunkBoundary(text, 0, 28, 42, protectedRanges);

  const inlineCodeStart = text.indexOf("`inline code fragment");
  const inlineCodeEnd = text.indexOf("` trailing");

  assert.ok(
    boundary <= inlineCodeStart || boundary >= inlineCodeEnd,
    "boundary must not land inside the protected inline-code span"
  );
});
