/**
 * Extract valid left/right elbow angles from tracked pose results.
 *
 * @param {{ poses?: Array<{ track_id?: number|string|null, angles?: Array<object> }> }} frame
 *   A video frame or webcam message containing pose results.
 * @param {string[][]} angleTriplets - Requested joint-name triplets in display order.
 * @returns {Array<{ trackId: number|string, angles: Array<number|null> }>} Tracked people with normalized angles.
 * @example
 * getBicepCurlPoseAngles(frame, [["left_shoulder", "left_elbow", "left_wrist"]]);
 */
export const getBicepCurlPoseAngles = (frame, angleTriplets) => {
    const poses = Array.isArray(frame?.poses) ? frame.poses : [];

    return poses.flatMap((pose) => {
        if (pose?.track_id == null) return [];

        const angles = angleTriplets.map((triplet) => {
            const result = pose.angles?.find((candidate) => (
                Array.isArray(candidate?.joints)
                && triplet.every((joint, index) => candidate.joints[index] === joint)
            ));

            if (result?.valid !== true || result.degrees == null) return null;

            const degrees = Number(result.degrees);
            if (!Number.isFinite(degrees)) return null;
            const absoluteAngle = Math.abs(degrees) % 360;
            return absoluteAngle > 180 ? 360 - absoluteAngle : absoluteAngle;
        });

        return [{ trackId: pose.track_id, angles }];
    });
};
