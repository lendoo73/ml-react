import assert from "node:assert/strict";
import {describe, it} from "node:test";
import {createIncidentScreenshot, drawIncidentAnnotations} from "./createIncidentScreenshot.js";

const createContext = () => {
    const labels = [];
    const roundedRects = [];
    return {
        context: {
            canvas: {width: 640},
            save() {},
            restore() {},
            getTransform: () => ({a: 1}),
            measureText: (text) => ({width: String(text).length * 8}),
            beginPath() {},
            closePath() {},
            moveTo() {},
            lineTo() {},
            fill() {},
            stroke() {},
            fillRect() {},
            arc() {},
            translate() {},
            rotate() {},
            roundRect: (...args) => roundedRects.push(args),
            fillText: (text) => labels.push(text),
        },
        labels,
        roundedRects,
    };
};

const labels = {
    attacker: "Attacker",
    victim: "Potential victim",
    attackedVictim: "Potential victim",
};

const options = {
    segmentationConfidence: 0,
    poseConfidence: 0,
    selectedSegmentationClasses: ["person"],
    showMasks: false,
    showSkeleton: false,
    showKeypoints: false,
    showLabels: true,
    showIds: true,
    showPoseIds: false,
    useDetectionLabelStyle: true,
};

describe("knife attack annotation labels", () => {
    it("uses shared detection-style labels for analyzed roles and supplied track IDs", () => {
        const {context, labels: drawnLabels, roundedRects} = createContext();
        drawIncidentAnnotations(context, {
            predictions: {
                segmentation: [{
                    class_name: "person",
                    confidence: 0.9,
                    track_id: 11,
                    polygon: [[20, 20], [80, 20], [80, 100]],
                    behaviorRole: "attacker",
                }],
                "pose-estimation": [{
                    confidence: 0.9,
                    track_id: 3,
                    keypoints: [[24, 24, 0.9]],
                }],
            },
        }, labels, 640, options);

        assert.ok(drawnLabels.includes("Attacker"));
        assert.ok(drawnLabels.includes("ID 11"));
        assert.equal(drawnLabels.includes("ID 3"), false);
        assert.ok(roundedRects.length >= 2);
    });

    it("does not infer attacker or victim roles from a person or pose track ID", () => {
        const {context, labels: drawnLabels} = createContext();
        drawIncidentAnnotations(context, {
            predictions: {
                segmentation: [{
                    class_name: "person",
                    track_id: 11,
                    polygon: [[20, 20], [80, 20], [80, 100]],
                }],
                "pose-estimation": [{
                    confidence: 0.9,
                    track_id: 3,
                    keypoints: [[24, 24, 0.9]],
                }],
            },
        }, labels, 640, options);

        assert.equal(drawnLabels.includes("ID 3"), false);
        assert.equal(drawnLabels.includes("Attacker"), false);
        assert.equal(drawnLabels.includes("Potential victim"), false);
    });

    it("keeps pose ID rendering by default when suppression is omitted", () => {
        const {context, labels: drawnLabels, roundedRects} = createContext();
        drawIncidentAnnotations(context, {
            predictions: {
                "pose-estimation": [{
                    confidence: 0.9,
                    track_id: 3,
                    keypoints: [[24, 24, 0.9]],
                }],
            },
        }, labels, 640, {
            poseConfidence: 0,
            showLabels: true,
            showIds: true,
            showConfidence: false,
            showSkeleton: false,
            showKeypoints: false,
        });

        assert.ok(drawnLabels.includes("ID 3"));
        assert.equal(roundedRects.length, 0);
    });

    it("uses shared role labels on video and hides unrelated pose IDs", () => {
        const {context, labels: drawnLabels} = createContext();
        drawIncidentAnnotations(context, {
            predictions: {
                segmentation: [
                    {
                        class_name: "person",
                        track_id: 11,
                        polygon: [[20, 20], [80, 20], [80, 100]],
                        behaviorRole: "attacker",
                    },
                    {
                        class_name: "person",
                        track_id: 22,
                        polygon: [[100, 20], [160, 20], [160, 100]],
                        behaviorRole: "victim",
                    },
                ],
                "pose-estimation": [{
                    track_id: 301,
                    keypoints: [[24, 24, 0.9]],
                }],
            },
        }, labels, 640, {
            ...options,
            showPoseIds: false,
            useDetectionLabelStyle: true,
        });

        assert.ok(drawnLabels.includes("Attacker"));
        assert.ok(drawnLabels.includes("Potential victim"));
        assert.ok(drawnLabels.includes("ID 11"));
        assert.ok(drawnLabels.includes("ID 22"));
        assert.equal(drawnLabels.includes("ID 301"), false);
    });
});

describe("incident screenshot capture", () => {
    it("captures the current live webcam frame without pausing or seeking", async () => {
        const previousMediaElement = Object.getOwnPropertyDescriptor(globalThis, "HTMLMediaElement");
        const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
        let pauseCount = 0;
        let playCount = 0;
        let drawnVideo = null;
        const context = {
            drawImage: (...args) => {
                [drawnVideo] = args;
            },
        };
        const canvas = {
            width: 0,
            height: 0,
            getContext: () => context,
            toBlob: (callback) => callback(new Blob(["frame"], {type: "image/jpeg"})),
        };
        const video = {
            readyState: 2,
            currentTime: 4.5,
            duration: Infinity,
            paused: false,
            videoWidth: 320,
            videoHeight: 240,
            pause: () => {
                pauseCount += 1;
            },
            play: () => {
                playCount += 1;
                return Promise.resolve();
            },
        };

        Object.defineProperty(globalThis, "HTMLMediaElement", {
            configurable: true,
            value: {HAVE_METADATA: 1, HAVE_CURRENT_DATA: 2},
        });
        Object.defineProperty(globalThis, "document", {
            configurable: true,
            value: {createElement: () => canvas},
        });

        try {
            const screenshot = await createIncidentScreenshot(video, {predictions: {}}, null, labels);

            assert.equal(screenshot.type, "image/jpeg");
            assert.equal(drawnVideo, video);
            assert.equal(canvas.width, 320);
            assert.equal(canvas.height, 240);
            assert.equal(video.currentTime, 4.5);
            assert.equal(pauseCount, 0);
            assert.equal(playCount, 0);
        } finally {
            if (previousMediaElement) {
                Object.defineProperty(globalThis, "HTMLMediaElement", previousMediaElement);
            } else {
                delete globalThis.HTMLMediaElement;
            }
            if (previousDocument) {
                Object.defineProperty(globalThis, "document", previousDocument);
            } else {
                delete globalThis.document;
            }
        }
    });
});
