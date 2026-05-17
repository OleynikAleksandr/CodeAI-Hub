import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveProductPartColumns,
  resolveClusterModuleColumns,
  resolveRowAwareModuleColumns,
  defaultProductPartLayout,
  defaultClusterLayout,
  type SlotDescriptor,
} from "./diagram-editor-layout-params";

test("resolveProductPartColumns returns 1 for a single slot", () => {
  const slots: SlotDescriptor[] = [
    { kind: "cluster", moduleCount: 2, moduleColumns: "auto" },
  ];
  assert.equal(
    resolveProductPartColumns(slots, defaultProductPartLayout()),
    1
  );
});

test("resolveProductPartColumns returns 2 for two slots with landscape ratio", () => {
  const slots: SlotDescriptor[] = [
    { kind: "cluster", moduleCount: 2, moduleColumns: "auto" },
    { kind: "cluster", moduleCount: 2, moduleColumns: "auto" },
  ];
  assert.equal(
    resolveProductPartColumns(slots, defaultProductPartLayout()),
    2
  );
});

test("resolveProductPartColumns makes aspect ratio choices visible for auto layout", () => {
  const slots: SlotDescriptor[] = [
    { kind: "standaloneModule" },
    { kind: "standaloneModule" },
  ];

  assert.equal(
    resolveProductPartColumns(slots, {
      columns: "auto",
      targetAspectRatio: "square",
    }),
    1
  );
  assert.equal(
    resolveProductPartColumns(slots, {
      columns: "auto",
      targetAspectRatio: "wide",
    }),
    2
  );
});

test("resolveProductPartColumns keeps adjacent clusters while capping row module slots", () => {
  const slots: SlotDescriptor[] = [
    { kind: "cluster", moduleCount: 3, moduleColumns: "auto" },
    { kind: "cluster", moduleCount: 3, moduleColumns: "auto" },
  ];

  const columns = resolveProductPartColumns(slots, defaultProductPartLayout());

  assert.equal(columns, 2);
  assert.deepEqual(resolveRowAwareModuleColumns(slots, columns), [2, 1]);
});

test("resolveProductPartColumns avoids four standalone modules in one automatic row", () => {
  const slots: SlotDescriptor[] = [
    { kind: "standaloneModule" },
    { kind: "standaloneModule" },
    { kind: "standaloneModule" },
    { kind: "standaloneModule" },
  ];

  assert.equal(
    resolveProductPartColumns(slots, defaultProductPartLayout()),
    3
  );
});

test("resolveProductPartColumns prefers wider layout with 5 slots and landscape", () => {
  const slots: SlotDescriptor[] = [
    { kind: "cluster", moduleCount: 2, moduleColumns: "auto" },
    { kind: "cluster", moduleCount: 3, moduleColumns: "auto" },
    { kind: "standaloneModule" },
    { kind: "standaloneModule" },
    { kind: "standaloneModule" },
  ];
  const cols = resolveProductPartColumns(slots, defaultProductPartLayout());
  assert.ok(cols >= 2 && cols <= 5, `Expected 2-5 columns, got ${cols}`);
});

test("resolveProductPartColumns respects explicit column override", () => {
  const slots: SlotDescriptor[] = [
    { kind: "cluster", moduleCount: 2, moduleColumns: "auto" },
    { kind: "cluster", moduleCount: 2, moduleColumns: "auto" },
    { kind: "standaloneModule" },
  ];
  assert.equal(
    resolveProductPartColumns(slots, { columns: 3, targetAspectRatio: "landscape" }),
    3
  );
});

test("resolveRowAwareModuleColumns respects explicit cluster module override", () => {
  const slots: SlotDescriptor[] = [
    { kind: "cluster", moduleCount: 3, moduleColumns: 2 },
    { kind: "cluster", moduleCount: 3, moduleColumns: "auto" },
  ];

  assert.deepEqual(resolveRowAwareModuleColumns(slots, 2), [2, 1]);
});

test("resolveRowAwareModuleColumns caps auto clusters when product part columns are explicit", () => {
  const slots: SlotDescriptor[] = [
    { kind: "cluster", moduleCount: 3, moduleColumns: "auto" },
    { kind: "cluster", moduleCount: 3, moduleColumns: "auto" },
  ];

  assert.deepEqual(resolveRowAwareModuleColumns(slots, 2), [2, 1]);
});

test("resolveClusterModuleColumns returns 1 for 1-2 modules auto", () => {
  assert.equal(resolveClusterModuleColumns(1, defaultClusterLayout()), 1);
  assert.equal(resolveClusterModuleColumns(2, defaultClusterLayout()), 1);
});

test("resolveClusterModuleColumns returns 2 for 3+ modules auto", () => {
  assert.equal(resolveClusterModuleColumns(3, defaultClusterLayout()), 2);
  assert.equal(resolveClusterModuleColumns(5, defaultClusterLayout()), 2);
});

test("resolveClusterModuleColumns respects explicit override", () => {
  assert.equal(resolveClusterModuleColumns(2, { moduleColumns: 3 }), 3);
  assert.equal(resolveClusterModuleColumns(5, { moduleColumns: 1 }), 1);
});

test("default factories return expected values", () => {
  const pp = defaultProductPartLayout();
  assert.equal(pp.columns, "auto");
  assert.equal(pp.targetAspectRatio, "landscape");

  const cl = defaultClusterLayout();
  assert.equal(cl.moduleColumns, "auto");
});
