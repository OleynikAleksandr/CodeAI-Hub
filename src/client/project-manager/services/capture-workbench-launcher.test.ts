import assert from "node:assert/strict";
import test from "node:test";
import { openCaptureWorkbench } from "./capture-workbench-launcher";

interface OpenCall {
  readonly features?: string;
  readonly target?: string;
  readonly url: string;
}

const createOpenHarness = () => {
  const calls: OpenCall[] = [];

  return {
    calls,
    openWindow: (url: string, target?: string, features?: string): Window | null => {
      calls.push({ features, target, url });
      return null;
    },
  };
};

test("openCaptureWorkbench opens detached capture URL with workspace query", () => {
  const harness = createOpenHarness();
  const opened = openCaptureWorkbench(
    {
      workspacePath: "/Users/demo/My Workspace",
      workspaceSlug: "demo workspace",
    },
    {
      href: "http://127.0.0.1:4521/project-manager?mode=settings",
      openWindow: harness.openWindow,
    }
  );

  assert.equal(opened, true);
  assert.equal(harness.calls.length, 1);
  assert.equal(harness.calls[0]?.target, "_blank");
  assert.equal(harness.calls[0]?.features, "popup,width=1280,height=900");

  const openedUrl = new URL(harness.calls[0]?.url ?? "");
  assert.equal(openedUrl.origin, "http://127.0.0.1:4521");
  assert.equal(openedUrl.pathname, "/project-manager");
  assert.equal(openedUrl.searchParams.get("mode"), "detached-capture");
  assert.equal(openedUrl.searchParams.get("workspaceSlug"), "demo workspace");
  assert.equal(
    openedUrl.searchParams.get("workspacePath"),
    "/Users/demo/My Workspace"
  );
});

test("openCaptureWorkbench does not open without workspace identity", () => {
  const harness = createOpenHarness();

  assert.equal(
    openCaptureWorkbench(
      { workspacePath: "/Users/demo/My Workspace", workspaceSlug: null },
      {
        href: "http://127.0.0.1:4521/project-manager",
        openWindow: harness.openWindow,
      }
    ),
    false
  );
  assert.deepEqual(harness.calls, []);
});
