import { getBicepCurlPoseAngles } from "./getBicepCurlPoseAngles.js";

/**
 * Return the next repetition-counter state for all tracked people in a frame.
 *
 * @param {Map<number|string, object>} counters - Previously accumulated counters by track ID.
 * @param {{ poses?: Array<object> }} frame - A video frame or webcam message.
 * @param {string[][]} angleTriplets - Requested joint-name triplets in display order.
 * @param {{ flexed: number, extended: number }} thresholds - Strict curl and extension limits.
 * @returns {Map<number|string, object>} Updated counter state without mutating the input map.
 * @example
 * updateBicepCurlCounters(new Map(), frame, angleTriplets, { flexed: 50, extended: 120 });
 */
export const updateBicepCurlCounters = (counters, frame, angleTriplets, thresholds) => {
    const nextCounters = new Map(counters);

    getBicepCurlPoseAngles(frame, angleTriplets).forEach(({ trackId, angles }) => {
        const previous = nextCounters.get(trackId) ?? {
            trackId,
            counts: angleTriplets.map(() => 0),
            phases: angleTriplets.map(() => "unknown"),
            angles: angleTriplets.map(() => null),
        };
        const next = {
            ...previous,
            counts: [...previous.counts],
            phases: [...previous.phases],
            angles,
        };

        angles.forEach((angle, index) => {
            if (angle == null) return;
            if (angle > thresholds.extended) next.phases[index] = "extended";
            if (angle < thresholds.flexed && next.phases[index] === "extended") {
                next.counts[index] += 1;
                next.phases[index] = "flexed";
            }
        });

        nextCounters.set(trackId, next);
    });

    return nextCounters;
};
