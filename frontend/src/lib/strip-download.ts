import { ARCADE_FILTERS } from "./arcade-ui";
import type { FilterType, Participant, Shot } from "./store";

type StripDownloadParams = {
  filter: FilterType;
  mode: string;
  participants: Participant[];
  shots: Shot[];
};

type StripDownloadOptions = {
  createCanvas?: () => HTMLCanvasElement;
  createImage?: () => HTMLImageElement;
  dateLabel?: string;
  now?: number;
};

const STRIP_IMAGE_WIDTH = 400;
const STRIP_IMAGE_HEIGHT = 533;
const STRIP_PADDING = 60;
const STRIP_COLUMN_GAP = 30;
const STRIP_ROW_GAP = 30;
const STRIP_FOOTER_HEIGHT = 200;
const STRIP_HEADER_HEIGHT = 80;

export function buildStripFilename(mode: string, now = Date.now()): string {
  return `snapbooth-${mode || "multiplayer"}-${now}.png`;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(",", 2);
  const mimeType = header.match(/data:(.*?)(;base64)?$/)?.[1] ?? "image/png";
  const decoded = globalThis.atob(body ?? "");
  const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob === "function") {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Could not export strip image"));
      }, "image/png");
      return;
    }

    try {
      resolve(dataUrlToBlob(canvas.toDataURL("image/png")));
    } catch (error) {
      reject(error);
    }
  });
}

function loadImage(source: string, createImage: () => HTMLImageElement): Promise<CanvasImageSource> {
  return new Promise((resolve, reject) => {
    const image = createImage();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load strip image: ${source.slice(0, 32)}`));
    image.src = source;
  });
}

export async function createStripDownloadAsset(
  {
    filter,
    mode,
    participants,
    shots,
  }: StripDownloadParams,
  {
    createCanvas = () => document.createElement("canvas"),
    createImage = () => new Image(),
    dateLabel = new Date().toLocaleDateString(),
    now = Date.now(),
  }: StripDownloadOptions = {},
): Promise<{ blob: Blob; filename: string }> {
  const canvas = createCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create strip canvas");
  }

  const activeFilter = ARCADE_FILTERS.find((item) => item.id === filter) || ARCADE_FILTERS[0];
  const orderedParticipants = [...participants].sort((a, b) => a.id.localeCompare(b.id));

  const cols = orderedParticipants.length || 1;
  const rows = shots.length || 1;

  canvas.width = STRIP_IMAGE_WIDTH * cols + STRIP_COLUMN_GAP * (cols - 1) + STRIP_PADDING * 2;
  canvas.height =
    STRIP_HEADER_HEIGHT +
    STRIP_IMAGE_HEIGHT * rows +
    STRIP_ROW_GAP * (rows - 1) +
    STRIP_PADDING * 2 +
    STRIP_FOOTER_HEIGHT;

  ctx.fillStyle = "#fff8df";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = "bold 32px 'DM Sans', sans-serif";
  ctx.fillStyle = "#20100d";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  orderedParticipants.forEach((participant, colIndex) => {
    const x = STRIP_PADDING + colIndex * (STRIP_IMAGE_WIDTH + STRIP_COLUMN_GAP) + STRIP_IMAGE_WIDTH / 2;
    ctx.fillText(participant.name, x, STRIP_PADDING + STRIP_HEADER_HEIGHT - 20);
  });

  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    const shot = shots.find((item) => item.shotIndex === rowIndex);
    if (!shot) continue;

    for (let colIndex = 0; colIndex < cols; colIndex++) {
      const participant = orderedParticipants[colIndex];
      const photo = shot.photos.find((item) => item.participantId === participant.id);
      if (!photo) continue;

      const image = await loadImage(photo.data, createImage);
      const x = STRIP_PADDING + colIndex * (STRIP_IMAGE_WIDTH + STRIP_COLUMN_GAP);
      const y = STRIP_PADDING + STRIP_HEADER_HEIGHT + rowIndex * (STRIP_IMAGE_HEIGHT + STRIP_ROW_GAP);

      ctx.filter = activeFilter.canvasParams;
      ctx.drawImage(image, x, y, STRIP_IMAGE_WIDTH, STRIP_IMAGE_HEIGHT);
      ctx.filter = "none";
      ctx.strokeStyle = "#20100d";
      ctx.lineWidth = 6;
      ctx.strokeRect(x, y, STRIP_IMAGE_WIDTH, STRIP_IMAGE_HEIGHT);
    }
  }

  const footerY = canvas.height - STRIP_FOOTER_HEIGHT / 2;
  ctx.fillStyle = "#20100d";
  ctx.font = "bold 80px 'Limelight', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SnapBooth", canvas.width / 2, footerY - 20);

  ctx.font = "30px 'DM Sans', sans-serif";
  ctx.fillStyle = "#9f1714";
  ctx.fillText(dateLabel, canvas.width / 2, footerY + 50);

  return {
    blob: await canvasToBlob(canvas),
    filename: buildStripFilename(mode, now),
  };
}
