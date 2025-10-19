export class FilePathCache {
  private lastCapturedPath = "";
  private lastCaptureTime = 0;
  private readonly cacheTimeoutMs = 5000;

  cachePath(path: string): void {
    this.lastCapturedPath = path;
    this.lastCaptureTime = Date.now();
  }

  getCachedPaths(): string[] | null {
    const now = Date.now();
    if (
      this.lastCapturedPath &&
      now - this.lastCaptureTime < this.cacheTimeoutMs
    ) {
      const paths = this.lastCapturedPath
        .split("\n")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      return paths.length > 0 ? paths : null;
    }
    return null;
  }

  isCacheValid(): boolean {
    const now = Date.now();
    return (
      this.lastCapturedPath !== "" &&
      now - this.lastCaptureTime < this.cacheTimeoutMs
    );
  }

  clear(): void {
    this.lastCapturedPath = "";
    this.lastCaptureTime = 0;
  }

  getCacheAge(): number {
    if (this.lastCaptureTime === 0) {
      return -1;
    }
    return Date.now() - this.lastCaptureTime;
  }
}
