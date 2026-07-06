type CaptureVideoLike = {
  play?: () => Promise<void>;
  videoHeight: number;
  videoWidth: number;
};

type CaptureCanvasContextLike = {
  clearRect?: (x: number, y: number, width: number, height: number) => void;
  drawImage: (image: CanvasImageSource, dx: number, dy: number, dWidth: number, dHeight: number) => void;
  scale?: (x: number, y: number) => void;
  setTransform?: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  translate?: (x: number, y: number) => void;
};

type CaptureCanvasLike = {
  height: number;
  width: number;
  getContext: (contextId: "2d") => CaptureCanvasContextLike | null;
  toDataURL: (type?: string, quality?: number) => string;
};

type CapturePhotoOptions = {
  maxAttempts?: number;
  quality?: number;
  waitForNextFrame?: () => Promise<void>;
};

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof globalThis.requestAnimationFrame === "function") {
      globalThis.requestAnimationFrame(() => resolve());
      return;
    }

    setTimeout(resolve, 80);
  });
}

function capturePhoto(
  video: CaptureVideoLike,
  canvas: CaptureCanvasLike,
  quality: number,
): string | null {
  if (video.videoWidth < 1 || video.videoHeight < 1) {
    return null;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  if (typeof ctx.setTransform === "function") {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect?.(0, 0, canvas.width, canvas.height);
    ctx.setTransform(-1, 0, 0, 1, canvas.width, 0);
  } else {
    ctx.translate?.(canvas.width, 0);
    ctx.scale?.(-1, 1);
  }

  ctx.drawImage(video as unknown as CanvasImageSource, 0, 0, canvas.width, canvas.height);

  if (typeof ctx.setTransform === "function") {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return canvas.toDataURL("image/jpeg", quality);
}

export async function capturePhotoWhenReady(
  video: CaptureVideoLike,
  canvas: CaptureCanvasLike,
  {
    maxAttempts = 30,
    quality = 0.9,
    waitForNextFrame: wait = waitForNextFrame,
  }: CapturePhotoOptions = {},
): Promise<string | null> {
  if (typeof video.play === "function") {
    void video.play().catch(() => undefined);
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const capturedPhoto = capturePhoto(video, canvas, quality);
    if (capturedPhoto) {
      return capturedPhoto;
    }

    await wait();
  }

  return capturePhoto(video, canvas, quality);
}
