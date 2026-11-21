import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addObjectCountsToFrames } from "./addObjectCountsToFrames.js";
import { countObjectsBySplitter } from "./countObjectsBySplitter.js";
import { countTrackedObjectsBySplitter } from "./countTrackedObjectsBySplitter.js";
import { updateTrackedObjectCounts } from "./updateTrackedObjectCounts.js";

const SOURCE_SIZE = { width: 100, height: 100 };
const VERTICAL_SPLITTER = {
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
};
const makeDetection = (trackId, centerX, className = "car") => ({
    class_name: className,
    track_id: trackId,
    bbox: {
        x_min: centerX - 5,
        y_min: 45,
        x_max: centerX + 5,
        y_max: 55,
    },
});

describe("tracked object counter", () => {
    it("uses each ID's first detection as baseline, then transfers it on each crossing", () => {
        let trackedObjects = new Map();
        let result = updateTrackedObjectCounts(
            trackedObjects,
            [makeDetection(1, 25)],
            VERTICAL_SPLITTER,
            SOURCE_SIZE,
            ["car"],
        );
        trackedObjects = result.trackedObjects;
        assert.deepEqual(result.counts, { car: { first: 0, second: 0 } });

        result = updateTrackedObjectCounts(
            trackedObjects,
            [makeDetection(1, 25)],
            VERTICAL_SPLITTER,
            SOURCE_SIZE,
            ["car"],
        );
        trackedObjects = result.trackedObjects;
        assert.deepEqual(result.counts, { car: { first: 0, second: 0 } });

        result = updateTrackedObjectCounts(
            trackedObjects,
            [makeDetection(1, 75)],
            VERTICAL_SPLITTER,
            SOURCE_SIZE,
            ["car"],
        );
        trackedObjects = result.trackedObjects;
        assert.deepEqual(result.counts, { car: { first: 0, second: 1 } });

        result = updateTrackedObjectCounts(
            trackedObjects,
            [],
            VERTICAL_SPLITTER,
            SOURCE_SIZE,
            ["car"],
        );
        assert.deepEqual(result.counts, { car: { first: 0, second: 1 } });

        result = updateTrackedObjectCounts(
            result.trackedObjects,
            [makeDetection(1, 25)],
            VERTICAL_SPLITTER,
            SOURCE_SIZE,
            ["car"],
        );
        assert.deepEqual(result.counts, { car: { first: 1, second: 0 } });
    });

    it("ignores untracked or unselected detections and deduplicates IDs", () => {
        const { trackedObjects, counts } = updateTrackedObjectCounts(
            new Map(),
            [
                makeDetection(1, 25),
                makeDetection(1, 25),
                makeDetection(null, 25),
                makeDetection(2, 75, "person"),
            ],
            VERTICAL_SPLITTER,
            SOURCE_SIZE,
            ["car"],
        );
        assert.equal(trackedObjects.size, 1);
        assert.deepEqual(counts, { car: { first: 0, second: 0 } });
    });

    it("resets counts without treating a stationary object as a new crossing", () => {
        const initialized = updateTrackedObjectCounts(
            new Map(),
            [makeDetection(1, 25)],
            VERTICAL_SPLITTER,
            SOURCE_SIZE,
            ["car"],
        );
        const resetObjects = new Map([...initialized.trackedObjects].map(([key, object]) => [
            key,
            { ...object, countedSide: null },
        ]));
        const { trackedObjects, counts } = updateTrackedObjectCounts(
            resetObjects,
            [makeDetection(1, 25)],
            VERTICAL_SPLITTER,
            SOURCE_SIZE,
            ["car"],
        );
        assert.equal(trackedObjects.size, 1);
        assert.deepEqual(counts, { car: { first: 0, second: 0 } });

        const crossed = updateTrackedObjectCounts(
            trackedObjects,
            [makeDetection(1, 75)],
            VERTICAL_SPLITTER,
            SOURCE_SIZE,
            ["car"],
        );
        assert.deepEqual(crossed.counts, { car: { first: 0, second: 1 } });
    });

    it("recalculates remembered objects when the splitter moves", () => {
        const initial = updateTrackedObjectCounts(
            new Map(),
            [makeDetection(1, 25), makeDetection(2, 75)],
            VERTICAL_SPLITTER,
            SOURCE_SIZE,
            ["car"],
        );
        const crossed = updateTrackedObjectCounts(
            initial.trackedObjects,
            [makeDetection(1, 75)],
            VERTICAL_SPLITTER,
            SOURCE_SIZE,
            ["car"],
        );
        const horizontalSplitter = {
            start: { x: 0, y: 0.4 },
            end: { x: 1, y: 0.4 },
        };
        assert.deepEqual(
            countTrackedObjectsBySplitter(crossed.trackedObjects, horizontalSplitter, SOURCE_SIZE, ["car"]),
            { car: { first: 1, second: 0 } },
        );
        const afterMove = updateTrackedObjectCounts(
            crossed.trackedObjects,
            [makeDetection(1, 75)],
            horizontalSplitter,
            SOURCE_SIZE,
            ["car"],
        );
        assert.deepEqual(afterMove.counts, { car: { first: 1, second: 0 } });
    });

    it("enriches video frames with cumulative side membership when tracking is enabled", () => {
        const frames = addObjectCountsToFrames([
            { detections: [makeDetection(1, 25)] },
            { detections: [makeDetection(1, 75)] },
            { detections: [] },
        ], VERTICAL_SPLITTER, SOURCE_SIZE, ["car"], true);

        assert.deepEqual(frames.map(({ objectCounts }) => objectCounts), [
            { car: { first: 0, second: 0 } },
            { car: { first: 0, second: 1 } },
            { car: { first: 0, second: 1 } },
        ]);
    });

    it("counts multiple classes independently in each splitter area", () => {
        const counts = countObjectsBySplitter(
            [makeDetection(1, 25, "car"), makeDetection(2, 75, "car"), makeDetection(3, 25, "person")],
            VERTICAL_SPLITTER,
            SOURCE_SIZE,
            ["car", "person"],
        );

        assert.deepEqual(counts, {
            car: { first: 1, second: 1 },
            person: { first: 1, second: 0 },
        });
    });

    it("tracks multiple classes independently even when IDs match", () => {
        const initialized = updateTrackedObjectCounts(
            new Map(),
            [makeDetection(1, 25, "car"), makeDetection(1, 75, "person")],
            VERTICAL_SPLITTER,
            SOURCE_SIZE,
            ["car", "person"],
        );
        const crossed = updateTrackedObjectCounts(
            initialized.trackedObjects,
            [makeDetection(1, 75, "car"), makeDetection(1, 25, "person")],
            VERTICAL_SPLITTER,
            SOURCE_SIZE,
            ["car", "person"],
        );

        assert.deepEqual(crossed.counts, {
            car: { first: 0, second: 1 },
            person: { first: 1, second: 0 },
        });
    });
});
