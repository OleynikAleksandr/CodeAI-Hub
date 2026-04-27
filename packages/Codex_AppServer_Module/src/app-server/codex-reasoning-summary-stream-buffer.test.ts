import assert from "node:assert/strict";
import test from "node:test";
import { CodexReasoningSummaryStreamBuffer } from "./codex-reasoning-summary-stream-buffer";

test("CodexReasoningSummaryStreamBuffer flushes prior blocks when next summary part starts", () => {
  const buffer = new CodexReasoningSummaryStreamBuffer();

  assert.deepEqual(
    buffer.startSummaryPart({
      itemId: "reasoning-1",
      itemKey: "thread-1::reasoning-1",
      summaryIndex: 0,
    }),
    []
  );
  buffer.appendSummaryDelta({
    delta: "**Preparing report**",
    itemId: "reasoning-1",
    itemKey: "thread-1::reasoning-1",
    summaryIndex: 0,
  });
  buffer.appendSummaryDelta({
    delta: "\n\nBody one.",
    itemId: "reasoning-1",
    itemKey: "thread-1::reasoning-1",
    summaryIndex: 0,
  });

  assert.deepEqual(
    buffer.startSummaryPart({
      itemId: "reasoning-1",
      itemKey: "thread-1::reasoning-1",
      summaryIndex: 1,
    }),
    [
      {
        content: "**Preparing report**\n\nBody one.",
        index: 0,
        uuid: "reasoning-1::summary-block::0",
      },
    ]
  );
});

test("CodexReasoningSummaryStreamBuffer emits only remaining blocks on completion", () => {
  const buffer = new CodexReasoningSummaryStreamBuffer();
  const itemKey = "thread-1::reasoning-2";

  buffer.startSummaryPart({
    itemId: "reasoning-2",
    itemKey,
    summaryIndex: 0,
  });
  buffer.appendSummaryDelta({
    delta: "**Block zero**\n\nAlready visible.",
    itemId: "reasoning-2",
    itemKey,
    summaryIndex: 0,
  });
  assert.equal(
    buffer.startSummaryPart({
      itemId: "reasoning-2",
      itemKey,
      summaryIndex: 1,
    }).length,
    1
  );

  assert.deepEqual(
    buffer.flushRemaining({
      finalSummaryBlocks: [
        "**Block zero**\n\nFinal text should not duplicate.",
        "**Block one**\n\nFinal text.",
      ],
      itemId: "reasoning-2",
      itemKey,
    }),
    [
      {
        content: "**Block one**\n\nFinal text.",
        index: 1,
        uuid: "reasoning-2::summary-block::1",
      },
    ]
  );
});

test("CodexReasoningSummaryStreamBuffer falls back to accumulated text, content, then raw text", () => {
  const accumulated = new CodexReasoningSummaryStreamBuffer();
  accumulated.appendSummaryDelta({
    delta: "Accumulated summary.",
    itemId: "reasoning-3",
    itemKey: "thread-1::reasoning-3",
    summaryIndex: 0,
  });
  assert.deepEqual(
    accumulated.flushRemaining({
      itemId: "reasoning-3",
      itemKey: "thread-1::reasoning-3",
    }),
    [
      {
        content: "Accumulated summary.",
        index: 0,
        uuid: "reasoning-3::summary-block::0",
      },
    ]
  );

  const content = new CodexReasoningSummaryStreamBuffer();
  assert.deepEqual(
    content.flushRemaining({
      finalContentBlocks: ["Content block."],
      itemId: "reasoning-4",
      itemKey: "thread-1::reasoning-4",
    }),
    [
      {
        content: "Content block.",
        index: 0,
        uuid: "reasoning-4::summary-block::0",
      },
    ]
  );

  const raw = new CodexReasoningSummaryStreamBuffer();
  assert.deepEqual(
    raw.flushRemaining({
      itemId: "reasoning-5",
      itemKey: "thread-1::reasoning-5",
      textFallback: "Raw fallback.",
    }),
    [
      {
        content: "Raw fallback.",
        index: 0,
        uuid: "reasoning-5::summary-block::0",
      },
    ]
  );
});
