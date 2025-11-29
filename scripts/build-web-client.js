#!/usr/bin/env node

const { build } = require("esbuild");
const fs = require("node:fs/promises");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const entryFile = path.join(
  projectRoot,
  "src",
  "client",
  "web-client",
  "index.tsx"
);
const distDir = path.join(projectRoot, "media", "web-client", "dist");
const sourceHtml = path.join(projectRoot, "media", "web-client", "index.html");
const targetHtml = path.join(distDir, "index.html");

async function run() {
  try {
    await fs.rm(distDir, { recursive: true, force: true });
    await fs.mkdir(distDir, { recursive: true });

    await build({
      entryPoints: [entryFile],
      outfile: path.join(distDir, "app.js"),
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

    const htmlTemplate = await fs.readFile(sourceHtml, "utf8");
    const cssFiles = [
      path.join(projectRoot, "media", "main-view.css"),
      path.join(projectRoot, "media", "session-view.css"),
      path.join(projectRoot, "media", "react-chat.css"),
    ];
    const inlineCss = [];
    for (const filePath of cssFiles) {
      const css = await fs.readFile(filePath, "utf8");
      inlineCss.push(css);
    }

    const themeBlock = `<style id="codeai-hub-theme">\n${inlineCss.join("\n")}\n</style>`;
    let htmlOutput;
    if (htmlTemplate.includes("<!--theme:inject-->")) {
      htmlOutput = htmlTemplate.replace("<!--theme:inject-->", themeBlock);
    } else {
      htmlOutput = htmlTemplate.replace("</head>", `${themeBlock}\n</head>`);
    }

    await fs.writeFile(targetHtml, htmlOutput, "utf8");

    process.stdout.write("web client bundle generated successfully\n");
  } catch (error) {
    process.stderr.write(`web client build failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

run();
