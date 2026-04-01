import type React from "react";

export const VirtualSimulationHelp: React.FC = () => (
  <div className="pm-details">
    <div style={{ marginBottom: 12 }}>
      <strong>Virtual Simulation Help</strong>
    </div>
    <div style={{ display: "grid", gap: 10 }}>
      <div>
        In the Virtual Simulation step, the agent turns{" "}
        <code>Final_Description.md</code> into the scenario baseline for the
        system. The resulting document must stay understandable for the user
        while also serving as the foundation for the next step.
      </div>
      <div>
        The scenarios from the questionnaire and{" "}
        <code>Final_Description.md</code> are only the starting point. The
        agent must gather enough key scenarios to cover the whole system,
        rather than merely retelling the original user flows.
      </div>
      <div>
        What is most useful to clarify in the dialog:
        <ul style={{ marginTop: 6 }}>
          <li>who starts each important scenario;</li>
          <li>which parts of the product take part in it;</li>
          <li>what lives separately and where boundaries are already visible;</li>
          <li>which system reaction counts as successful.</li>
        </ul>
      </div>
      <div>
        Short glossary:
        <ul style={{ marginTop: 6 }}>
          <li>
            <code>Shell</code> is the product shell through which the user
            launches or opens the system.
          </li>
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
        <code>virtual-simulation.md</code> should contain as many scenarios as
        needed to cover the product without blind spots. Related system
        behaviors can be grouped for clarity, but not to satisfy an artificial
        numeric limit.
      </div>
      <div>
        The agent should ask only the missing questions and stop refining once
        it considers the document a strong enough foundation for the next step.
        The decision to move on still stays with you.
      </div>
      <div>
        Step output:{" "}
        <code>
          .codeai-hub/&lt;workspace&gt;/virtual_simulation/virtual-simulation.md
        </code>
        .
      </div>
    </div>
  </div>
);
