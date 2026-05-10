import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ApplicationSkeletonAcceptContractButton } from "./application-skeleton-accept-contract-button";

const DISABLED_RE = /disabled=""/u;
const REASON_RE = /Application Skeleton draft is incomplete/u;

test("button renders disabled when sessionId is null", () => {
  const markup = renderToStaticMarkup(
    <ApplicationSkeletonAcceptContractButton
      disabledReason={null}
      sessionId={null}
    />
  );
  assert.match(markup, DISABLED_RE);
});

test("button renders disabled when a precondition reason is supplied", () => {
  const markup = renderToStaticMarkup(
    <ApplicationSkeletonAcceptContractButton
      disabledReason="Application Skeleton draft is incomplete: missing markdown."
      sessionId="session-1"
    />
  );
  assert.match(markup, DISABLED_RE);
  assert.match(markup, REASON_RE);
});

test("button renders enabled when sessionId is present and there is no disabled reason", () => {
  const markup = renderToStaticMarkup(
    <ApplicationSkeletonAcceptContractButton
      disabledReason={null}
      sessionId="session-1"
    />
  );
  assert.doesNotMatch(markup, DISABLED_RE);
  assert.match(markup, /Accept Contract/u);
});
