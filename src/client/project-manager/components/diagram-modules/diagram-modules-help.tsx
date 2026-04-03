import type React from "react";
import { useLocalization } from "../../../ui/src/app-host/use-localization";

const USER_MESSAGES_CATEGORY = "system_feedback";

export const DiagramModulesHelp: React.FC = () => {
  const { t } = useLocalization();

  return (
    <div className="pm-details">
      <div style={{ marginBottom: 12 }}>
        <strong>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.diagram_modules.help.title",
            "Diagram Modules Help"
          )}
        </strong>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.diagram_modules.help.intro",
            "In the Diagram Modules step, the agent turns `Final_Description.md` and `virtual-simulation.md` into the canonical system composition. The step no longer starts from a single giant inventory file. It starts with `product-parts.index.md` and then progressively materializes `product-parts/<part-id>.md`."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.diagram_modules.help.progressive_rule",
            "The main rule of the step is that the semantic map of the system is agreed first, and only then does the runtime progressively build the diagram from it. The user should see Product Parts appear one by one without waiting for the whole step to finish."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.diagram_modules.help.semantic_source_of_truth",
            "The base semantic source of truth is now two-layered: `product-parts.index.md` defines the order and the global outline, while the part files define the real content of each Product Part. The part files are the final artifact of this step."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.diagram_modules.help.hierarchy",
            "In the visual hierarchy of this step, ownership reads as `Product Part -> Cluster -> Module`."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.diagram_modules.help.dialog_intro",
            "What is most useful to clarify in the dialog:"
          )}
          <ul style={{ marginTop: 6 }}>
            <li>
              {t(
                USER_MESSAGES_CATEGORY,
                "pm.diagram_modules.help.dialog_item_1",
                "which parts of the product really exist;"
              )}
            </li>
            <li>
              {t(
                USER_MESSAGES_CATEGORY,
                "pm.diagram_modules.help.dialog_item_2",
                "which blocks belong to one cluster and which should stay apart;"
              )}
            </li>
            <li>
              {t(
                USER_MESSAGES_CATEGORY,
                "pm.diagram_modules.help.dialog_item_3",
                "which simple relations between blocks matter for understanding;"
              )}
            </li>
            <li>
              {t(
                USER_MESSAGES_CATEGORY,
                "pm.diagram_modules.help.dialog_item_4",
                "which boundaries must not be merged even if the DSL is still flat."
              )}
            </li>
          </ul>
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.diagram_modules.help.glossary_intro",
            "Short glossary:"
          )}
          <ul style={{ marginTop: 6 }}>
            <li>
              {t(
                USER_MESSAGES_CATEGORY,
                "pm.diagram_modules.help.glossary.product_part",
                "`Product Part` is a high-level part of the product that can live, run, or be delivered separately."
              )}
            </li>
            <li>
              {t(
                USER_MESSAGES_CATEGORY,
                "pm.diagram_modules.help.glossary.cluster",
                "`Cluster` is a large block made of several modules with one external entry point through a facade."
              )}
            </li>
            <li>
              {t(
                USER_MESSAGES_CATEGORY,
                "pm.diagram_modules.help.glossary.module",
                "`Module` is a separate working block with one clear role and its own facade."
              )}
            </li>
            <li>
              {t(
                USER_MESSAGES_CATEGORY,
                "pm.diagram_modules.help.glossary.boundary",
                "`Boundary` is a border between parts of the system."
              )}
            </li>
          </ul>
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.diagram_modules.help.runtime_templates",
            "The runtime templates for this step live in `.codeai-hub/templates/diagram_modules/`: the main frame defines the staged contract for the index and part files, `diagram-modules-field-reference.md` explains the field meanings, and the merge and compatibility aggregate rules are described in `diagram-modules-merge-rules.md`."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.diagram_modules.help.module_map_note",
            "`module-map.flow.json` does not describe the architecture. This file stores layout only and may update during progressive graph regeneration or after manual card dragging."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.diagram_modules.help.refinement_guidance",
            "The agent should ask only the missing questions and stop refining once it considers the inventory a strong enough foundation to continue. The decision to move forward still stays with you."
          )}
        </div>
      </div>
    </div>
  );
};
