import { countObjectsBySplitter } from "./countObjectsBySplitter.js";
import { updateTrackedObjectCounts } from "./updateTrackedObjectCounts.js";

/**
 * Return video frames enriched with detection or persistent tracking counts.
 *
 * @param {Array<object>} frames - Ordered prediction frames.
 * @param {{ start: { x: number, y: number }, end: { x: number, y: number } }} splitter - Normalized splitter endpoints.
 * @param {{ width: number, height: number }} sourceSize - Source video dimensions in pixels.
 * @param {string[]} selectedClasses - Detection classes to count.
 * @param {boolean} trackingEnabled - Whether to count unique tracked object IDs.
 * @returns {Array<object>} New frame objects containing objectCounts.
 * @example
 * addObjectCountsToFrames(frames, { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } }, { width: 1280, height: 720 }, ["person", "car"]);
 */
export const addObjectCountsToFrames = (
    frames,
    splitter,
    sourceSize,
    selectedClasses,
    trackingEnabled = false,
) => {
    let trackedObjects = new Map();
    return (Array.isArray(frames) ? frames : []).map((frame) => {
        let objectCounts;
        if (trackingEnabled) {
            const result = updateTrackedObjectCounts(
                trackedObjects,
                frame?.detections,
                splitter,
                sourceSize,
                selectedClasses,
            );
            trackedObjects = result.trackedObjects;
            objectCounts = result.counts;
        } else {
            objectCounts = countObjectsBySplitter(
                frame?.detections,
                splitter,
                sourceSize,
                selectedClasses,
            );
        }
        return { ...frame, objectCounts };
    });
};
