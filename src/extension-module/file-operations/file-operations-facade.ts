import { FilePathFacade } from "../../core/file-path-module/facades/file-path-facade";

const WINDOWS_PATH_PATTERN = /^[a-zA-Z]:\\/;
const WINDOWS_POSIX_PATTERN = /^[a-zA-Z]:\//;

export class FileOperationsFacade {
  private readonly filePathFacade: FilePathFacade;

  constructor(filePathFacade: FilePathFacade = new FilePathFacade()) {
    this.filePathFacade = filePathFacade;
  }

  async handleFileDrop(): Promise<string[] | null> {
    const paths = await this.filePathFacade.getDraggedFilePaths();
    if (paths && paths.length > 0) {
      this.filePathFacade.cachePaths(paths);
      return paths;
    }

    const clipboardPath = await this.filePathFacade.getClipboardPath();
    if (clipboardPath && this.isFilePath(clipboardPath)) {
      this.filePathFacade.cachePaths([clipboardPath]);
      return [clipboardPath];
    }

    return null;
  }

  formatPathsForInsertion(paths: readonly string[]): string {
    if (paths.length === 0) {
      return "";
    }

    const quoted = paths.map((path) => `"${path}"`).join("\n");
    return `${quoted}\n`;
  }

  clearFileDropCache(): void {
    this.filePathFacade.clearCache();
  }

  private isFilePath(path: string): boolean {
    return (
      path.startsWith("/") ||
      WINDOWS_PATH_PATTERN.test(path) ||
      WINDOWS_POSIX_PATTERN.test(path)
    );
  }
}
