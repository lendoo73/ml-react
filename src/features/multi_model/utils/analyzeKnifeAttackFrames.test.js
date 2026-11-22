import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    analyzeKnifeAttackFrames,
    MAX_MISSED_KNIFE_FRAMES,
} from "./analyzeKnifeAttackFrames.js";

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
    it("starts role attribution when the knife contacts a person", () => {
        const frames = analyzeKnifeAttackFrames([
            {
                frame_index: 0,
                predictions: {
                    "instance-segmentation": [
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
                    "instance-segmentation": [
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
                    "instance-segmentation": [
                        person(10, square(0, 0, 10, 10)),
                        person(20, square(30, 0, 40, 10)),
                        knife(square(32, 4, 34, 6)),
                    ],
                    "pose-estimation": [],
                },
            },
        ]);

        assert.equal(frames[0].behavior.attackerTrackId, null);
        assert.equal(frames[0].behavior.attackDetected, false);
        assert.equal(frames[1].behavior.attackerTrackId, 20);
        assert.deepEqual(frames[1].behavior.victimTrackIds, [10]);
        assert.equal(frames[1].behavior.attackDetected, true);
        assert.deepEqual(frames[1].behavior.attackedVictimTrackIds, []);
        assert.equal(frames[2].behavior.attackDetected, true);
        assert.equal(frames[1].predictions["instance-segmentation"][0].behaviorRole, "victim");
        assert.equal(frames[1].predictions["instance-segmentation"][1].behaviorRole, "attacker");
        assert.equal(frames[1].predictions["instance-segmentation"][0].attackDetected, false);
        assert.deepEqual(frames[1].predictions["pose-estimation"], []);
    });

    it("treats touching polygon edges as overlap", () => {
        const frames = analyzeKnifeAttackFrames([
            {
                predictions: {
                    "instance-segmentation": [
                        person(1, square(0, 0, 10, 10)),
                        person(2, square(12, 0, 22, 10)),
                        knife(square(8, 4, 12, 6)),
                    ],
                    "pose-estimation": [
                        {keypoints: [...Array(9).fill(null), [9, 5, 1], [9, 5, 1]]},
                        {keypoints: [...Array(9).fill(null), [20, 5, 1], [20, 5, 1]]},
                    ],
                },
            },
        ]);

        assert.equal(frames[0].behavior.attackDetected, true);
        assert.equal(frames[0].behavior.attackerTrackId, 1);
        assert.deepEqual(frames[0].behavior.attackedVictimTrackIds, [2]);
    });

    it("uses combined object-detection boxes instead of instance-segmentation knife masks", () => {
        const frames = analyzeKnifeAttackFrames([
            {
                frame_index: 0,
                predictions: {
                    "instance-segmentation": [
                        person(1, square(0, 0, 10, 10)),
                        person(2, square(30, 0, 40, 10)),
                        knife(square(32, 4, 34, 6)),
                    ],
                    "object-detection": [{
                        class_name: "knife",
                        confidence: 0.9,
                        bbox: {x_min: 12, y_min: 4, x_max: 14, y_max: 6},
                    }],
                },
            },
            {
                frame_index: 1,
                predictions: {
                    "instance-segmentation": [
                        person(1, square(0, 0, 10, 10)),
                        person(2, square(30, 0, 40, 10)),
                        knife(square(12, 4, 14, 6)),
                    ],
                    "object-detection": [{
                        class_name: "knife",
                        confidence: 0.9,
                        bbox: {x_min: 30, y_min: 4, x_max: 32, y_max: 6},
                    }],
                },
            },
        ]);

        assert.equal(frames[0].behavior.attackerTrackId, null);
        assert.equal(frames[0].behavior.attackDetected, false);
        assert.equal(frames[1].behavior.attackerTrackId, 2);
        assert.equal(frames[1].behavior.attackDetected, true);
        assert.deepEqual(frames[1].behavior.victimTrackIds, [1]);
        assert.deepEqual(frames[1].predictions["instance-segmentation"][2].polygon, square(30, 4, 32, 6));
        assert.deepEqual(frames[1].predictions["object-detection"], [{
            class_name: "knife",
            confidence: 0.9,
            bbox: {x_min: 30, y_min: 4, x_max: 32, y_max: 6},
        }]);
    });

    it("selects roles from knife overlap and leaves unrelated people unlabeled in image analysis", () => {
        const frame = {
            predictions: {
                "instance-segmentation": [
                    person(1, square(0, 0, 20, 40)),
                    person(2, square(15, 0, 35, 40)),
                    person(3, square(100, 0, 120, 40)),
                ],
                "pose-estimation": [
                    {track_id: 101, keypoints: [...Array(9).fill(null), [2, 35, 1], [2, 35, 1]]},
                    {track_id: 102, keypoints: [...Array(9).fill(null), [34, 20, 1], [34, 20, 1]]},
                ],
                "object-detection": [{
                    class_name: "knife",
                    bbox: {x_min: 16, y_min: 10, x_max: 18, y_max: 12},
                }],
            },
        };

        const [analyzed] = analyzeKnifeAttackFrames([frame], {
            requireKnifeOverlapForAttacker: true,
        });
        const people = analyzed.predictions["instance-segmentation"].filter((item) => item.class_name === "person");

        assert.equal(people[0].behaviorRole, "victim");
        assert.equal(people[1].behaviorRole, "attacker");
        assert.equal(people[2].behaviorRole, null);
        assert.deepEqual(analyzed.behavior.victimTrackIds, [1]);
        assert.deepEqual(analyzed.behavior.attackedVictimTrackIds, [1]);
    });

    it("does not report an attack or assign roles when the knife is separate from people", () => {
        const [frame] = analyzeKnifeAttackFrames([{
            predictions: {
                "instance-segmentation": [
                    person(1, square(0, 0, 10, 10)),
                    person(2, square(30, 30, 40, 40)),
                ],
                "object-detection": [{
                    class_name: "knife",
                    bbox: {x_min: 60, y_min: 60, x_max: 64, y_max: 64},
                }],
            },
        }], {requireKnifeOverlapForAttacker: true});

        assert.equal(frame.predictions["instance-segmentation"][0].behaviorRole, null);
        assert.equal(frame.behavior.attackerTrackId, null);
        assert.deepEqual(frame.behavior.victimTrackIds, []);
        assert.equal(frame.behavior.attackDetected, false);
    });

    it("shares overlap-grounded role tracking across video frames", () => {
        const frames = analyzeKnifeAttackFrames([
            {
                frame_index: 0,
                predictions: {
                    "instance-segmentation": [
                        person(10, square(0, 0, 20, 40)),
                        person(20, square(40, 0, 60, 40)),
                        person(30, square(100, 0, 120, 40)),
                    ],
                    "object-detection": [{
                        class_name: "knife",
                        bbox: {x_min: 18, y_min: 10, x_max: 20, y_max: 12},
                    }],
                },
            },
            {
                frame_index: 1,
                predictions: {
                    "instance-segmentation": [
                        person(10, square(0, 0, 20, 40)),
                        person(20, square(40, 0, 60, 40)),
                        person(30, square(100, 0, 120, 40)),
                    ],
                    "object-detection": [{
                        class_name: "knife",
                        bbox: {x_min: 42, y_min: 10, x_max: 44, y_max: 12},
                    }],
                },
            },
        ], {requireKnifeOverlapForAttacker: true});

        assert.deepEqual(
            frames.map((frame) => frame.behavior.attackerTrackId),
            [10, 10],
        );
        assert.equal(frames[1].predictions["instance-segmentation"][0].behaviorRole, "attacker");
        assert.equal(frames[1].predictions["instance-segmentation"][1].behaviorRole, "victim");
        assert.equal(frames[1].predictions["instance-segmentation"][2].behaviorRole, null);
        assert.deepEqual(frames[1].behavior.victimTrackIds, [20]);
        assert.deepEqual(frames[1].behavior.attackedVictimTrackIds, [20]);
    });

    it("retains the alert through missed detections and labels the nearest non-attacker", () => {
        const frames = analyzeKnifeAttackFrames([
            {
                frame_index: 324,
                predictions: {
                    "instance-segmentation": [
                        person(2, square(1089, 507, 1251, 966)),
                        person(6, square(828, 549, 993, 1020)),
                    ],
                    "object-detection": [{
                        class_name: "knife",
                        track_id: null,
                        bbox: {x_min: 857, y_min: 220, x_max: 1596, y_max: 746},
                    }],
                    "pose-estimation": [
                        {keypoints: [...Array(9).fill(null), [1175, 683, 0.99], [1118, 670, 0.95]]},
                        {keypoints: [...Array(9).fill(null), [881, 708, 0.52], [945, 693, 0.99]]},
                    ],
                },
            },
            ...[325, 326, 327].map((frameIndex) => ({
                frame_index: frameIndex,
                predictions: {
                    "instance-segmentation": [
                        person(2, square(1089, 507, 1251, 966)),
                        person(6, square(831, 549, 1020, 1017)),
                    ],
                    "object-detection": [],
                    "pose-estimation": [],
                },
            })),
            {
                frame_index: 328,
                predictions: {
                    "instance-segmentation": [
                        person(2, square(1089, 507, 1251, 966)),
                        person(6, square(831, 549, 1020, 1017)),
                    ],
                    "object-detection": [{
                        class_name: "knife",
                        track_id: null,
                        bbox: {x_min: 992, y_min: 612, x_max: 1069, y_max: 688},
                    }],
                    "pose-estimation": [
                        {keypoints: [...Array(9).fill(null), [1175, 683, 0.99], [1118, 671, 0.95]]},
                        {keypoints: [...Array(9).fill(null), [962, 681, 0.62], [984, 688, 0.99]]},
                    ],
                },
            },
        ], {requireKnifeOverlapForAttacker: true});

        assert.equal(frames[0].behavior.attackerTrackId, null);
        assert.deepEqual(frames[0].behavior.victimTrackIds, []);
        assert.equal(frames[0].behavior.attackDetected, true);
        assert.equal(frames[0].predictions["instance-segmentation"][0].behaviorRole, null);
        assert.equal(frames[0].predictions["instance-segmentation"][1].behaviorRole, null);
        assert.equal(frames[0].predictions["instance-segmentation"][0].attackDetected, false);
        assert.equal(frames[0].predictions["instance-segmentation"][1].attackDetected, false);
        assert.deepEqual(frames.slice(1, 4).map(({behavior}) => behavior.attackDetected), [true, true, true]);
        assert.equal(frames[4].behavior.attackerTrackId, 6);
        assert.deepEqual(frames[4].behavior.victimTrackIds, [2]);
        assert.equal(frames[4].behavior.attackDetected, true);
        assert.equal(frames[4].predictions["instance-segmentation"][1].behaviorRole, "attacker");
        assert.equal(frames[4].predictions["instance-segmentation"][0].behaviorRole, "victim");
        assert.equal(frames[4].predictions["instance-segmentation"][0].attackDetected, false);
        assert.deepEqual(frames[4].behavior.attackedVictimTrackIds, []);
    });

    it("persists roles through a short gap, then resets and identifies a new event", () => {
        const makeFrame = (frameIndex, firstTrackId, secondTrackId, knifeBbox) => ({
            frame_index: frameIndex,
            predictions: {
                "instance-segmentation": [
                    person(firstTrackId, square(0, 0, 10, 10)),
                    person(secondTrackId, square(30, 0, 40, 10)),
                ],
                "object-detection": knifeBbox ? [{class_name: "knife", bbox: knifeBbox}] : [],
            },
        });
        const frames = analyzeKnifeAttackFrames([
            makeFrame(0, 1, 2, {x_min: 8, y_min: 4, x_max: 12, y_max: 6}),
            ...Array.from({length: MAX_MISSED_KNIFE_FRAMES + 1}, (_, index) => (
                makeFrame(index + 1, 1, 2, null)
            )),
            makeFrame(
                MAX_MISSED_KNIFE_FRAMES + 2,
                3,
                4,
                {x_min: 8, y_min: 4, x_max: 12, y_max: 6},
            ),
        ]);

        assert.equal(frames[0].behavior.attackerTrackId, 1);
        assert.deepEqual(frames[0].behavior.victimTrackIds, [2]);
        assert.equal(frames[MAX_MISSED_KNIFE_FRAMES].behavior.attackDetected, true);
        assert.equal(frames[MAX_MISSED_KNIFE_FRAMES].behavior.attackerTrackId, 1);
        assert.deepEqual(frames[MAX_MISSED_KNIFE_FRAMES].behavior.victimTrackIds, [2]);
        assert.equal(frames[MAX_MISSED_KNIFE_FRAMES + 1].behavior.attackDetected, false);
        assert.equal(frames[MAX_MISSED_KNIFE_FRAMES + 1].behavior.attackerTrackId, null);
        assert.deepEqual(frames[MAX_MISSED_KNIFE_FRAMES + 1].behavior.victimTrackIds, []);
        assert.equal(frames[MAX_MISSED_KNIFE_FRAMES + 2].behavior.attackerTrackId, 3);
        assert.deepEqual(frames[MAX_MISSED_KNIFE_FRAMES + 2].behavior.victimTrackIds, [4]);
    });

    it("reassigns the potential victim when another non-attacker becomes nearest", () => {
        const frames = analyzeKnifeAttackFrames([
            {
                predictions: {
                    "instance-segmentation": [
                        person(1, square(0, 0, 10, 10)),
                        person(2, square(20, 0, 30, 10)),
                        person(3, square(40, 0, 50, 10)),
                    ],
                    "object-detection": [{
                        class_name: "knife",
                        bbox: {x_min: 8, y_min: 4, x_max: 12, y_max: 6},
                    }],
                },
            },
            {
                predictions: {
                    "instance-segmentation": [
                        person(1, square(0, 0, 10, 10)),
                        person(2, square(40, 0, 50, 10)),
                        person(3, square(20, 0, 30, 10)),
                    ],
                    "object-detection": [{
                        class_name: "knife",
                        bbox: {x_min: 8, y_min: 4, x_max: 12, y_max: 6},
                    }],
                },
            },
        ], {requireKnifeOverlapForAttacker: true});

        assert.deepEqual(
            frames.map(({behavior}) => behavior.attackerTrackId),
            [1, 1],
        );
        assert.deepEqual(
            frames.map(({behavior}) => behavior.victimTrackIds),
            [[2], [3]],
        );
        assert.equal(frames[1].predictions["instance-segmentation"][1].behaviorRole, null);
        assert.equal(frames[1].predictions["instance-segmentation"][2].behaviorRole, "victim");
    });

    it("keeps standalone image and webcam knife detections compatible", () => {
        const [frame] = analyzeKnifeAttackFrames([{
            predictions: {
                knife: [{
                    class_name: "knife",
                    bbox: {x_min: 12, y_min: 4, x_max: 14, y_max: 6},
                }],
            },
        }]);

        assert.deepEqual(frame.predictions["instance-segmentation"], [{
            class_name: "knife",
            bbox: {x_min: 12, y_min: 4, x_max: 14, y_max: 6},
            polygon: square(12, 4, 14, 6),
            heldByTrackId: null,
        }]);
    });

    it("returns an empty list for missing or invalid frame collections", () => {
        assert.deepEqual(analyzeKnifeAttackFrames(null), []);
        assert.deepEqual(analyzeKnifeAttackFrames([null]), [{
            predictions: { "instance-segmentation": [] },
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
