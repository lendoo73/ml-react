/**
 * Return the splitter side containing a detection's bounding-box center.
 *
 * @param {object} detection - Detection with a pixel-space bounding box.
 * @param {{ start: { x: number, y: number }, end: { x: number, y: number } }} splitter - Normalized splitter endpoints.
 * @param {{ width: number, height: number }} sourceSize - Source dimensions in pixels.
 * @returns {"first" | "second" | null} The side, or null when the detection or geometry is invalid.
 * @example
 * getDetectionSideBySplitter({ bbox: { x_min: 0, y_min: 0, x_max: 20, y_max: 20 } }, splitter, { width: 100, height: 100 });
 */
export const getDetectionSideBySplitter = (detection, splitter, sourceSize) => {
    if (!sourceSize?.width || !sourceSize?.height || !splitter?.start || !splitter?.end) return null;

    const lineX = splitter.end.x - splitter.start.x;
    const lineY = splitter.end.y - splitter.start.y;
    if (lineX === 0 && lineY === 0) return null;

    const { x_min, y_min, x_max, y_max } = detection?.bbox ?? {};
    if (![x_min, y_min, x_max, y_max].every(Number.isFinite)) return null;

    const centerX = ((x_min + x_max) / 2) / sourceSize.width;
    const centerY = ((y_min + y_max) / 2) / sourceSize.height;
    const side = lineX * (centerY - splitter.start.y)
        - lineY * (centerX - splitter.start.x);
    return side > 0 ? "first" : "second";
};
