import { countTrackedObjectsBySplitter } from "./countTrackedObjectsBySplitter.js";
import { getDetectionSideBySplitter } from "./getDetectionSideBySplitter.js";

/**
 * Baseline new IDs and transfer counted IDs when detections cross the splitter.
 *
 * @param {Map<string, { detection: object, lastSide: "first" | "second", countedSide: "first" | "second" | null }>} previousObjects - Previous state keyed by class and ID.
 * @param {Array<object>} detections - Current frame detections.
 * @param {{ start: { x: number, y: number }, end: { x: number, y: number } }} splitter - Normalized splitter endpoints.
 * @param {{ width: number, height: number }} sourceSize - Source dimensions in pixels.
 * @param {string[]} selectedClasses - Detection classes to count.
 * @returns {{ trackedObjects: Map<string, { detection: object, lastSide: "first" | "second", countedSide: "first" | "second" | null }>, counts: Record<string, { first: number, second: number }> }}
 * @example
 * updateTrackedObjectCounts(new Map(), detections, splitter, { width: 100, height: 100 }, ["car", "person"]);
 */
export const updateTrackedObjectCounts = (
    previousObjects,
    detections,
    splitter,
    sourceSize,
    selectedClasses,
) => {
    const classes = Array.isArray(selectedClasses) ? [...new Set(selectedClasses)] : [];
    const selectedClassNames = new Set(classes);
    const trackedObjects = new Map();
    previousObjects.forEach((trackedObject, key) => {
        if (!selectedClassNames.has(trackedObject.detection?.class_name)) return;
        const side = getDetectionSideBySplitter(trackedObject.detection, splitter, sourceSize);
        if (!side) return;
        trackedObjects.set(key, {
            ...trackedObject,
            lastSide: side,
            countedSide: trackedObject.countedSide ? side : null,
        });
    });

    if (Array.isArray(detections) && classes.length > 0) {
        detections.forEach((detection) => {
            if (!selectedClassNames.has(detection?.class_name) || detection.track_id == null) return;
            const side = getDetectionSideBySplitter(detection, splitter, sourceSize);
            if (!side) return;
            const key = JSON.stringify([detection.class_name, detection.track_id]);
            const previousObject = trackedObjects.get(key);
            if (!previousObject) {
                trackedObjects.set(key, { detection, lastSide: side, countedSide: null });
                return;
            }
            trackedObjects.set(key, {
                detection,
                lastSide: side,
                countedSide: previousObject.lastSide === side ? previousObject.countedSide : side,
            });
        });
    }

    return {
        trackedObjects,
        counts: countTrackedObjectsBySplitter(trackedObjects, splitter, sourceSize, classes),
    };
};
