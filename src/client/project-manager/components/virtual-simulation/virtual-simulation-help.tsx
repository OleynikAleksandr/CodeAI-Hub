import type React from "react";
import { useResolvedLocalization } from "../../../ui/src/app-host/use-localization";
import { useProjectManagerSettings } from "../settings/use-project-manager-settings";

export const VirtualSimulationHelp: React.FC = () => {
  const { settings } = useProjectManagerSettings();
  const { t } = useResolvedLocalization(settings);

  return (
    <div className="pm-details">
      <div style={{ marginBottom: 12 }}>
        <strong>
          {t(
            "user_guidance",
            "pm.virtual_simulation.help.title",
            "Virtual Simulation Help"
          )}
        </strong>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          {t(
            "user_guidance",
            "pm.virtual_simulation.help.intro",
            "In the Virtual Simulation step, the agent turns `Final_Description.md` into the scenario baseline for the system. The resulting document must stay understandable for the user while also serving as the foundation for the next step."
          )}
        </div>
        <div>
          {t(
            "user_guidance",
            "pm.virtual_simulation.help.scenario_scope",
            "The scenarios from the questionnaire and `Final_Description.md` are only the starting point. The agent must gather enough key scenarios to cover the whole system, rather than merely retelling the original user flows."
          )}
        </div>
        <div>
          {t(
            "user_guidance",
            "pm.virtual_simulation.help.dialog_intro",
            "What is most useful to clarify in the dialog:"
          )}
          <ul style={{ marginTop: 6 }}>
            <li>{t("user_guidance", "pm.virtual_simulation.help.dialog_item_1", "who starts each important scenario;")}</li>
            <li>{t("user_guidance", "pm.virtual_simulation.help.dialog_item_2", "which parts of the product take part in it;")}</li>
            <li>{t("user_guidance", "pm.virtual_simulation.help.dialog_item_3", "what lives separately and where boundaries are already visible;")}</li>
            <li>{t("user_guidance", "pm.virtual_simulation.help.dialog_item_4", "which system reaction counts as successful.")}</li>
          </ul>
        </div>
        <div>
          {t(
            "user_guidance",
            "pm.virtual_simulation.help.glossary_intro",
            "Short glossary:"
          )}
          <ul style={{ marginTop: 6 }}>
            <li>
              <code>Shell</code>{" "}
              {t("user_guidance", "pm.virtual_simulation.help.glossary.shell", "is the product shell through which the user launches or opens the system.")}
            </li>
            <li>
              <code>Product Part</code>{" "}
              {t("user_guidance", "pm.virtual_simulation.help.glossary.product_part", "is a high-level part of the product that can live, run, or be delivered separately.")}
            </li>
            <li>
              <code>Cluster</code>{" "}
              {t("user_guidance", "pm.virtual_simulation.help.glossary.cluster", "is a large block made of several modules with one external entry point through a facade.")}
            </li>
            <li>
              <code>Module</code>{" "}
              {t("user_guidance", "pm.virtual_simulation.help.glossary.module", "is a separate working block with one clear role and its own facade.")}
            </li>
            <li>
              <code>Boundary</code>{" "}
              {t("user_guidance", "pm.virtual_simulation.help.glossary.boundary", "is a border between parts of the system.")}
            </li>
          </ul>
        </div>
        <div>
          {t(
            "user_guidance",
            "pm.virtual_simulation.help.coverage_guidance",
            "`virtual-simulation.md` should contain as many scenarios as needed to cover the product without blind spots. Related system behaviors can be grouped for clarity, but not to satisfy an artificial numeric limit."
          )}
        </div>
        <div>
          {t(
            "user_guidance",
            "pm.virtual_simulation.help.refinement_guidance",
            "The agent should ask only the missing questions and stop refining once it considers the document a strong enough foundation for the next step. The decision to move on still stays with you."
          )}
        </div>
        <div>
          {t(
            "user_guidance",
            "pm.virtual_simulation.help.output",
            "Step output: `.codeai-hub/<workspace>/virtual_simulation/virtual-simulation.md`."
          )}
        </div>
      </div>
    </div>
  );
};
