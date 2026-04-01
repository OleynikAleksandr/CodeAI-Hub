import type React from "react";
export const DescriptionStepHelp: React.FC = () => (
  <div className="pm-details">
    <div style={{ marginBottom: 12 }}>
      <strong>Description Help</strong>
    </div>
    <div style={{ display: "grid", gap: 10 }}>
      <div>
        In the Description step, you explain the future software product in
        plain language, and the agent turns that into a clear product
        description and an initial architectural picture.
      </div>
      <div>
        What is most useful to fill in the questionnaire:
        <ul style={{ marginTop: 6 }}>
          <li>what kind of product or platform it is;</li>
          <li>what the product is about and which problem it solves;</li>
          <li>who will use it;</li>
          <li>the key usage scenarios without an artificial limit;</li>
          <li>what the product absolutely must be able to do;</li>
          <li>which large parts and boundaries are already visible;</li>
          <li>constraints, out-of-scope items, and notes.</li>
        </ul>
      </div>
      <div>
        We recommend describing the product in a cluster-module architecture
        mindset.
      </div>
      <div>
        That does not mean the user must already know architectural terms. It
        is enough to describe the product as a set of understandable parts,
        large blocks, and boundaries between them. This helps the AI understand
        the system more accurately and move it more carefully into the next
        steps.
      </div>
      <div>
        Why this helps:
        <ul style={{ marginTop: 6 }}>
          <li>the product does not collapse into one vague giant block;</li>
          <li>the major parts of the system become visible earlier;</li>
          <li>the boundaries between blocks are easier to discuss and verify;</li>
          <li>the next steps can build scenarios and diagrams more reliably.</li>
        </ul>
      </div>
      <div>
        Short glossary:
        <ul style={{ marginTop: 6 }}>
          <li>
            <code>Shell</code> is the surface through which the user launches or
            opens the product.
          </li>
          <li>
            <code>Product Part</code> is a high-level part of the product that
            can live, run, or be delivered separately.
          </li>
          <li>
            <code>Cluster</code> is a large block made of several modules.
          </li>
          <li>
            <code>Module</code> is a separate working block with one clear role.
          </li>
          <li>
            <code>Boundary</code> is a border between system blocks.
          </li>
        </ul>
      </div>
      <div>
        When the questionnaire is ready, click{" "}
        <code>Submit questionnaire</code>. After that, the AI provider picker
        will open. In the current MVP, the provider is chosen once for the
        whole workflow workspace, not separately for each step. Then continue
        the dialog and refine the document until you consider it a strong
        enough foundation for the next step.
      </div>
      <div>
        Make sure the final <code>Final_Description.md</code> includes a
        dedicated section with key user scenarios. There should be as many
        scenarios as needed to cover the product without blind spots.
      </div>
      <div>
        Step output:{" "}
        <code>.codeai-hub/&lt;workspace&gt;/description/Final_Description.md</code>.
      </div>
    </div>
  </div>
);
