import test from "node:test";
import assert from "node:assert/strict";
import { getResultStripLayout } from "../../../frontend/src/lib/result-strip-layout";

test("result strip layout uses tighter columns for crowded participant grids", () => {
  assert.deepEqual(getResultStripLayout(6), {
    columnWidthPx: 92,
    gapPx: 12,
  });
});

test("result strip layout keeps a readable fixed preview width for smaller groups", () => {
  assert.deepEqual(getResultStripLayout(1), {
    columnWidthPx: 168,
    gapPx: 18,
  });

  assert.deepEqual(getResultStripLayout(3), {
    columnWidthPx: 132,
    gapPx: 16,
  });
});
