import assert from "node:assert/strict";
import test from "node:test";
import { openProjectManagerFileLink } from "./project-manager-file-link-opener";

const restoreGlobalProperty = (
  name: "document" | "window",
  descriptor: PropertyDescriptor | undefined
) => {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
    return;
  }
  Reflect.deleteProperty(globalThis, name);
};

test("openProjectManagerFileLink posts the VS Code open request when webview bridge is available", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    "document"
  );
  const messages: unknown[] = [];

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      acquireVsCodeApi: () => ({
        postMessage: (message: unknown) => {
          messages.push(message);
        },
      }),
    },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: () => {
        throw new Error("document fallback must not run when VS Code bridge exists");
      },
    },
  });

  try {
    openProjectManagerFileLink({
      href: "/tmp/virtual-simulation.md:14:2",
      filePath: "/tmp/virtual-simulation.md",
      line: 14,
      column: 2,
    });
  } finally {
    restoreGlobalProperty("window", originalWindow);
    restoreGlobalProperty("document", originalDocument);
  }

  assert.deepEqual(messages, [
    {
      type: "pm:file-link:open",
      payload: {
        path: "/tmp/virtual-simulation.md",
        line: 14,
        column: 2,
      },
    },
  ]);
});

test("openProjectManagerFileLink falls back to vscode file URI handoff without webview bridge", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    "document"
  );
  let clicked = false;
  const link = {
    href: "",
    rel: "",
    target: "",
    click: () => {
      clicked = true;
    },
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: (tagName: string) => {
        assert.equal(tagName, "a");
        return link;
      },
    },
  });

  try {
    openProjectManagerFileLink({
      href: "/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/README.md:28:3",
      filePath: "/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/README.md",
      line: 28,
      column: 3,
    });
  } finally {
    restoreGlobalProperty("window", originalWindow);
    restoreGlobalProperty("document", originalDocument);
  }

  assert.equal(
    link.href,
    "vscode://file//Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/README.md:28:3"
  );
  assert.equal(link.rel, "noopener noreferrer");
  assert.equal(link.target, "_blank");
  assert.equal(clicked, true);
});
