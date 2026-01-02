import { open, stat } from "node:fs/promises";
import path from "node:path";

export const resolveWorkspaceFilePath = (
  workspaceRoot: string,
  relativePath: string
): string | null => {
  if (path.isAbsolute(relativePath)) {
    return null;
  }
  if (relativePath.includes("\0")) {
    return null;
  }
  const resolvedRoot = path.resolve(workspaceRoot);
  const resolvedFile = path.resolve(resolvedRoot, relativePath);
  const rootPrefix = resolvedRoot.endsWith(path.sep)
    ? resolvedRoot
    : `${resolvedRoot}${path.sep}`;
  if (!resolvedFile.startsWith(rootPrefix)) {
    return null;
  }
  return resolvedFile;
};

export const readFileHead = async (
  absolutePath: string,
  maxBytes: number
): Promise<{ readonly buffer: Buffer; readonly truncated: boolean }> => {
  const fileStats = await stat(absolutePath);
  const sizeBytes = fileStats.size;
  const truncated = sizeBytes > maxBytes;
  const bytesToRead = truncated ? maxBytes : sizeBytes;
  const handle = await open(absolutePath, "r");
  try {
    const buffer = Buffer.alloc(bytesToRead);
    const { bytesRead } = await handle.read(buffer, 0, bytesToRead, 0);
    return { buffer: buffer.subarray(0, bytesRead), truncated };
  } finally {
    await handle.close();
  }
};
