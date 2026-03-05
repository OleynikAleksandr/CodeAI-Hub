const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ANGLE_BRACKETS_PATTERN = /^<|>$/g;
const LINK_PATTERN = /!?\[[^\]]*]\(([^)]+)\)/g;
const REF_DEF_PATTERN = /^\s*\[[^\]]+\]:\s*(\S+)(?:\s+(?:["'(].*)?)?\s*$/;
const SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const WHITESPACE_PATTERN = /\s+/;

const isExternalLink = (value) =>
  value.startsWith("#") || value.startsWith("//") || SCHEME_PATTERN.test(value);

const stripQueryAndFragment = (value) =>
  value.split("#")[0]?.split("?")[0] ?? "";

const decodeLinkPath = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const resolveLinkTarget = ({ rootDir, markdownFilePath, rawTarget }) => {
  const withoutTitle = rawTarget.trim().split(WHITESPACE_PATTERN)[0] ?? "";
  const normalized = withoutTitle.replace(ANGLE_BRACKETS_PATTERN, "");
  if (!normalized || isExternalLink(normalized)) {
    return null;
  }

  const linkPath = decodeLinkPath(stripQueryAndFragment(normalized));
  if (!linkPath) {
    return null;
  }

  if (path.isAbsolute(linkPath)) {
    return path.resolve(rootDir, `.${linkPath}`);
  }

  return path.resolve(path.dirname(markdownFilePath), linkPath);
};

const isFenceLine = (line) => {
  const trimmed = line.trimStart();
  return trimmed.startsWith("```") || trimmed.startsWith("~~~");
};

const extractLinkTargets = (markdownContent) => {
  const targets = [];
  const lines = markdownContent.split("\n");

  let inFence = false;
  for (const [index, line] of lines.entries()) {
    if (isFenceLine(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }

    const refMatch = line.match(REF_DEF_PATTERN);
    if (refMatch?.[1]) {
      targets.push({ rawTarget: refMatch[1], line: index + 1 });
    }

    LINK_PATTERN.lastIndex = 0;
    let match = LINK_PATTERN.exec(line);
    while (match) {
      targets.push({ rawTarget: match[1] ?? "", line: index + 1 });
      match = LINK_PATTERN.exec(line);
    }
  }

  return targets;
};

const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();

const listTrackedMarkdownFiles = () => {
  const output = execFileSync("git", ["ls-files", "--", "*.md"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((relativePath) => path.resolve(repoRoot, relativePath));
};

const markdownFiles = listTrackedMarkdownFiles();
const errors = [];

for (const markdownFilePath of markdownFiles) {
  const content = fs.readFileSync(markdownFilePath, "utf8");
  const targets = extractLinkTargets(content);

  for (const target of targets) {
    const resolvedPath = resolveLinkTarget({
      rootDir: repoRoot,
      markdownFilePath,
      rawTarget: target.rawTarget,
    });

    if (!resolvedPath) {
      continue;
    }

    if (!fs.existsSync(resolvedPath)) {
      errors.push({
        file: markdownFilePath,
        line: target.line,
        rawTarget: target.rawTarget,
        resolvedPath,
      });
    }
  }
}

if (errors.length > 0) {
  console.error(`❌ Broken markdown links: ${errors.length}`);
  for (const error of errors) {
    console.error(
      `- ${path.relative(repoRoot, error.file)}:${error.line} -> ${error.rawTarget} (resolved: ${path.relative(repoRoot, error.resolvedPath)})`
    );
  }
  process.exit(1);
}

console.log(`✅ Markdown links OK (${markdownFiles.length} files checked)`);
