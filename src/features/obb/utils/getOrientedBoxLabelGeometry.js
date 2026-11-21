/**
 * Get the midpoint and readable angle of the topmost OBB edge for label placement.
 *
 * @param {Array<[number, number]>} corners - Ordered polygon corners for an oriented box.
 * @returns {{x: number, y: number, angle: number} | null} Label center and radians, or null for invalid geometry.
 *
 * @example
 * getOrientedBoxLabelGeometry([[10, 20], [50, 30], [45, 50], [5, 40]]);
 * // { x: 30, y: 25, angle: 0.2449... }
 */
export const getOrientedBoxLabelGeometry = (corners) => {
    if (!Array.isArray(corners) || corners.length < 3
        || corners.some((point) => !Array.isArray(point)
            || point.length < 2
            || !point.slice(0, 2).every(Number.isFinite))) return null;

    const edges = corners.map((start, index) => {
        const end = corners[(index + 1) % corners.length];
        return {
            x: (start[0] + end[0]) / 2,
            y: (start[1] + end[1]) / 2,
            angle: Math.atan2(end[1] - start[1], end[0] - start[0]),
        };
    });
    const topEdge = edges.reduce((current, edge) => edge.y < current.y ? edge : current);
    if (topEdge.angle > Math.PI / 2) topEdge.angle -= Math.PI;
    if (topEdge.angle < -Math.PI / 2) topEdge.angle += Math.PI;
    return topEdge;
};

