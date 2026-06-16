import type { ProviderStackId } from "../../../../types/provider";

// Provider tint tokens mirror DesignSystem/CorporateDesign.html so the
// stage confirmation card radio pills carry the same hue as the sidebar
// tree and the model/reasoning chips.
export type ProviderTintTokens = {
  readonly accent: string;
  readonly fill: string;
  readonly border: string;
  readonly badgeBackground: string;
};

export const PROVIDER_TINT_TOKENS: Record<ProviderStackId, ProviderTintTokens> =
  {
    claudeCodeCli: {
      accent: "rgba(240, 188, 132, 0.62)",
      fill: "rgba(255, 145, 5, 0.10)",
      border: "rgba(255, 145, 5, 0.40)",
      badgeBackground: "rgba(255, 145, 5, 0.16)",
    },
    codexCli: {
      accent: "rgba(1, 240, 216, 0.60)",
      fill: "rgba(1, 240, 216, 0.10)",
      border: "rgba(1, 240, 216, 0.40)",
      badgeBackground: "rgba(1, 240, 216, 0.16)",
    },
    geminiCli: {
      accent: "rgba(202, 178, 210, 0.62)",
      fill: "rgba(171, 52, 203, 0.08)",
      border: "rgba(171, 52, 203, 0.30)",
      badgeBackground: "rgba(171, 52, 203, 0.13)",
    },
    kimiCode: {
      accent: "rgba(119, 214, 255, 0.64)",
      fill: "rgba(76, 181, 255, 0.10)",
      border: "rgba(76, 181, 255, 0.36)",
      badgeBackground: "rgba(76, 181, 255, 0.15)",
    },
    glmOpenCode: {
      accent: "rgba(113, 230, 205, 0.66)",
      fill: "rgba(28, 203, 172, 0.10)",
      border: "rgba(28, 203, 172, 0.36)",
      badgeBackground: "rgba(28, 203, 172, 0.15)",
    },
    localModels: {
      accent: "rgba(245, 216, 122, 0.68)",
      fill: "rgba(245, 216, 122, 0.10)",
      border: "rgba(245, 216, 122, 0.36)",
      badgeBackground: "rgba(245, 216, 122, 0.15)",
    },
  };
