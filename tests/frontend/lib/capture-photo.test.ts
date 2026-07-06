import test from "node:test";
import assert from "node:assert/strict";
import { capturePhotoWhenReady } from "../../../frontend/src/lib/capture-photo";

test("capturePhotoWhenReady waits for usable video dimensions before capturing", async () => {
  const video = {
    videoWidth: 0,
    videoHeight: 0,
  };

  const drawCalls: Array<[number, number, number, number]> = [];
  const transforms: Array<[number, number, number, number, number, number]> = [];
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      clearRect: () => undefined,
      setTransform: (...args: [number, number, number, number, number, number]) => {
        transforms.push(args);
      },
      drawImage: (_video: unknown, _x: number, _y: number, width: number, height: number) => {
        drawCalls.push([0, 0, width, height]);
      },
    }),
    toDataURL: () => "data:image/jpeg;base64,captured-shot",
  };

  let waitCount = 0;

  const result = await capturePhotoWhenReady(video as never, canvas as never, {
    maxAttempts: 4,
    waitForNextFrame: async () => {
      waitCount++;
      if (waitCount === 2) {
        video.videoWidth = 1280;
        video.videoHeight = 960;
      }
    },
  });

  assert.equal(result, "data:image/jpeg;base64,captured-shot");
  assert.equal(waitCount, 2);
  assert.equal(canvas.width, 1280);
  assert.equal(canvas.height, 960);
  assert.deepEqual(drawCalls, [[0, 0, 1280, 960]]);
  assert.ok(
    transforms.some((transform) => JSON.stringify(transform) === JSON.stringify([-1, 0, 0, 1, 1280, 0])),
    "the capture should mirror the frame before drawing it",
  );
});

test("capturePhotoWhenReady returns null when the camera never becomes ready", async () => {
  const video = {
    videoWidth: 0,
    videoHeight: 0,
  };

  let waitCount = 0;

  const result = await capturePhotoWhenReady(video as never, {
    width: 0,
    height: 0,
    getContext: () => null,
    toDataURL: () => "data:image/jpeg;base64,unused",
  } as never, {
    maxAttempts: 3,
    waitForNextFrame: async () => {
      waitCount++;
    },
  });

  assert.equal(result, null);
  assert.equal(waitCount, 3);
});
