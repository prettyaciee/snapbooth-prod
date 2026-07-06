import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homeSource = readFileSync(new URL("../../../frontend/src/pages/home.tsx", import.meta.url), "utf8");
const roomSource = readFileSync(new URL("../../../frontend/src/pages/room.tsx", import.meta.url), "utf8");
const resultSource = readFileSync(new URL("../../../frontend/src/pages/result.tsx", import.meta.url), "utf8");

test("home page stacks key call-to-action controls for narrow screens", () => {
  assert.match(homeSource, /className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap"/);
  assert.match(homeSource, /className="inline-flex w-full items-center justify-center gap-2 .* sm:w-auto"/);
});

test("room page uses mobile-first stacking for invite actions and smaller booth text", () => {
  assert.match(roomSource, /className="mt-3 flex flex-col gap-2 sm:flex-row"/);
  assert.match(roomSource, /className="flex min-h-\[320px\] flex-col justify-center gap-4 sm:min-h-\[420px\]"/);
  assert.match(roomSource, /text-\[5rem\].*sm:text-\[8rem\].*md:text-\[13rem\]/s);
});

test("result page exposes a horizontal scroll container and uses responsive strip layout", () => {
  assert.match(resultSource, /className="w-full overflow-x-auto py-4 sm:py-6"/);
  assert.match(resultSource, /getResultStripLayout\(orderedParticipants\.length\)/);
});
