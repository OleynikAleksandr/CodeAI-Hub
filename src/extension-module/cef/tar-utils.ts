import { execFile } from "node:child_process";

export type TarExtractOptions = {
  readonly archivePath: string;
  readonly destination: string;
  readonly label: string;
  readonly stripComponents?: number;
  readonly onProgress?: (message: string) => void;
};

const resolveTarArgs = (archivePath: string): string[] => {
  if (archivePath.endsWith(".tar.gz") || archivePath.endsWith(".tgz")) {
    return ["-xzf", archivePath];
  }
  if (archivePath.endsWith(".tar.bz2")) {
    return ["-xjf", archivePath];
  }
  throw new Error(`Unsupported archive format: ${archivePath}`);
};

export const extractArchiveWithTar = async ({
  archivePath,
  destination,
  label,
  stripComponents,
  onProgress,
}: TarExtractOptions): Promise<void> => {
  onProgress?.(`Extracting ${label}…`);
  const args = [...resolveTarArgs(archivePath)];
  if (typeof stripComponents === "number" && stripComponents > 0) {
    args.push("--strip-components", String(stripComponents));
  }
  args.push("-C", destination);
  await new Promise<void>((resolve, reject) => {
    execFile("tar", args, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};
