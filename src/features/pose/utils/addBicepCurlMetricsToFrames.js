import { updateBicepCurlCounters } from "./updateBicepCurlCounters.js";

/**
 * Add each tracked person's running curl counts and elbow angles to every frame.
 *
 * @param {Array<object>} frames - Ordered pose prediction frames.
 * @param {string[][]} angleTriplets - Requested joint-name triplets in display order.
 * @param {{ flexed: number, extended: number }} thresholds - Curl and extension limits.
 * @returns {Array<object>} Frames with per-pose bicepCurlMetrics values.
 * @example
 * addBicepCurlMetricsToFrames(frames, angleTriplets, { flexed: 50, extended: 120 });
 */
export const addBicepCurlMetricsToFrames = (frames, angleTriplets, thresholds) => {
    let counters = new Map();
    return frames.map((frame) => {
        counters = updateBicepCurlCounters(counters, frame, angleTriplets, thresholds);
        return {
            ...frame,
            poses: (Array.isArray(frame?.poses) ? frame.poses : []).map((pose) => {
                const metric = counters.get(pose?.track_id);
                return metric
                    ? { ...pose, bicepCurlMetrics: { counts: metric.counts, angles: metric.angles } }
                    : pose;
            }),
        };
    });
};
