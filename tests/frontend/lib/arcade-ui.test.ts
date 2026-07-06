import test from "node:test";
import assert from "node:assert/strict";
import { ARCADE_FILTERS, BOOTH_FRAME_COUNT, ROOM_MODE_BY_SIZE } from "../../../frontend/src/lib/arcade-ui";

test("arcade filters keep preview and download parameters aligned", () => {
  assert.deepEqual(
    ARCADE_FILTERS.map((filter) => filter.id),
    ["none", "grayscale", "sepia", "fade", "vivid"],
  );

  assert.ok(
    ARCADE_FILTERS.every((filter) => filter.css && filter.canvasParams),
    "each filter needs CSS and canvas settings",
  );
});

test("arcade room labels match supported group sizes", () => {
  assert.equal(BOOTH_FRAME_COUNT, 4);
  assert.deepEqual(ROOM_MODE_BY_SIZE, {
    2: "Duo",
    3: "Trio",
    4: "Quadro",
    5: "Cinco",
    6: "Six",
  });
});