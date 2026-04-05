export interface CodexRolloutCursor {
  readonly filePath: string;
  readonly nextLine: number;
}

export class CodexRolloutTailState {
  private cursor: CodexRolloutCursor | null = null;

  advance(cursor: CodexRolloutCursor): void {
    this.cursor = {
      filePath: cursor.filePath,
      nextLine: Math.max(0, cursor.nextLine),
    };
  }

  clear(): void {
    this.cursor = null;
  }

  resolveSinceLine(filePath: string): number {
    return this.cursor?.filePath === filePath ? this.cursor.nextLine : 0;
  }

  snapshot(): CodexRolloutCursor | null {
    if (!this.cursor) {
      return null;
    }
    return { ...this.cursor };
  }
}
