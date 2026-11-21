import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addBicepCurlMetricsToFrames } from "./addBicepCurlMetricsToFrames.js";
import { getBicepCurlPoseAngles } from "./getBicepCurlPoseAngles.js";
import { updateBicepCurlCounters } from "./updateBicepCurlCounters.js";

const ANGLE_TRIPLETS = [
    ["left_shoulder", "left_elbow", "left_wrist"],
    ["right_shoulder", "right_elbow", "right_wrist"],
];
const THRESHOLDS = { flexed: 50, extended: 120 };

const makeAngle = (joints, degrees, valid = true) => ({
    joints,
    degrees,
    valid,
    keypoint_confidences: [0.9, 0.9, 0.9],
});

const makeFrame = (trackId, leftAngle, rightAngle, valid = true) => ({
    poses: [{
        track_id: trackId,
        confidence: 0.9,
        angles: [
            makeAngle(ANGLE_TRIPLETS[0], leftAngle, valid),
            makeAngle(ANGLE_TRIPLETS[1], rightAngle, valid),
        ],
    }],
});

const advance = (counters, trackId, leftAngle, rightAngle, valid = true) => (
    updateBicepCurlCounters(
        counters,
        makeFrame(trackId, leftAngle, rightAngle, valid),
        ANGLE_TRIPLETS,
        THRESHOLDS,
    )
);

describe("bicep curl counter", () => {
    it("normalizes directed angles to the smaller elbow angle and maps by joint names", () => {
        const [pose] = getBicepCurlPoseAngles(
            makeFrame(1, 280.73, 262.93),
            ANGLE_TRIPLETS,
        );

        assert.ok(Math.abs(pose.angles[0] - 79.27) < 1e-8);
        assert.equal(pose.angles[1], 97.07);
    });

    it("does not count a flexed arm until an extended position was observed", () => {
        let counters = new Map();
        counters = advance(counters, 1, 30, 30);
        assert.deepEqual(counters.get(1).counts, [0, 0]);

        counters = advance(counters, 1, 130, 130);
        counters = advance(counters, 1, 30, 30);
        assert.deepEqual(counters.get(1).counts, [1, 1]);
    });

    it("counts only once until each arm extends again", () => {
        let counters = advance(new Map(), 1, 130, 130);
        counters = advance(counters, 1, 30, 30);
        counters = advance(counters, 1, 30, 30);
        assert.deepEqual(counters.get(1).counts, [1, 1]);

        counters = advance(counters, 1, 130, 130);
        counters = advance(counters, 1, 30, 30);
        assert.deepEqual(counters.get(1).counts, [2, 2]);
    });

    it("tracks left and right arms independently", () => {
        let counters = advance(new Map(), 1, 130, 130);
        counters = advance(counters, 1, 30, 130);
        assert.deepEqual(counters.get(1).counts, [1, 0]);

        counters = advance(counters, 1, 130, 30);
        assert.deepEqual(counters.get(1).counts, [1, 1]);
    });

    it("ignores invalid angle measurements without changing phases or counts", () => {
        let counters = advance(new Map(), 1, 130, 130);
        counters = advance(counters, 1, 30, 30, false);
        assert.deepEqual(counters.get(1).counts, [0, 0]);
        assert.deepEqual(counters.get(1).phases, ["extended", "extended"]);
    });

    it("keeps counters isolated by track ID and ignores untracked poses", () => {
        let counters = advance(new Map(), 1, 130, 130);
        counters = advance(counters, 2, 130, 130);
        counters = advance(counters, 1, 30, 30);
        assert.deepEqual(counters.get(1).counts, [1, 1]);
        assert.deepEqual(counters.get(2).counts, [0, 0]);

        const withoutTrackId = {
            poses: [{ angles: makeFrame(3, 30, 30).poses[0].angles }],
        };
        const unchanged = updateBicepCurlCounters(counters, withoutTrackId, ANGLE_TRIPLETS, THRESHOLDS);
        assert.equal(unchanged.has(3), false);
    });

    it("adds each person's running counts and angles to the corresponding video frame poses", () => {
        const frames = addBicepCurlMetricsToFrames([
            makeFrame(1, 130, 130),
            { poses: [makeFrame(1, 30, 130).poses[0], makeFrame(2, 130, 130).poses[0]] },
            makeFrame(1, 30, 30),
        ], ANGLE_TRIPLETS, THRESHOLDS);

        assert.deepEqual(frames[0].poses[0].bicepCurlMetrics.counts, [0, 0]);
        assert.deepEqual(frames[1].poses[0].bicepCurlMetrics.counts, [1, 0]);
        assert.deepEqual(frames[1].poses[1].bicepCurlMetrics.counts, [0, 0]);
        assert.deepEqual(frames[2].poses[0].bicepCurlMetrics.counts, [1, 1]);
        assert.equal(frames[2].poses[0].bicepCurlMetrics.angles[0], 30);
    });
});
