import type React from "react";

export const DiagramModulesHelp: React.FC = () => (
  <div className="pm-details">
    <div style={{ marginBottom: 12 }}>
      <strong>Diagram Modules Help</strong>
    </div>
    <div style={{ display: "grid", gap: 10 }}>
      <div>
        In the Diagram Modules step, the agent turns{" "}
        <code>Final_Description.md</code> and <code>virtual-simulation.md</code>{" "}
        into the canonical system composition. The step no longer starts from a
        single giant inventory file. It starts with{" "}
        <code>product-parts.index.md</code> and then progressively materializes{" "}
        <code>product-parts/&lt;part-id&gt;.md</code>.
      </div>
      <div>
        The main rule of the step is that the semantic map of the system is
        agreed first, and only then does the runtime progressively build the
        diagram from it. The user should see Product Parts appear one by one
        without waiting for the whole step to finish.
      </div>
      <div>
        The base semantic source of truth is now two-layered:{" "}
        <code>product-parts.index.md</code> defines the order and the global
        outline, while the part files define the real content of each Product
        Part. The part files are the final artifact of this step.
      </div>
      <div>
        In the visual hierarchy of this step, ownership reads as{" "}
        <code>Product Part -&gt; Cluster -&gt; Module</code>.
      </div>
      <div>
        What is most useful to clarify in the dialog:
        <ul style={{ marginTop: 6 }}>
          <li>which parts of the product really exist;</li>
          <li>which blocks belong to one cluster and which should stay apart;</li>
          <li>which simple relations between blocks matter for understanding;</li>
          <li>which boundaries must not be merged even if the DSL is still flat.</li>
        </ul>
      </div>
      <div>
        Short glossary:
        <ul style={{ marginTop: 6 }}>
          <li>
            <code>Product Part</code> is a high-level part of the product that
            can live, run, or be delivered separately.
          </li>
          <li>
            <code>Cluster</code> is a large block made of several modules with
            one external entry point through a facade.
          </li>
          <li>
            <code>Module</code> is a separate working block with one clear role
            and its own facade.
          </li>
          <li>
            <code>Boundary</code> is a border between parts of the system.
          </li>
        </ul>
      </div>
      <div>
        The runtime templates for this step live in{" "}
        <code>.codeai-hub/templates/diagram_modules/</code>: the main frame
        defines the staged contract for the index and part files,{" "}
        <code>diagram-modules-field-reference.md</code> explains the field
        meanings, and the merge and compatibility aggregate rules are described
        in{" "}
        <code>diagram-modules-merge-rules.md</code>.
      </div>
      <div>
        <code>module-map.flow.json</code> does not describe the architecture.
        This file stores layout only and may update during progressive graph
        regeneration or after manual card dragging.
      </div>
      <div>
        The agent should ask only the missing questions and stop refining once
        it considers the inventory a strong enough foundation to continue. The
        decision to move forward still stays with you.
      </div>
    </div>
  </div>
);
