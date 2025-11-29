const WINDOWS_PATH_PATTERN = /^[a-zA-Z]:\\/;
const WINDOWS_POSIX_PATTERN = /^[a-zA-Z]:\//;

export class FilePathProcessor {
  private lastInsertedPath = "";
  private lastInsertTime = 0;
  private readonly duplicateThresholdMs = 1000;

  formatPaths(paths: readonly string[]): string {
    if (paths.length === 0) {
      return "";
    }
    const formattedPaths = paths.map((path) => `"${path}"`).join("\n");
    return `${formattedPaths}\n`;
  }

  mergePaths(currentValue: string, formattedPaths: string): string {
    if (!formattedPaths) {
      return currentValue;
    }

    if (currentValue && !currentValue.endsWith("\n")) {
      return `${currentValue}\n${formattedPaths}`;
    }

    return currentValue + formattedPaths;
  }

  isDuplicate(path: string): boolean {
    const now = Date.now();
    return (
      path === this.lastInsertedPath &&
      now - this.lastInsertTime < this.duplicateThresholdMs
    );
  }

  recordInsertion(path: string): void {
    this.lastInsertedPath = path;
    this.lastInsertTime = Date.now();
  }

  processSinglePath(path: string, currentValue: string): string | null {
    if (!this.isValidPath(path) || this.isDuplicate(path)) {
      return null;
    }

    this.recordInsertion(path);
    const formatted = this.formatPaths([path]);
    return this.mergePaths(currentValue, formatted);
  }

  processMultiplePaths(
    paths: readonly string[],
    currentValue: string
  ): string | null {
    if (paths.length === 0) {
      return null;
    }

    const validPaths = paths.filter((path) => this.isValidPath(path));
    if (validPaths.length === 0) {
      return null;
    }

    this.recordInsertion(validPaths[0]);
    const formatted = this.formatPaths(validPaths);
    return this.mergePaths(currentValue, formatted);
  }

  clear(): void {
    this.lastInsertedPath = "";
    this.lastInsertTime = 0;
  }

  private isValidPath(path: string): boolean {
    if (!path) {
      return false;
    }

    return (
      path.startsWith("/") ||
      WINDOWS_PATH_PATTERN.test(path) ||
      WINDOWS_POSIX_PATTERN.test(path)
    );
  }
}
