export function getResultStripLayout(participantCount: number): {
  columnWidthPx: number;
  gapPx: number;
} {
  if (participantCount >= 5) {
    return {
      columnWidthPx: 92,
      gapPx: 12,
    };
  }

  if (participantCount >= 3) {
    return {
      columnWidthPx: 132,
      gapPx: 16,
    };
  }

  return {
    columnWidthPx: 168,
    gapPx: 18,
  };
}
