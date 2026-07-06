import test from "node:test";
import assert from "node:assert/strict";
import { getResultStripLayout } from "../../../frontend/src/lib/result-strip-layout";

test("result strip layout uses tighter columns for crowded participant grids", () => {
  assert.deepEqual(getResultStripLayout(6), {
    columnMinWidth: 92,
    gapPx: 12,
  });
});

test("result strip layout keeps roomier columns for smaller groups", () => {
  assert.deepEqual(getResultStripLayout(3), {
    columnMinWidth: 120,
    gapPx: 16,
  });
});
