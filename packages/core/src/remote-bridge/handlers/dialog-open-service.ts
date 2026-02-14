import type { ContinuityIndexEntry } from "../../session-continuity/index-registry";
import type { Logger } from "../../telemetry/logger";
import { DialogListService } from "./dialog-list-service";

export class DialogOpenService {
  private readonly listService: DialogListService;

  constructor(options: { readonly logger: Logger }) {
    this.listService = new DialogListService(options);
  }

  async openDialog(options: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
    readonly dialogId: string;
  }): Promise<ContinuityIndexEntry | null> {
    const dialogs = await this.listService.listDialogs({
      workspaceRoot: options.workspaceRoot,
      workspaceSlug: options.workspaceSlug,
    });
    return dialogs.find((entry) => entry.dialogId === options.dialogId) ?? null;
  }
}
