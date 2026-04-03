# Diagram Modules Merge Rules

When the runtime provides a change summary:
- preserve clusters, modules, and relations added by the user unless the new upstream context clearly contradicts them;
- preserve user-modified `purpose`, `responsibility`, `membership`, and ownership fields on existing entities;
- preserve user-approved subsystem boundaries from `Final_Description.md` and `virtual-simulation.md` unless the new upstream context explicitly changes them;
- preserve user-approved top-level product contours even when the current DSL cannot express them perfectly; record that through `Assumptions / Open Questions`;
- do not silently restore modules or relations that the user removed;
- do not silently convert standalone modules into cluster members or move modules between clusters without a clear upstream reason;
- do not silently collapse separately living product parts into one fake cluster just because the DSL looks flatter than the architecture;
- do not silently restore decorative clusters or loose analytical labels that the user already removed;
- if a removed cluster, module, or relation really must return, explain that explicitly in `Assumptions / Open Questions`;
- prefer carefully extending the current staged artifacts over rewriting IDs or reshaping user-owned boundaries;
- if a boundary or ownership contour is still ambiguous, keep the current user-approved structure and record the ambiguity in `Assumptions / Open Questions` instead of imposing a new grouping.
