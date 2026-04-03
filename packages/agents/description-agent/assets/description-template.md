# Description Help

At the Description step, you explain the future software product in plain language, and the agent turns that into a clear product description and an initial architectural picture.

## What is most useful to fill in the questionnaire

- what kind of product or platform it is;
- what the product is about and which problem it solves;
- who will use it;
- the key usage scenarios without an artificial limit;
- what the product absolutely must be able to do;
- which large parts and boundaries are already visible;
- constraints, out-of-scope items, and notes.

We recommend describing the product in a cluster-module architecture mindset.

That does not mean the user must already know architectural terms. It is enough to describe the product as a set of understandable parts, large blocks, and boundaries between them. This helps the AI understand the system more accurately and move it more carefully into the next steps.

## Why this helps

- the product does not collapse into one vague giant block;
- the major parts of the system become visible earlier;
- the boundaries between blocks are easier to discuss and verify;
- the next steps can build scenarios and diagrams more reliably.

## Short glossary

- `Shell` is the surface through which the user launches or opens the product.
- `Product Part` is a high-level part of the product that can live, run, or be delivered separately.
- `Cluster` is a large block made of several modules.
- `Module` is a separate working block with one clear role.
- `Boundary` is a border between system blocks.

When the questionnaire is ready, click `Submit questionnaire`. After that, the AI provider picker will open. In the current MVP, the provider is chosen once for the whole workflow workspace, not separately for each step. Then continue the dialogue and refine the document until you consider it a strong enough foundation for the next step.

Make sure the final `Final_Description.md` includes a dedicated block of key user scenarios. There should be as many scenarios as needed to cover the product without blind spots.

Step output: `.codeai-hub/<workspace>/description/Final_Description.md`. This document should be understandable to the user while also serving as the baseline for the next step.
