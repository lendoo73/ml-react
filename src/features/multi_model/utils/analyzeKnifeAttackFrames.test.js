import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeKnifeAttackFrames } from "./analyzeKnifeAttackFrames.js";

const square = (left, top, right, bottom) => [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
];

const person = (trackId, polygon) => ({
    class_name: "person",
    track_id: trackId,
    polygon,
});

const knife = (polygon) => ({ class_name: "knife", polygon });

describe("knife attack frame analysis", () => {
    it("marks the first knife/person overlap and keeps it attached to that frame", () => {
        const frames = analyzeKnifeAttackFrames([
            {
                frame_index: 0,
                predictions: {
                    segmentation: [
                        person(10, square(0, 0, 10, 10)),
                        person(20, square(30, 0, 40, 10)),
                        knife(square(12, 4, 14, 6)),
                    ],
                    "pose-estimation": [],
                },
            },
            {
                frame_index: 1,
                predictions: {
                    segmentation: [
                        person(10, square(0, 0, 10, 10)),
                        person(20, square(30, 0, 40, 10)),
                        knife(square(32, 4, 34, 6)),
                    ],
                    "pose-estimation": [],
                },
            },
            {
                frame_index: 2,
                predictions: {
                    segmentation: [
                        person(10, square(0, 0, 10, 10)),
                        person(20, square(30, 0, 40, 10)),
                        knife(square(32, 4, 34, 6)),
                    ],
                    "pose-estimation": [],
                },
            },
        ]);

        assert.equal(frames[0].behavior.attackerTrackId, 10);
        assert.equal(frames[0].behavior.attackDetected, false);
        assert.equal(frames[1].behavior.attackDetected, true);
        assert.deepEqual(frames[1].behavior.attackedVictimTrackIds, [20]);
        assert.equal(frames[2].behavior.attackDetected, false);
        assert.equal(frames[1].predictions.segmentation[0].behaviorRole, "attacker");
        assert.equal(frames[1].predictions.segmentation[1].behaviorRole, "victim");
        assert.equal(frames[1].predictions.segmentation[1].attackDetected, true);
        assert.equal(frames[2].predictions.segmentation[1].attackDetected, false);
        assert.deepEqual(frames[1].predictions["pose-estimation"], []);
    });

    it("treats touching polygon edges as overlap", () => {
        const frames = analyzeKnifeAttackFrames([
            {
                predictions: {
                    segmentation: [
                        person(1, square(0, 0, 10, 10)),
                        person(2, square(30, 0, 40, 10)),
                        knife(square(12, 4, 14, 6)),
                    ],
                },
            },
            {
                predictions: {
                    segmentation: [
                        person(1, square(0, 0, 10, 10)),
                        person(2, square(20, 0, 30, 10)),
                        knife(square(30, 4, 32, 6)),
                    ],
                },
            },
        ]);

        assert.equal(frames[1].behavior.attackDetected, true);
        assert.deepEqual(frames[1].behavior.attackedVictimTrackIds, [2]);
    });

    it("returns an empty list for missing or invalid frame collections", () => {
        assert.deepEqual(analyzeKnifeAttackFrames(null), []);
        assert.deepEqual(analyzeKnifeAttackFrames([null]), [{
            predictions: { segmentation: [] },
            behavior: {
                attackerTrackId: null,
                victimTrackIds: [],
                attackedVictimTrackIds: [],
                attackDetected: false,
                frameIndex: 0,
            },
        }]);
    });
});
