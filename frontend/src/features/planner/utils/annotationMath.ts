/**
 * Helper to generate an authentic CAD Revision Cloud SVG path with scalloped arcs.
 */
export function generateCloudSvgPath(points: number[], arcRadius = 18): string {
  if (!points || points.length < 4) return '';

  let path = `M ${points[0]} ${points[1]}`;
  
  for (let i = 2; i < points.length; i += 2) {
    const prevX = points[i - 2];
    const prevY = points[i - 1];
    const currX = points[i];
    const currY = points[i + 1];

    const dx = currX - prevX;
    const dy = currY - prevY;
    const dist = Math.hypot(dx, dy);

    if (dist < 4) continue;

    // Number of scalloped bumps along this segment
    const numBumps = Math.max(1, Math.round(dist / (arcRadius * 1.4)));
    const stepX = dx / numBumps;
    const stepY = dy / numBumps;

    // Perpendicular vector for arching outward
    const perpX = (-dy / dist) * (arcRadius * 0.6);
    const perpY = (dx / dist) * (arcRadius * 0.6);

    let curSegX = prevX;
    let curSegY = prevY;

    for (let b = 0; b < numBumps; b++) {
      const nextSegX = curSegX + stepX;
      const nextSegY = curSegY + stepY;
      const midX = (curSegX + nextSegX) / 2 + perpX;
      const midY = (curSegY + nextSegY) / 2 + perpY;

      path += ` Q ${midX} ${midY}, ${nextSegX} ${nextSegY}`;
      curSegX = nextSegX;
      curSegY = nextSegY;
    }
  }

  return path;
}
