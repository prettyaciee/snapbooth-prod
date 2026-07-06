import test from "node:test";
import assert from "node:assert/strict";
import { buildStripFilename, createStripDownloadAsset } from "../../../frontend/src/lib/strip-download";

test("buildStripFilename keeps the booth mode in the exported filename", () => {
  assert.equal(buildStripFilename("Duo", 1234567890), "snapbooth-Duo-1234567890.png");
  assert.equal(buildStripFilename("", 1234567890), "snapbooth-multiplayer-1234567890.png");
});

test("createStripDownloadAsset renders a png blob from ordered strip photos", async () => {
  const drawImageCalls: Array<[number, number, number, number]> = [];
  const fillTextCalls: string[] = [];

  const canvasContext = {
    fillStyle: "",
    font: "",
    textAlign: "left" as const,
    textBaseline: "alphabetic" as const,
    filter: "none",
    strokeStyle: "",
    lineWidth: 0,
    fillRect: () => undefined,
    fillText: (text: string) => {
      fillTextCalls.push(text);
    },
    drawImage: (_image: CanvasImageSource, x: number, y: number, width: number, height: number) => {
      drawImageCalls.push([x, y, width, height]);
    },
    strokeRect: () => undefined,
  };

  const canvas = {
    width: 0,
    height: 0,
    getContext: () => canvasContext,
    toBlob: (callback: BlobCallback, type?: string) => callback(new Blob(["strip"], { type: type ?? "image/png" })),
    toDataURL: () => "data:image/png;base64,c3RyaXA=",
  };

  const loadedSources: string[] = [];
  const createImage = () => {
    const image = {
      crossOrigin: "",
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
      _src: "",
    };

    Object.defineProperty(image, "src", {
      get() {
        return image._src;
      },
      set(value: string) {
        image._src = value;
        loadedSources.push(value);
        queueMicrotask(() => image.onload?.());
      },
    });

    return image as unknown as HTMLImageElement;
  };

  const asset = await createStripDownloadAsset(
    {
      filter: "sepia",
      mode: "Duo",
      participants: [
        { id: "b", name: "Bea", isHost: false },
        { id: "a", name: "Ace", isHost: true },
      ],
      shots: [
        {
          shotIndex: 0,
          photos: [
            { participantId: "a", name: "Ace", data: "data:image/jpeg;base64,aaa" },
            { participantId: "b", name: "Bea", data: "data:image/jpeg;base64,bbb" },
          ],
        },
        {
          shotIndex: 1,
          photos: [
            { participantId: "a", name: "Ace", data: "data:image/jpeg;base64,ccc" },
            { participantId: "b", name: "Bea", data: "data:image/jpeg;base64,ddd" },
          ],
        },
      ],
    },
    {
      createCanvas: () => canvas as unknown as HTMLCanvasElement,
      createImage,
      now: 1234567890,
      dateLabel: "07/06/2026",
    },
  );

  assert.equal(asset.filename, "snapbooth-Duo-1234567890.png");
  assert.equal(asset.blob.type, "image/png");
  assert.deepEqual(fillTextCalls.slice(0, 2), ["Ace", "Bea"]);
  assert.equal(drawImageCalls.length, 4);
  assert.deepEqual(loadedSources, [
    "data:image/jpeg;base64,aaa",
    "data:image/jpeg;base64,bbb",
    "data:image/jpeg;base64,ccc",
    "data:image/jpeg;base64,ddd",
  ]);
});
