import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QualityGatesAcceptContractButton } from "./quality-gates-accept-contract-button";

const DISABLED_RE = /disabled=""/u;
const HINT_RE = /Need revisions\? Write them in chat\./u;
const REASON_RE = /Quality Gates draft is incomplete/u;

test("button renders disabled when sessionId is null", () => {
  const markup = renderToStaticMarkup(
    <QualityGatesAcceptContractButton disabledReason={null} sessionId={null} />
  );
  assert.match(markup, DISABLED_RE);
  assert.match(markup, HINT_RE);
});

test("button renders disabled when a precondition reason is supplied", () => {
  const markup = renderToStaticMarkup(
    <QualityGatesAcceptContractButton
      disabledReason="Quality Gates draft is incomplete: missing commands."
      sessionId="session-1"
    />
  );
  assert.match(markup, DISABLED_RE);
  assert.match(markup, REASON_RE);
});

test("button renders enabled when sessionId is present and there is no disabled reason", () => {
  const markup = renderToStaticMarkup(
    <QualityGatesAcceptContractButton
      disabledReason={null}
      sessionId="session-1"
    />
  );
  assert.doesNotMatch(markup, DISABLED_RE);
  assert.match(markup, /Accept Contract/u);
});
