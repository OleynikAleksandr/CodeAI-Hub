import type { BrowserLocalizationBootstrapSnapshot } from "../../ui/src/app-host/localization-runtime-contract";
import { resolveBridgeConfig } from "./bridge-config";

const LOCALIZATION_BOOTSTRAP_PATH = "/api/v1/localization/bootstrap";

export const fetchProjectManagerLocalizationBootstrap =
  async (): Promise<BrowserLocalizationBootstrapSnapshot> => {
    const { httpUrl } = resolveBridgeConfig();

    try {
      const response = await fetch(`${httpUrl}${LOCALIZATION_BOOTSTRAP_PATH}`);
      if (!response.ok) {
        return null;
      }

      return (await response.json()) as BrowserLocalizationBootstrapSnapshot;
    } catch {
      return null;
    }
  };
