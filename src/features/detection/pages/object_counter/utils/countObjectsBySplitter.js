import { getDetectionSideBySplitter } from "./getDetectionSideBySplitter.js";

/**
 * Count detections of the selected classes on either side of a straight splitter.
 *
 * @param {Array<object>} detections - Detection objects with class names and bounding boxes.
 * @param {{ start: { x: number, y: number }, end: { x: number, y: number } }} splitter - Normalized splitter endpoints.
 * @param {{ width: number, height: number }} sourceSize - Source video dimensions in pixels.
 * @param {string[]} selectedClasses - Detection classes to count.
 * @returns {Record<string, { first: number, second: number }> | null} Side counts by class, or null until dimensions are available.
 * @example
 * countObjectsBySplitter(detections, { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } }, { width: 1280, height: 720 }, ["person", "car"]);
 */
export const countObjectsBySplitter = (detections, splitter, sourceSize, selectedClasses) => {
    const classes = Array.isArray(selectedClasses) ? [...new Set(selectedClasses)] : [];
    if (!Array.isArray(detections) || !sourceSize?.width || !sourceSize?.height || classes.length === 0) return null;
    if (!splitter?.start || !splitter?.end) return null;
    if (splitter.end.x === splitter.start.x && splitter.end.y === splitter.start.y) return null;

    const counts = Object.fromEntries(classes.map((className) => [className, { first: 0, second: 0 }]));
    detections.forEach((detection) => {
        if (!Object.hasOwn(counts, detection?.class_name)) return;
        const side = getDetectionSideBySplitter(detection, splitter, sourceSize);
        if (side) counts[detection.class_name][side] += 1;
    });

    return counts;
};
