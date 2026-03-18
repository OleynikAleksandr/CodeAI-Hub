import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiagramFacadesContract,
  buildDiagramModulesContract,
} from "./idea-contract-service";

test("diagram modules contract embeds field reference and merge rules into prompt", async () => {
  const contract = await buildDiagramModulesContract();

  assert.notEqual(contract, null);
  assert.equal(
    contract?.prompt.includes(
      "one of `service`, `library`, `adapter`, `gateway`, `store`, `external`"
    ),
    true
  );
  assert.equal(
    contract?.prompt.includes(
      "Do not silently recreate modules or relations removed by the user."
    ),
    true
  );
});

test("diagram facades contract embeds field reference and merge rules into prompt", async () => {
  const contract = await buildDiagramFacadesContract();

  assert.notEqual(contract, null);
  assert.equal(contract?.prompt.includes("Kind`: currently `class`."), true);
  assert.equal(
    contract?.prompt.includes(
      "Keep facade ownership aligned with the current `module-map.md`"
    ),
    true
  );
});
