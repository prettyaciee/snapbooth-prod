import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const stylesSource = readFileSync(new URL("../../../frontend/src/index.css", import.meta.url), "utf8");
const homeSource = readFileSync(new URL("../../../frontend/src/pages/home.tsx", import.meta.url), "utf8");
const roomSource = readFileSync(new URL("../../../frontend/src/pages/room.tsx", import.meta.url), "utf8");
const resultSource = readFileSync(new URL("../../../frontend/src/pages/result.tsx", import.meta.url), "utf8");

test("home page stacks key call-to-action controls for narrow screens", () => {
  assert.match(homeSource, /className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap"/);
  assert.match(homeSource, /className="inline-flex w-full items-center justify-center gap-2 .* sm:w-auto"/);
  assert.match(homeSource, /className="relative z-20 mx-auto flex w-full min-w-0 max-w-full items-center justify-between md:max-w-7xl"/);
});

test("room page uses mobile-first stacking for invite actions and smaller booth text", () => {
  assert.match(roomSource, /className="mt-3 flex flex-col gap-2 sm:flex-row"/);
  assert.match(roomSource, /className="flex min-h-\[320px\] min-w-0 flex-col justify-center gap-4 sm:min-h-\[420px\]"/);
  assert.match(roomSource, /text-\[5rem\].*sm:text-\[8rem\].*md:text-\[13rem\]/s);
});

test("room page reattaches the live camera stream when the booth video remounts", () => {
  assert.match(roomSource, /attachStreamToVideo\(videoRef\.current\);/);
  assert.match(
    roomSource,
    /useEffect\(\(\) => \{\s*if \(phase !== "ready"\) return;\s*attachStreamToVideo\(videoRef\.current\);\s*\}, \[phase, isBooth\]\);/s,
  );
});

test("result page keeps the strip inside a shrinkable scroll region and uses responsive strip layout", () => {
  assert.match(resultSource, /className="w-full min-w-0 overflow-x-auto py-4 sm:py-6"/);
  assert.match(resultSource, /getResultStripLayout\(orderedParticipants\.length\)/);
  assert.match(resultSource, /gridTemplateColumns: `repeat\(\$\{orderedParticipants\.length\}, \$\{stripLayout\.columnWidthPx\}px\)`/);
});

test("result page download button stays on a direct file download path", () => {
  assert.match(resultSource, /link\.download = downloadAsset\.filename/);
  assert.match(resultSource, /link\.click\(\)/);
  assert.doesNotMatch(resultSource, /navigator\.share|canShare/);
});

test("global grain overlay is pinned with inset instead of viewport width sizing", () => {
  assert.match(stylesSource, /\.film-grain\s*\{[^}]*inset:\s*0;[^}]*\}/);
  assert.doesNotMatch(stylesSource, /\.film-grain\s*\{[^}]*100vw[^}]*\}/);
  assert.match(stylesSource, /\.snapbooth-landing\s*\{[^}]*max-width:\s*100%;[^}]*\}/);
});
