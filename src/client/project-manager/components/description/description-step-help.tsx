import type React from "react";
import { useResolvedLocalization } from "../../../ui/src/app-host/use-localization";
import { useProjectManagerSettings } from "../settings/use-project-manager-settings";

export const DescriptionStepHelp: React.FC = () => {
  const { settings } = useProjectManagerSettings();
  const { t } = useResolvedLocalization(settings);

  return (
    <div className="pm-details">
      <div style={{ marginBottom: 12 }}>
        <strong>{t("user_guidance", "pm.description.help.title", "Description Help")}</strong>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          {t(
            "user_guidance",
            "pm.description.help.intro",
            "In the Description step, you explain the future software product in plain language, and the agent turns that into a clear product description and an initial architectural picture."
          )}
        </div>
        <div>
          {t(
            "user_guidance",
            "pm.description.help.questionnaire_intro",
            "What is most useful to fill in the questionnaire:"
          )}
          <ul style={{ marginTop: 6 }}>
            <li>{t("user_guidance", "pm.description.help.questionnaire_item_1", "what kind of product or platform it is;")}</li>
            <li>{t("user_guidance", "pm.description.help.questionnaire_item_2", "what the product is about and which problem it solves;")}</li>
            <li>{t("user_guidance", "pm.description.help.questionnaire_item_3", "who will use it;")}</li>
            <li>{t("user_guidance", "pm.description.help.questionnaire_item_4", "the key usage scenarios without an artificial limit;")}</li>
            <li>{t("user_guidance", "pm.description.help.questionnaire_item_5", "what the product absolutely must be able to do;")}</li>
            <li>{t("user_guidance", "pm.description.help.questionnaire_item_6", "which large parts and boundaries are already visible;")}</li>
            <li>{t("user_guidance", "pm.description.help.questionnaire_item_7", "constraints, out-of-scope items, and notes.")}</li>
          </ul>
        </div>
        <div>
          {t(
            "user_guidance",
            "pm.description.help.cluster_module_note",
            "We recommend describing the product in a cluster-module architecture mindset."
          )}
        </div>
        <div>
          {t(
            "user_guidance",
            "pm.description.help.cluster_module_explanation",
            "That does not mean the user must already know architectural terms. It is enough to describe the product as a set of understandable parts, large blocks, and boundaries between them. This helps the AI understand the system more accurately and move it more carefully into the next steps."
          )}
        </div>
        <div>
          {t(
            "user_guidance",
            "pm.description.help.why_it_helps_intro",
            "Why this helps:"
          )}
          <ul style={{ marginTop: 6 }}>
            <li>{t("user_guidance", "pm.description.help.why_it_helps_item_1", "the product does not collapse into one vague giant block;")}</li>
            <li>{t("user_guidance", "pm.description.help.why_it_helps_item_2", "the major parts of the system become visible earlier;")}</li>
            <li>{t("user_guidance", "pm.description.help.why_it_helps_item_3", "the boundaries between blocks are easier to discuss and verify;")}</li>
            <li>{t("user_guidance", "pm.description.help.why_it_helps_item_4", "the next steps can build scenarios and diagrams more reliably.")}</li>
          </ul>
        </div>
        <div>
          {t("user_guidance", "pm.description.help.glossary_intro", "Short glossary:")}
          <ul style={{ marginTop: 6 }}>
            <li>
              <code>Shell</code>{" "}
              {t("user_guidance", "pm.description.help.glossary.shell", "is the surface through which the user launches or opens the product.")}
            </li>
            <li>
              <code>Product Part</code>{" "}
              {t("user_guidance", "pm.description.help.glossary.product_part", "is a high-level part of the product that can live, run, or be delivered separately.")}
            </li>
            <li>
              <code>Cluster</code>{" "}
              {t("user_guidance", "pm.description.help.glossary.cluster", "is a large block made of several modules.")}
            </li>
            <li>
              <code>Module</code>{" "}
              {t("user_guidance", "pm.description.help.glossary.module", "is a separate working block with one clear role.")}
            </li>
            <li>
              <code>Boundary</code>{" "}
              {t("user_guidance", "pm.description.help.glossary.boundary", "is a border between system blocks.")}
            </li>
          </ul>
        </div>
        <div>
          {t(
            "user_guidance",
            "pm.description.help.submit_guidance",
            "When the questionnaire is ready, click `Submit questionnaire`. After that, the AI provider picker will open. In the current MVP, the provider is chosen once for the whole workflow workspace, not separately for each step. Then continue the dialog and refine the document until you consider it a strong enough foundation for the next step."
          )}
        </div>
        <div>
          {t(
            "user_guidance",
            "pm.description.help.final_description_guidance",
            "Make sure the final `Final_Description.md` includes a dedicated section with key user scenarios. There should be as many scenarios as needed to cover the product without blind spots."
          )}
        </div>
        <div>
          {t(
            "user_guidance",
            "pm.description.help.output",
            "Step output: `.codeai-hub/<workspace>/description/Final_Description.md`."
          )}
        </div>
      </div>
    </div>
  );
};
