#!/usr/bin/env node

const { build } = require("esbuild");
const path = require("node:path");

const projectRoot = path.resolve(
  path.dirname(require.resolve("./build-webview.js")),
  ".."
);
const entryFile = path.resolve(
  projectRoot,
  "src",
  "client",
  "ui",
  "src",
  "index.tsx"
);
const outFile = path.resolve(projectRoot, "media", "react-chat.js");

async function run() {
  try {
    await build({
      entryPoints: [entryFile],
      outfile: outFile,
      bundle: true,
      platform: "browser",
      format: "iife",
      target: ["es2020"],
      loader: {
        ".ts": "ts",
        ".tsx": "tsx",
      },
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      minify: false,
      sourcemap: false,
      jsx: "automatic",
      logLevel: "error",
    });

    process.stdout.write("webview bundle generated successfully\n");
  } catch (error) {
    process.stderr.write(`webview bundle failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

run();
