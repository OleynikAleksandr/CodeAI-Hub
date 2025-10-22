import type { DragDropLogger } from "./data-transfer-file-extractor";
import { extractFilePathsFromDataTransfer } from "./data-transfer-file-extractor";

export type DragDropCallbacks = {
  readonly onDragEnter?: (isShiftPressed: boolean) => void;
  readonly onDragLeave?: () => void;
  readonly onFileDrop?: (filePaths: readonly string[]) => void;
  readonly onFallbackRequest?: () => void;
};

export type DragDropHandlerOptions = {
  readonly logger?: DragDropLogger;
};

export class DragDropHandler {
  private container: HTMLElement | null = null;
  private callbacks: DragDropCallbacks = {};
  private readonly logger?: DragDropLogger;

  constructor(options: DragDropHandlerOptions = {}) {
    this.logger = options.logger;

    this.handleDragEnter = this.handleDragEnter.bind(this);
    this.handleDragOver = this.handleDragOver.bind(this);
    this.handleDragLeave = this.handleDragLeave.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
  }

  attach(container: HTMLElement, callbacks: DragDropCallbacks): void {
    this.container = container;
    this.callbacks = callbacks;

    container.addEventListener("dragenter", this.handleDragEnter);
    container.addEventListener("dragover", this.handleDragOver);
    container.addEventListener("dragleave", this.handleDragLeave);
    container.addEventListener("drop", this.handleDrop);
  }

  detach(): void {
    if (!this.container) {
      return;
    }

    this.container.removeEventListener("dragenter", this.handleDragEnter);
    this.container.removeEventListener("dragover", this.handleDragOver);
    this.container.removeEventListener("dragleave", this.handleDragLeave);
    this.container.removeEventListener("drop", this.handleDrop);

    this.container = null;
    this.callbacks = {};
  }

  private handleDragEnter(event: DragEvent): void {
    if (!event.shiftKey) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.callbacks.onDragEnter?.(true);
    this.logger?.("dragenter", event.dataTransfer?.types ?? []);
  }

  private handleDragOver(event: DragEvent): void {
    if (!event.shiftKey) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  private handleDragLeave(event: DragEvent): void {
    const relatedTarget = event.relatedTarget as Node | null;
    if (
      this.container &&
      relatedTarget &&
      this.container.contains(relatedTarget)
    ) {
      return;
    }

    this.callbacks.onDragLeave?.();
  }

  private handleDrop(event: DragEvent): void {
    if (!event.shiftKey) {
      return;
    }

    event.preventDefault();

    const filePaths = extractFilePathsFromDataTransfer(event.dataTransfer, {
      debug: Boolean(this.logger),
      logger: this.logger,
      logPrefix: "[DragDropHandler]",
    });

    if (filePaths.length > 0) {
      this.callbacks.onFileDrop?.(filePaths);
    } else {
      this.callbacks.onFallbackRequest?.();
    }

    this.callbacks.onDragLeave?.();
  }
}
