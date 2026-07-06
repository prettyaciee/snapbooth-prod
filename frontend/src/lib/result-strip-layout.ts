export function getResultStripLayout(participantCount: number): {
  columnMinWidth: number;
  gapPx: number;
} {
  if (participantCount >= 5) {
    return {
      columnMinWidth: 92,
      gapPx: 12,
    };
  }

  return {
    columnMinWidth: 120,
    gapPx: 16,
  };
}
