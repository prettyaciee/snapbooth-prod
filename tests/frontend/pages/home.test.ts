import test from "node:test";
import assert from "node:assert/strict";

test("home page defines a showcase of sample photo strips", async () => {
  const home = await import("../../../frontend/src/pages/home");

  assert.equal(home.PHOTO_STRIP_SAMPLES.length, 3);
  assert.ok(
    home.PHOTO_STRIP_SAMPLES.every((strip) => strip.frames.length === 4),
    "each sample strip should show four finished frames",
  );
});

test("home page keeps arcade mode labels tied to group sizes", async () => {
  const home = await import("../../../frontend/src/pages/home");

  assert.deepEqual(
    home.MODES.map(({ label, count }) => `${label}:${count}`),
    ["Duo:2", "Trio:3", "Quadro:4", "Cinco:5", "Six:6"],
  );
});