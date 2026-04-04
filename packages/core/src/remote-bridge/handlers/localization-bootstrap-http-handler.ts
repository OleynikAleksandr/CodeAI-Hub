import { LocalizationFacade } from "@codeai-hub/localization";
import type { Request, Response } from "express";

const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_ERROR = 500;

export const handleLocalizationBootstrapRead = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const snapshot =
      await new LocalizationFacade().loadRuntimeBootstrapSnapshot();

    if (!snapshot) {
      res.status(HTTP_NOT_FOUND).json({
        error: "Localization bootstrap snapshot is unavailable",
      });
      return;
    }

    res.json(snapshot);
  } catch (error) {
    res.status(HTTP_INTERNAL_ERROR).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to read localization bootstrap snapshot",
    });
  }
};
