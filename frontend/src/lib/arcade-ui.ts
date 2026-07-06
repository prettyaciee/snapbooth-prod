import type { FilterType } from "./store";

export const BOOTH_FRAME_COUNT = 4;

export const ROOM_MODE_BY_SIZE: Record<number, string> = {
  2: "Duo",
  3: "Trio",
  4: "Quadro",
  5: "Cinco",
  6: "Six",
};

export const ARCADE_FILTERS: {
  id: FilterType;
  label: string;
  css: string;
  canvasParams: string;
}[] = [
  { id: "none", label: "Clean", css: "none", canvasParams: "none" },
  {
    id: "grayscale",
    label: "Token B&W",
    css: "grayscale(100%) contrast(1.2)",
    canvasParams: "grayscale(100%) contrast(120%)",
  },
  {
    id: "sepia",
    label: "Old Booth",
    css: "sepia(80%) contrast(1.1) brightness(0.9)",
    canvasParams: "sepia(80%) contrast(110%) brightness(90%)",
  },
  {
    id: "fade",
    label: "Faded Prize",
    css: "brightness(1.1) contrast(0.8) saturate(0.8)",
    canvasParams: "brightness(110%) contrast(80%) saturate(80%)",
  },
  {
    id: "vivid",
    label: "Neon Pop",
    css: "saturate(1.5) contrast(1.1)",
    canvasParams: "saturate(150%) contrast(110%)",
  },
];
