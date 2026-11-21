import { getDetectionSideBySplitter } from "./getDetectionSideBySplitter.js";

/**
 * Count tracked objects that have crossed the splitter by class and current side.
 *
 * @param {Map<string, object>} trackedObjects - Tracking state keyed by class and track ID.
 * @param {{ start: { x: number, y: number }, end: { x: number, y: number } }} splitter - Normalized splitter endpoints.
 * @param {{ width: number, height: number }} sourceSize - Source dimensions in pixels.
 * @param {string[]} selectedClasses - Detection classes to count.
 * @returns {Record<string, { first: number, second: number }>} Unique object counts by class and side.
 * @example
 * countTrackedObjectsBySplitter(trackedObjects, splitter, { width: 100, height: 100 }, ["car", "person"]);
 */
export const countTrackedObjectsBySplitter = (trackedObjects, splitter, sourceSize, selectedClasses) => {
    const classes = Array.isArray(selectedClasses) ? [...new Set(selectedClasses)] : [];
    const counts = Object.fromEntries(classes.map((className) => [className, { first: 0, second: 0 }]));
    trackedObjects.forEach(({ detection, countedSide }) => {
        if (!Object.hasOwn(counts, detection?.class_name) || !countedSide) return;
        const side = getDetectionSideBySplitter(detection, splitter, sourceSize);
        if (side) counts[detection.class_name][side] += 1;
    });
    return counts;
};
