export interface ContentBox { left: number; right: number; top: number; bottom: number }

// An inset outline of the solid blue/red artwork, after its existing square
// background-size: cover crop. The glow is deliberately outside this outline.
const outline = [[.13,.17],[.58,.025],[.935,.34],[.835,.80],[.39,.94],[.045,.63]];
export const IMAGE_CONTENT_CENTER_Y = .53;

/** Fit each visible image/text rectangle inside the original rock silhouette.
 * Boxes are relative to the content's centre, in CSS pixels. Empty space in
 * its wrapping column must not inflate the rock. */
export function imageAsteroidSize(boxes: ContentBox[], scale: number, variation: number): number {
  let diameter = 120 * scale;
  const padding = 5 * scale;
  for (let i = 0; i < outline.length; i++) {
    const [ax, ay] = outline[i];
    const [bx, by] = outline[(i + 1) % outline.length];
    const ex = bx - ax, ey = by - ay;
    const centreDistance = ex * (IMAGE_CONTENT_CENTER_Y - ay) - ey * (.5 - ax);
    for (const box of boxes) {
      for (const x of [box.left, box.right]) for (const y of [box.top, box.bottom]) {
        diameter = Math.max(diameter, (padding * Math.hypot(ex, ey) - (ex * y - ey * x)) / centreDistance);
      }
    }
  }
  // Pick once per asteroid: resizing or pausing must not reroll its size.
  return Math.ceil(diameter * (1 + .1 * Math.max(0, Math.min(1, variation))));
}
