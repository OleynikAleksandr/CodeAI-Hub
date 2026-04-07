import type { FileLinkTarget } from "../../ui/src/session/file-link-target";
import { resolveVscodeBridge } from "./pm-bridges";

const WINDOWS_SEPARATOR_RE = /\\/g;

const encodeFilePathForVsCodeUri = (filePath: string): string =>
  encodeURI(filePath.replace(WINDOWS_SEPARATOR_RE, "/"));

const buildVsCodeFileUri = (target: FileLinkTarget): string => {
  const encodedPath = encodeFilePathForVsCodeUri(target.filePath);
  const locationSuffix =
    typeof target.line === "number"
      ? `:${target.line}${typeof target.column === "number" ? `:${target.column}` : ""}`
      : "";
  return `vscode://file/${encodedPath}${locationSuffix}`;
};

const handoffToExternalUri = (href: string): void => {
  const link = document.createElement("a");
  link.href = href;
  link.rel = "noopener noreferrer";
  link.target = "_blank";
  link.click();
};

export const openProjectManagerFileLink = (target: FileLinkTarget): void => {
  const vscode = resolveVscodeBridge();
  if (vscode) {
    vscode.postMessage({
      type: "pm:file-link:open",
      payload: {
        path: target.filePath,
        line: target.line,
        column: target.column,
      },
    });
    return;
  }

  handoffToExternalUri(buildVsCodeFileUri(target));
};
